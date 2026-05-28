import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";

const transactionSchema = z.object({
  note:     z.string().min(2, "Catatan minimal 2 karakter").max(100, "Catatan terlalu panjang"),
  amount:   z.number().positive("Nominal tidak boleh minus atau nol!"),
  category: z.string().min(1, "Kategori tidak valid"),
  type:     z.enum(["income", "expense"], {
    required_error: "Tipe transaksi harus 'income' atau 'expense'",
  }),
});

export const useFinData = (walletId) => {
  const [transactions, setTransactions] = useState([]);
  const [balance,      setBalance]      = useState(0);
  const [totalIncome,  setTotalIncome]  = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  // ── 1. Fetch + Realtime subscription ────────────────────────────────────
  useEffect(() => {
    if (!walletId) return;

    // Initial fetch
    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", walletId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal menarik data transaksi:", error.message);
      } else {
        setTransactions(data || []);
      }
    };

    fetchTransactions();

    // Realtime: auto-refresh saat ada INSERT, UPDATE, DELETE
    // Sangat ringan — pakai WebSocket, tidak ada polling
    const channel = supabase
      .channel(`transactions:wallet:${walletId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `wallet_id=eq.${walletId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTransactions((prev) => {
              // Hindari duplikat jika optimistic update sudah ada
              const exists = prev.some((t) => t.id === payload.new.id);
              if (exists) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setTransactions((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          } else if (payload.eventType === "DELETE") {
            setTransactions((prev) =>
              prev.filter((t) => t.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletId]);

  // ── 2. Kalkulasi saldo ───────────────────────────────────────────────────
  useEffect(() => {
    let calcIncome  = 0;
    let calcExpense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        calcIncome += Number(t.amount);
      } else if (t.type === "expense" || !t.type) {
        calcExpense += Number(t.amount);
      }
    });

    setTotalIncome(calcIncome);
    setTotalExpense(calcExpense);
    setBalance(calcIncome - calcExpense);
  }, [transactions]);

  // ── 3. Tambah transaksi ──────────────────────────────────────────────────
  const addTransaction = async (note, amount, category, trxType = "expense") => {
    try {
      const validatedData = transactionSchema.parse({
        note,
        amount:   Number(amount),
        category,
        type:     trxType,
      });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Sesi login kedaluwarsa. Silakan login kembali.");
      }

      const newTrx = {
        user_id:   session.user.id,
        wallet_id: walletId,
        note:      validatedData.note,
        amount:    validatedData.amount,
        category:  validatedData.category,
        type:      validatedData.type,
      };

      const { data, error } = await supabase
        .from("transactions")
        .insert([newTrx])
        .select();

      if (error) throw error;

      // Realtime akan handle update otomatis, tapi kita juga update lokal
      // agar UI langsung responsif (optimistic)
      if (data) {
        setTransactions((prev) => {
          const exists = prev.some((t) => t.id === data[0].id);
          return exists ? prev : [data[0], ...prev];
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message);
      }
      throw error;
    }
  };

  // ── 4. Hapus transaksi ───────────────────────────────────────────────────
  const deleteTransaction = async (id) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      // Realtime akan handle, tapi update lokal dulu agar instan
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      throw error;
    }
  };

  // ── 5. Update transaksi ──────────────────────────────────────────────────
  const updateTransaction = async (id, note, category, amount) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ note, category, amount: Number(amount) })
        .eq("id", id);

      if (error) throw error;
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, note, category, amount: Number(amount) } : t
        )
      );
    } catch (error) {
      throw error;
    }
  };

  return {
    balance,
    totalIncome,
    totalExpense,
    transactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  };
};
