/**
 * ArtaKita AI Engine v2
 * - Smart Parser: tokenizer bebas, urutan apapun
 * - Behavioral Learning: belajar dari habit user
 * - Autocomplete: suggest dari user_patterns
 * - Confidence scoring: makin sering = makin yakin
 */

// ── SMART AMOUNT PARSER ──────────────────────────────────────────────────────
export function parseAmount(token) {
  if (!token) return null;
  const t = token.toLowerCase().trim();
  
  // Bersihkan format: 50.000 / 50,000
  const cleaned = t.replace(/\./g, "").replace(/,/g, "");
  
  const multipliers = {
    jt: 1_000_000, juta: 1_000_000, m: 1_000_000,
    rb: 1_000, ribu: 1_000, k: 1_000, rbu: 1_000,
  };
  
  for (const [suffix, mult] of Object.entries(multipliers)) {
    const re = new RegExp(`^(\\d+(?:\\.\\d+)?)${suffix}$`);
    const match = cleaned.match(re);
    if (match) return Math.round(parseFloat(match[1]) * mult);
  }
  
  // Angka murni
  const num = parseFloat(cleaned.replace(/[^\d.]/g, ""));
  if (!isNaN(num) && num > 0) {
    // < 500 tanpa suffix → anggap ribuan (default)
    if (num < 500 && !t.match(/[a-z]/)) return num * 1_000;
    return Math.round(num);
  }
  
  return null;
}

// ── SMART DATE PARSER ────────────────────────────────────────────────────────
export function parseRelativeDate(text) {
  const t = text.toLowerCase();
  const today = new Date();
  
  const days = { senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6, minggu: 0 };
  
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
  
  // Nama hari → cari hari terakhir yang cocok
  for (const [dayName, dayNum] of Object.entries(days)) {
    if (t.includes(dayName)) {
      const d = new Date(today);
      const diff = (today.getDay() - dayNum + 7) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return d;
    }
  }
  
  return null; // Tidak ada date info
}

// ── SMART TOKENIZER ──────────────────────────────────────────────────────────
/**
 * Parse free-form input menjadi { amount, note, date }
 * Contoh: "makan siang 25k kemarin" → { amount:25000, note:"makan siang", date:yesterday }
 *         "rokok 10" → { amount:10000, note:"rokok", date:null }
 *         "50k gofood" → { amount:50000, note:"gofood", date:null }
 */
