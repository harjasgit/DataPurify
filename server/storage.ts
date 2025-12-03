import { createClient } from "@supabase/supabase-js";
import { type DataFile, type InsertDataFile } from "./shared/schema.js"

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase environment variables are missing. Check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface IStorage {
  createDataFile(dataFile: InsertDataFile): Promise<DataFile>;
  getDataFile(id: string): Promise<DataFile | undefined>;
  updateDataFile(id: string, updates: Partial<DataFile>): Promise<DataFile | undefined>;
  deleteDataFile(id: string): Promise<boolean>;
}


export class SupabaseStorage implements IStorage {
  async createDataFile(insertDataFile: InsertDataFile): Promise<DataFile> {
    const { data, error } = await supabase
      .from("data_files")
      .insert({
        filename: insertDataFile.filename,
        mimetype: insertDataFile.mimetype,
        issues: insertDataFile.issues ?? null,
        original_data: insertDataFile.originalData ?? null,
        cleaned_data: insertDataFile.cleanedData ?? null,
        quality_score: insertDataFile.qualityScore ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      originalData: data.original_data,
      cleanedData: data.cleaned_data,
      qualityScore: data.quality_score,
    } as DataFile;
  }

  async getDataFile(id: string): Promise<DataFile | undefined> {
    const { data, error } = await supabase
      .from("data_files")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return undefined;

    // ✅ Normalize Supabase fields (snake_case → camelCase)
    return {
      ...data,
      originalData: data.original_data,
      cleanedData: data.cleaned_data,
      qualityScore: data.quality_score,
    } as DataFile;
  }

  async updateDataFile(id: string, updates: Partial<DataFile>): Promise<DataFile | undefined> {
    const mappedUpdates: any = {};
    if (updates.filename !== undefined) mappedUpdates.filename = updates.filename;
    if (updates.mimetype !== undefined) mappedUpdates.mimetype = updates.mimetype;
    if (updates.issues !== undefined) mappedUpdates.issues = updates.issues;
    if (updates.cleanedData !== undefined) mappedUpdates.cleaned_data = updates.cleanedData;
    if (updates.originalData !== undefined) mappedUpdates.original_data = updates.originalData;
    if (updates.qualityScore !== undefined) mappedUpdates.quality_score = updates.qualityScore;

    const { data, error } = await supabase
      .from("data_files")
      .update(mappedUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("updateDataFile error:", error);
      return undefined;
    }

    // ✅ Convert snake_case → camelCase before returning
    return {
      ...data,
      originalData: data.original_data,
      cleanedData: data.cleaned_data,
      qualityScore: data.quality_score,
    } as DataFile;
  }

  async deleteDataFile(id: string): Promise<boolean> {
    const { error } = await supabase.from("data_files").delete().eq("id", id);
    return !error;
  }
}

export const storage = new SupabaseStorage();
// ============================
// RECORD LINKAGE STORAGE (record_linkage_files)
// ============================
export interface RecordLinkageFile {
  id: string;
  user_id?: string | null;
  file_a_name: string;
  file_a_path: string;
  file_a_data?: any[];  
  file_b_name: string;
  file_b_path: string;
  file_b_data?: any[];
  status?: string;
  matched_count?: number;
  created_at?: string;
}

export interface InsertRecordLinkageFile {
  user_id?: string | null;
  file_a_name: string;
  file_a_path: string;
  file_a_data: any[];
  file_b_name: string;
  file_b_path: string;
  file_b_data: any[];
  status?: string;
  matched_count?: number;
}

export class SupabaseRecordLinkageStorage {
  async createRecordLinkageFile(insertData: InsertRecordLinkageFile): Promise<RecordLinkageFile> {
    const { data, error } = await supabase
      .from("record_linkage_files")
      .insert({
        user_id: insertData.user_id ?? null,
        file_a_name: insertData.file_a_name,
        file_a_path: insertData.file_a_path,
        file_a_data: insertData.file_a_data ?? null,
        file_b_name: insertData.file_b_name,
        file_b_path: insertData.file_b_path,
        file_b_data: insertData.file_b_data ?? null,
        status: insertData.status ?? "processing",
        matched_count: insertData.matched_count ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as RecordLinkageFile;
  }

  async updateRecordLinkageFile(
    id: string,
    updates: Partial<RecordLinkageFile>
  ): Promise<RecordLinkageFile | undefined> {
    const { data, error } = await supabase
      .from("record_linkage_files")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("updateRecordLinkageFile error:", error);
      return undefined;
    }

    return data as RecordLinkageFile;
  }

  async getRecordLinkageFile(id: string): Promise<RecordLinkageFile | undefined> {
    const { data, error } = await supabase
      .from("record_linkage_files")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return undefined;
    return data as RecordLinkageFile;
  }
}

export const recordLinkageStorage = new SupabaseRecordLinkageStorage();