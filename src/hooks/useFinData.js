import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useFinData = (userId, defaultWalletId) => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // PERBAIKAN: Jika klien Supabase tidak aktif/null, langsung gunakan data bayangan lokal
        if (!supabase) {
            setBalance(5000000);
            setTransactions([
                { id: "mock-1", amount: 25000, note: 'Kopi Susu', category: 'Jajan', type: 'expense' },
                { id: "mock-2", amount: 150000, note: 'Belanja Bulanan', category: 'Kebutuhan', type: 'expense' }
            ]);
            setIsLoading(false);
            return;
        }

        const fetchInitialData = async () => {
            try {
                const { data: walletData } = await supabase.from('wallets').select('balance').eq('id', defaultWalletId).single();
                if (walletData) setBalance(walletData.balance);

                const { data: trxData } = await supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
                if (trxData) setTransactions(trxData);
            } catch (error) {
                console.error("Gagal memuat data awal:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();

        const channel = supabase.channel('artakita-realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
                setTransactions((current) => [payload.new, ...current].slice(0, 10));
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets' }, (payload) => {
                setBalance(payload.new.balance);
            }).subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, defaultWalletId]);

    const addTransaction = async (parsedData) => {
        const tempId = typeof window !== 'undefined' ? crypto.randomUUID() : Math.random().toString();
        const newTrx = { 
            id: tempId, 
            amount: parsedData.amount, 
            note: parsedData.note, 
            category: parsedData.category, 
            type: 'expense' 
        };
        
        // Optimistic Update UI (Selalu berjalan di mode lokal maupun live)
        setTransactions((curr) => [newTrx, ...curr]);
        setBalance((prev) => prev - parsedData.amount);

        // Hanya tembak ke server jika klien Supabase aktif
        if (supabase) {
            await supabase.from('transactions').insert([{ user_id: userId, wallet_id: defaultWalletId, ...newTrx }]);
        }
    };

    return { balance, transactions, isLoading, addTransaction };
};