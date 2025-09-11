// server/config/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

let supabase: SupabaseClient | null = null;

function readEnv() {
  const url = process.env.SUPABASE_URL;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const altKey = process.env.SUPABASE_SERVICE_KEY; // fallback if you used this name
  const key = roleKey ?? altKey;

  // Debug-friendly — prints presence (not full secret) so logs are safe
  console.log("supabase envs (presence):", {
    SUPABASE_URL: !!url,
    SUPABASE_SERVICE_ROLE_KEY: !!roleKey,
    SUPABASE_SERVICE_KEY: !!altKey,
  });

  return { url, key };
}

/**
 * Returns a singleton Supabase client.
 * Reads envs lazily at first call to avoid import-time race conditions.
 */
export function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const { url, key } = readEnv();

  if (!url || !key) {
    console.error(
      "Missing Supabase environment variables. Ensure your server/.env contains SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)."
    );
    throw new Error("Missing Supabase environment variables");
  }

  supabase = createClient(url, key);
  return supabase;
}
