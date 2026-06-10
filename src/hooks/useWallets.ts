import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Wallet, UseWalletsReturn } from "@/types";

export const useWallets = (): UseWalletsReturn => {
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    const fetchWallets = async (): Promise<void> => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) setWallets(data as Wallet[]);
    };

    void fetchWallets();
  }, []);

  const addWallet = async (name: string): Promise<Wallet | undefined> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak valid");

      const { data, error } = await supabase
        .from("wallets")
        .insert([{ user_id: session.user.id, name }])
        .select();

      if (error) throw error;
      if (data) {
        const wallet = data[0] as Wallet;
        setWallets(prev => [...prev, wallet]);
        return wallet;
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteWallet = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from("wallets").delete().eq("id", id);
      if (error) throw error;
      setWallets(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      throw error;
    }
  };

  return { wallets, addWallet, deleteWallet };
};
