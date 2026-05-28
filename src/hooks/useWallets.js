import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export const useWallets = () => {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    const fetchWallets = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("wallets")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) setWallets(data);
    };

    fetchWallets();
  }, []);

  const addWallet = async (name) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesi tidak valid");

      const { data, error } = await supabase
        .from("wallets")
        .insert([{ user_id: session.user.id, name }])
        .select();

      if (error) throw error;
      if (data) {
        setWallets((prev) => [...prev, data[0]]);
        return data[0];
      }
    } catch (error) {
      throw error; // Lempar ke pemanggil, bukan alert()
    }
  };

  const deleteWallet = async (id) => {
    try {
      const { error } = await supabase.from("wallets").delete().eq("id", id);
      if (error) throw error;
      setWallets((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      throw error; // Lempar ke pemanggil
    }
  };

  return { wallets, addWallet, deleteWallet };
};
