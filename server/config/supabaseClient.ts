import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

let supabase: SupabaseClient | null = null;

function readEnv() {
  const url = process.env.SUPABASE_URL;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const altKey = process.env.SUPABASE_SERVICE_KEY;
  const key = roleKey ?? altKey;

  console.log("supabase envs (presence):", {
    SUPABASE_URL: !!url,
    SUPABASE_SERVICE_ROLE_KEY: !!roleKey,
    SUPABASE_SERVICE_KEY: !!altKey,
  });
  
  return { url, key };
}

export function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const { url, key } = readEnv();

  if (!url || !key) {
    console.error(
      "❌ Missing Supabase environment variables. Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)."
    );
    throw new Error("Missing Supabase environment variables");
  }

  supabase = createClient(url, key);
  return supabase;
}

// ---------- Record Linkage Storage ----------
export interface RecordLinkageFile {
  id: string;
  file_a_name: string;
  file_a_path: string;
  file_a_data: any[];
  file_b_name: string;
  file_b_path: string;
  file_b_data: any[];
  status?: string;
}

export class SupabaseRecordLinkageStorage {
  supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabase();
  }

  async createRecordLinkageFile(data: {
    file_a_name: string;
    file_a_path: string;
    file_a_data: any[];
    file_b_name: string;
    file_b_path: string;
    file_b_data: any[];
    status?: string;
  }): Promise<RecordLinkageFile> {
    const { data: inserted, error } = await this.supabase
      .from("record_linkage_files")
      .insert({
        file_a_name: data.file_a_name,
        file_a_path: data.file_a_path,
        file_a_data: data.file_a_data,
        file_b_name: data.file_b_name,
        file_b_path: data.file_b_path,
        file_b_data: data.file_b_data,
        status: data.status ?? "processing",
      })
      .select()
      .single();

    if (error) throw error;
    return inserted as RecordLinkageFile;
  }

  async getRecordLinkageById(id: string): Promise<RecordLinkageFile | null> {
    const { data, error } = await this.supabase
      .from("record_linkage_files")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Error fetching record linkage file:", error.message);
      return null;
    }
    return data as RecordLinkageFile;
  }
}

export const recordLinkageStorage = new SupabaseRecordLinkageStorage();
