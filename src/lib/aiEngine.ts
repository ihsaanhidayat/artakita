import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassifyResult, Confidence, Suggestion, TokenizeResult, UserCategory, UserPattern } from "@/types";

// ── SMART AMOUNT PARSER ──────────────────────────────────────────────────────

export function parseAmount(token: string): number | null {
  if (!token) return null;
  const t = token.toLowerCase().trim();

  const cleaned = t.replace(/\./g, "").replace(/,/g, "");

  const multipliers: Record<string, number> = {
    jt: 1_000_000, juta: 1_000_000, m: 1_000_000,
    rb: 1_000, ribu: 1_000, k: 1_000, rbu: 1_000,
  };

  for (const [suffix, mult] of Object.entries(multipliers)) {
    const re = new RegExp(`^(\\d+(?:\\.\\d+)?)${suffix}$`);
    const match = cleaned.match(re);
    if (match) return Math.round(parseFloat(match[1]) * mult);
  }

  const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
  if (!isNaN(num) && num > 0) {
    if (num < 500 && !t.match(/[a-z]/)) return num * 1_000;
    return Math.round(num);
  }

  return null;
}

// ── SMART DATE PARSER ────────────────────────────────────────────────────────

export function parseRelativeDate(text: string): Date | null {
  const t = text.toLowerCase();
  const today = new Date();

  const days: Record<string, number> = {
    senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0
  };

  if (t.includes("kemarin") || t.includes("yesterday")) {
    const d = new Date(today); d.setDate(d.getDate() - 1); return d;
  }
  if (t.includes("tadi pagi") || t.includes("pagi ini")) {
    const d = new Date(today); d.setHours(8, 0, 0, 0); return d;
  }
  if (t.includes("tadi malam") || t.includes("malam tadi")) {
    const d = new Date(today); d.setDate(d.getDate() - (today.getHours() < 6 ? 1 : 0));
    d.setHours(20, 0, 0, 0); return d;
  }
  if (t.includes("minggu lalu") || t.includes("pekan lalu")) {
    const d = new Date(today); d.setDate(d.getDate() - 7); return d;
  }

  for (const [dayName, dayNum] of Object.entries(days)) {
    if (t.includes(dayName)) {
      const d = new Date(today);
      const diff = (today.getDay() - dayNum + 7) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return d;
    }
  }

  return null;
}

// ── SMART TOKENIZER ──────────────────────────────────────────────────────────

export function tokenizeInput(raw: string): TokenizeResult {
  if (!raw?.trim()) return { amount: null, note: "", date: null };

  const tokens = raw.trim().split(/\s+/);
  let amount: number | null = null;
  let date: Date | null = null;
  const noteTokens: string[] = [];

  const dateKeywords = ["kemarin", "yesterday", "tadi", "senin", "selasa", "rabu",
    "kamis", "jumat", "sabtu", "minggu", "lalu", "pagi", "malam"];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    const tokenLow = token.toLowerCase();

    if (tokenLow === "pos" && i + 1 < tokens.length) {
      i += 2;
      continue;
    }

    if (amount === null) {
      const parsed = parseAmount(token);
      if (parsed) { amount = parsed; i++; continue; }
    }

    const isDateToken = dateKeywords.some(dk => tokenLow.includes(dk));
    if (isDateToken) {
      const datePart = tokens.slice(i).join(" ");
      const parsed = parseRelativeDate(datePart);
      if (parsed) { date = parsed; break; }
    }

    noteTokens.push(token);
    i++;
  }

  return {
    amount,
    note: noteTokens.join(" ").trim(),
    date,
  };
}

// ── AUTOCOMPLETE ENGINE ──────────────────────────────────────────────────────

export async function getSuggestions(
  supabaseClient: SupabaseClient,
  userId: string,
  partial: string,
  limit = 3
): Promise<Suggestion[]> {
  if (!partial || partial.length < 2) return [];

  const clean = partial.toLowerCase().trim();

  const { data, error } = await supabaseClient
    .from("user_patterns")
    .select(`
      phrase, frequency, last_used,
      category:category_id ( id, name )
    `)
    .eq("user_id", userId)
    .ilike("phrase", `${clean}%`)
    .order("frequency", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as Array<{
    phrase: string;
    frequency: number;
    last_used: string;
    category: { id: string; name: string } | null;
  }>).map(p => ({
    phrase:       p.phrase,
    categoryId:   p.category?.id,
    categoryName: p.category?.name,
    frequency:    p.frequency,
  }));
}

// ── CLASSIFY CATEGORY ────────────────────────────────────────────────────────

interface ScoreEntry {
  score: number;
  isExact: boolean;
  phrase: string;
}

