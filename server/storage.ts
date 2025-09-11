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
    return data as DataFile;
  }

  async getDataFile(id: string): Promise<DataFile | undefined> {
    const { data, error } = await supabase
      .from("data_files")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return undefined;
      // Map snake_case → camelCase
  return {
    ...data,
    originalData: data.original_data,
    cleanedData: data.cleaned_data,
    qualityScore: data.quality_score,
  } as DataFile;
    return data as DataFile;
  }

  async updateDataFile(id: string, updates: Partial<DataFile>): Promise<DataFile | undefined> {

     // Map camelCase → snake_case for Supabase
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
  return data as DataFile;
}

  async deleteDataFile(id: string): Promise<boolean> {
    const { error } = await supabase.from("data_files").delete().eq("id", id);
    return !error;
  }
}

export const storage = new SupabaseStorage();
