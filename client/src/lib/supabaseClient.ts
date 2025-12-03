// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
export type Database = {
  public: {
    Tables: {
      user_uploads: {
        Row: {
          id: string;               // uuid
          name: string | null;
          avatar_url: string | null;
          uploads: number | null;
          plan: string | null;
          created_at: string | null; // timestamp string
        };
        Insert: {
          id: string;
          name?: string | null;
          avatar_url?: string | null;
          uploads?: number | null;
          plan?: string | null;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
          uploads?: number | null;
          plan?: string | null;
        };
      };
    };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