export function classifyFromPatterns(
  note: string,
  patterns: UserPattern[],
  categories: UserCategory[]
): ClassifyResult {
  if (!note || !patterns?.length) return { categoryId: null, categoryName: null, confidence: "LOW" };

  const noteLow = note.toLowerCase().trim();
  const words   = noteLow.split(/\s+/).filter(w => w.length > 1);

  const scoreMap: Record<string, ScoreEntry> = {};

  for (const pattern of patterns) {
    const phrase = pattern.phrase?.toLowerCase().trim();
    if (!phrase || phrase.length < 2) continue;

    const catId  = pattern.category_id;
    const freq   = Math.max(1, pattern.frequency || 1);
    const isMulti = phrase.includes(" ");

    if (noteLow === phrase) {
      const score = 1000 * freq;
      if (!scoreMap[catId] || scoreMap[catId].score < score) {
        scoreMap[catId] = { score, isExact: true, phrase };
      }
      continue;
    }

    if (noteLow.includes(phrase)) {
      const score = (isMulti ? 500 : 200) * freq;
      if (!scoreMap[catId] || scoreMap[catId].score < score) {
        scoreMap[catId] = { score, isExact: isMulti, phrase };
      }
      continue;
    }

    for (const word of words) {
      if (word === phrase) {
        const score = 100 * freq;
        scoreMap[catId] = {
          score: (scoreMap[catId]?.score || 0) + score,
          isExact: false, phrase
        };
      } else if (phrase.startsWith(word) && word.length >= 3) {
        const score = 30 * freq;
        scoreMap[catId] = {
          score: (scoreMap[catId]?.score || 0) + score,
          isExact: false, phrase
        };
      } else if (phrase.includes(word) && word.length >= 3) {
        const score = 10 * freq;
        scoreMap[catId] = {
          score: (scoreMap[catId]?.score || 0) + score,
          isExact: false, phrase
        };
      }
    }
  }

  if (!Object.keys(scoreMap).length) {
    return { categoryId: null, categoryName: null, confidence: "LOW" };
  }

  const sorted = Object.entries(scoreMap).sort((a, b) => b[1].score - a[1].score);
  const [catId, { score }] = sorted[0];
  const cat = categories?.find(c => c.id === catId);

  const confidence: Confidence = score >= 200 ? "HIGH" : "MED";

  return {
    categoryId:   catId,
    categoryName: cat?.name ?? null,
    confidence,
    score,
    isExact: scoreMap[catId].isExact,
  };
}

// ── LEARN FROM TRANSACTION ───────────────────────────────────────────────────

export async function learnFromTransaction(
  supabaseClient: SupabaseClient,
  userId: string,
  note: string,
  categoryId: string,
  boost = 1,
  amount: number | null = null
): Promise<void> {
  if (!note || !categoryId || !userId) return;

  const stopWords = new Set([
    "beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang",
    "nya","ini","itu","di","ke","ku","mu","kita","kami","mereka","saya","aku"
  ]);

  const cleanNote = note.toLowerCase().trim();
  const words = cleanNote.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

  const toLearn = new Set<string>([cleanNote]);
  for (const word of words) toLearn.add(word);
  for (let i = 0; i < words.length - 1; i++) {
    toLearn.add(`${words[i]} ${words[i+1]}`);
  }

  const upserts = Array.from(toLearn).map(phrase => ({
    user_id:        userId,
    phrase,
    category_id:    categoryId,
    last_used:      new Date().toISOString(),
    typical_amount: amount && amount > 0 ? amount : null,
  }));

  for (const item of upserts) {
    const { data: existing } = await supabaseClient
      .from("user_patterns")
      .select("id, frequency, typical_amount")
      .eq("user_id", userId)
      .eq("phrase", item.phrase)
      .eq("category_id", categoryId)
      .single();

    if (existing) {
      const newFreq = existing.frequency + boost;
      const updates: Record<string, unknown> = { frequency: newFreq, last_used: item.last_used };
      if (amount && amount > 0) {
        const prevAmt = (existing.typical_amount as number) || amount;
        updates.typical_amount = Math.round((prevAmt * existing.frequency + amount * boost) / newFreq);
      }
      await supabaseClient.from("user_patterns")
        .update(updates)
        .eq("id", existing.id);
    } else {
      const { data: competing } = await supabaseClient
        .from("user_patterns")
        .select("frequency")
        .eq("user_id", userId)
        .eq("phrase", item.phrase)
        .neq("category_id", categoryId)
        .order("frequency", { ascending: false })
        .limit(1)
        .single();

      const topCompetitor = (competing?.frequency as number) || 0;
      if (topCompetitor < 5 || boost >= topCompetitor) {
        await supabaseClient.from("user_patterns")
          .insert([{ ...item, frequency: boost }]);
      }
    }
  }
}

// ── NEGATIVE FEEDBACK ────────────────────────────────────────────────────────

export async function negativeLearn(
  supabaseClient: SupabaseClient,
  userId: string,
  note: string,
  wrongCategoryId: string
): Promise<void> {
  if (!note || !wrongCategoryId || !userId) return;
  const cleanNote = note.toLowerCase().trim();

  const { data } = await supabaseClient.from("user_patterns")
    .select("id, frequency")
    .eq("user_id", userId)
    .ilike("phrase", cleanNote)
    .eq("category_id", wrongCategoryId)
    .single();

  if (data && (data.frequency as number) > 1) {
    await supabaseClient.from("user_patterns")
      .update({ frequency: (data.frequency as number) - 1 })
      .eq("id", data.id);
  }
}
