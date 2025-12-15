import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class BetaCodesStorage {
  async createCode(user_id: string, code: string) {
    const { data, error } = await supabase
      .from("beta_codes")
      .insert([{ user_id, code, is_used: false }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ⭐ ADD THIS: check if user already has a code
  async getExistingCode(user_id: string) {
    const { data, error } = await supabase
      .from("beta_codes")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (error) return null;
    return data;
  }
  
  async markFeedbackSent(user_id: string) {
  return supabase
    .from("beta_codes")
    .update({ feedback_sent: true })
    .eq("user_id", user_id);
}


async markFirstUpload(user_id: string) {
  return supabase
    .from("beta_codes")
    .update({ first_upload_done: true })
    .eq("user_id", user_id);
}


  async markUsed(code: string) {
    const { data, error } = await supabase
      .from("beta_codes")
      .update({ is_used: true })
      .eq("code", code)
      .select()
      .single();

    if (error) return undefined;
    return data;
  }

  async validateCode(code: string, user_id: string) {
    const { data, error } = await supabase
      .from("beta_codes")
      .select("*")
      .eq("code", code)
      .eq("user_id", user_id)
      .single();

    if (error) return undefined;
    return data;
  }

async activateBetaForUser(user_id: string) {
  const { data, error } = await supabase
    .from("user_uploads") // your table where user data lives
    .update({ beta_access: true,
     beta_activated_at: new Date().toISOString()
     }) // add this column in Supabase
    .eq("id", user_id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
}

export const betaCodesStorage = new BetaCodesStorage();