export function tokenizeInput(raw) {
  if (!raw?.trim()) return { amount: null, note: "", date: null };
  
  const tokens = raw.trim().split(/\s+/);
  let amount = null;
  let date = null;
  const noteTokens = [];
  
  // Date keywords
  const dateKeywords = ["kemarin", "yesterday", "tadi", "senin", "selasa", "rabu",
    "kamis", "jumat", "sabtu", "minggu", "lalu", "pagi", "malam"];
  
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    const tokenLow = token.toLowerCase();
    
    // Skip "pos" keyword (optional category override)
    if (tokenLow === "pos" && i + 1 < tokens.length) {
      i += 2; // skip "pos Kategori"
      continue;
    }
    
    // Try parse as amount
    if (amount === null) {
      const parsed = parseAmount(token);
      if (parsed) { amount = parsed; i++; continue; }
    }
    
    // Check date keyword
    const isDateToken = dateKeywords.some(dk => tokenLow.includes(dk));
    if (isDateToken) {
      // Collect date phrase (mungkin 2 kata: "tadi malam", "minggu lalu")
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
/**
 * Ambil suggestions dari user_patterns berdasarkan partial input
 * Returns: [{ phrase, categoryName, categoryId, frequency }]
 */
export async function getSuggestions(supabase, userId, partial, limit = 3) {
  if (!partial || partial.length < 2) return [];
  
  const clean = partial.toLowerCase().trim();
  
  const { data, error } = await supabase
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
  
  return data.map(p => ({
    phrase:       p.phrase,
    categoryId:   p.category?.id,
    categoryName: p.category?.name,
    frequency:    p.frequency,
  }));
}

// ── CLASSIFY CATEGORY ────────────────────────────────────────────────────────
/**
 * Classify note → category menggunakan user_patterns
 * 
 * FILOSOFI: jika kata ada di user_patterns = user sudah pernah konfirmasi
 * → SELALU menang vs legacy classifier, tidak peduli frekuensi
 * 
 * Confidence:
 *   HIGH = exact match atau multi-word phrase match
 *   MED  = partial/word match
 *   LOW  = tidak ada match di user_patterns
 */
export function classifyFromPatterns(note, patterns, categories) {
  if (!note || !patterns?.length) return { categoryId: null, categoryName: null, confidence: "LOW" };
  
  const noteLow = note.toLowerCase().trim();
  const words   = noteLow.split(/\s+/).filter(w => w.length > 1);
  
  const scoreMap = {}; // { categoryId: { score, isExact } }
  
  for (const pattern of patterns) {
    const phrase = pattern.phrase?.toLowerCase().trim();
    if (!phrase || phrase.length < 2) continue;
    
    const freq    = Math.max(1, pattern.frequency || 1);
    const isMulti = phrase.includes(" ");
    
    // === TIER 1: Exact full match (score tertinggi) ===
    if (noteLow === phrase) {
      const score = 1000 * freq; // Tidak bisa dikalahkan
      if (!scoreMap[pattern.category_id] || scoreMap[pattern.category_id].score < score) {
        scoreMap[pattern.category_id] = { score, isExact: true, phrase };
      }
      continue;
    }
    
    // === TIER 2: Note contains phrase ===
    if (noteLow.includes(phrase)) {
      const score = (isMulti ? 500 : 200) * freq;
      if (!scoreMap[pattern.category_id] || scoreMap[pattern.category_id].score < score) {
        scoreMap[pattern.category_id] = { score, isExact: isMulti, phrase };
      }
      continue;
    }
    
    // === TIER 3: Word-level match ===
    for (const word of words) {
      if (word === phrase) {
        // Exact word match
        const score = 100 * freq;
        scoreMap[pattern.category_id] = {
          score: (scoreMap[pattern.category_id]?.score || 0) + score,
          isExact: false, phrase
        };
      } else if (phrase.startsWith(word) && word.length >= 3) {
        // Prefix match
        const score = 30 * freq;
        scoreMap[pattern.category_id] = {
          score: (scoreMap[pattern.category_id]?.score || 0) + score,
          isExact: false, phrase
        };
      } else if (phrase.includes(word) && word.length >= 3) {
        // Contains match
        const score = 10 * freq;
        scoreMap[pattern.category_id] = {
          score: (scoreMap[pattern.category_id]?.score || 0) + score,
          isExact: false, phrase
        };
      }
    }
  }
  
  if (!Object.keys(scoreMap).length) {
    return { categoryId: null, categoryName: null, confidence: "LOW" };
  }
  
  const best = Object.entries(scoreMap).sort((a, b) => b[1].score - a[1].score)[0];
  const [catId, { score, isExact }] = best;
  const cat = categories?.find(c => c.id === catId);
  
  // Confidence: ANY match dari user_patterns = setidaknya MED
  // User sudah pernah konfirmasi → lebih dipercaya dari legacy
  const confidence = score >= 200 ? "HIGH" : "MED";
  
  return {
    categoryId:   catId,
    categoryName: cat?.name || null,
    confidence,
    score,
    isExact,
  };
}

// ── LEARN FROM TRANSACTION ───────────────────────────────────────────────────
/**
 * Belajar dari transaksi yang disubmit
 * - Simpan/update user_patterns
 * - Pelajari single words DAN multi-word phrases
 */
export async function learnFromTransaction(supabase, userId, note, categoryId, boost = 1, amount = null) {
  if (!note || !categoryId || !userId) return;
  
  const stopWords = new Set([
    "beli","bayar","untuk","ke","di","dari","dan","atau","dengan","yang",
    "nya","ini","itu","di","ke","ku","mu","kita","kami","mereka","saya","aku"
  ]);
  
  const cleanNote = note.toLowerCase().trim();
  const words = cleanNote.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  // Phrases yang akan dipelajari: full phrase + individual words
  const toLearn = new Set([cleanNote]); // full phrase selalu dipelajari
  
  // Tambah individual words
  for (const word of words) toLearn.add(word);
  
  // Tambah 2-word combinations
  for (let i = 0; i < words.length - 1; i++) {
    toLearn.add(`${words[i]} ${words[i+1]}`);
  }
  
  // Upsert semua ke user_patterns
  const upserts = Array.from(toLearn).map(phrase => ({
    user_id:        userId,
    phrase,
    category_id:    categoryId,
    last_used:      new Date().toISOString(),
    typical_amount: amount && amount > 0 ? amount : null,
  }));
  
  for (const item of upserts) {
    const { data: existing } = await supabase
      .from("user_patterns")
      .select("id, frequency")
      .eq("user_id", userId)
      .eq("phrase", item.phrase)
      .eq("category_id", categoryId)
      .single();
    
    if (existing) {
      // Update frequency + typical_amount (rolling average)
      const newFreq = existing.frequency + boost;
      const updates = { frequency: newFreq, last_used: item.last_used };
      if (item.amount && item.amount > 0) {
        const prevAmt = existing.typical_amount || item.amount;
        // Weighted average: lebih berat ke yang lebih sering
        updates.typical_amount = Math.round((prevAmt * existing.frequency + item.amount * boost) / newFreq);
      }
      await supabase.from("user_patterns")
        .update(updates)
        .eq("id", existing.id);
    } else {
      // Cek apakah ada kategori lain yang sudah lebih dominan untuk phrase ini
      const { data: competing } = await supabase
        .from("user_patterns")
        .select("frequency")
        .eq("user_id", userId)
        .eq("phrase", item.phrase)
        .neq("category_id", categoryId)
        .order("frequency", { ascending: false })
        .limit(1)
        .single();
      
      // Hanya insert jika tidak ada kompetitor yang jauh lebih kuat
      const topCompetitor = competing?.frequency || 0;
      if (topCompetitor < 5 || boost >= topCompetitor) {
        await supabase.from("user_patterns")
          .insert([{ ...item, frequency: boost }]);
      }
    }
  }
}

// ── NEGATIVE FEEDBACK ────────────────────────────────────────────────────────
/**
 * User mengganti kategori setelah submit → downvote pattern lama
 */
export async function negativeLearn(supabase, userId, note, wrongCategoryId) {
  if (!note || !wrongCategoryId) return;
  const cleanNote = note.toLowerCase().trim();
  
  await supabase.from("user_patterns")
    .update({ frequency: supabase.rpc("greatest", [1]) }) // floor at 1
    .eq("user_id", userId)
    .eq("phrase", cleanNote)
    .eq("category_id", wrongCategoryId);
  
  // Simpler: just decrement
  const { data } = await supabase.from("user_patterns")
    .select("id, frequency")
    .eq("user_id", userId)
    .ilike("phrase", cleanNote)
    .eq("category_id", wrongCategoryId)
    .single();
  
  if (data && data.frequency > 1) {
    await supabase.from("user_patterns")
      .update({ frequency: data.frequency - 1 })
      .eq("id", data.id);
  }
}
