import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validasi apakah URL diawali dengan http:// atau https://
const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

export const supabase = isValidUrl 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null; // Set null jika URL belum diisi/tidak valid agar tidak crash