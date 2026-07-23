import { requireSupabase } from "../../lib/supabase";

export async function getProfile() {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, values) {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listBusinessHours() {
  const { data, error } = await requireSupabase()
    .from("business_hours")
    .select("*")
    .order("weekday");
  if (error) throw error;
  return data;
}

export async function saveBusinessHours(userId, hours) {
  const values = hours.map((item) => ({ ...item, user_id: userId }));
  const { data, error } = await requireSupabase()
    .from("business_hours")
    .upsert(values, { onConflict: "user_id,weekday" })
    .select();
  if (error) throw error;
  return data;
}

export async function listBlockedPeriods() {
  const { data, error } = await requireSupabase()
    .from("blocked_periods")
    .select("*")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data;
}

export async function createBlockedPeriod(values, userId) {
  const { data, error } = await requireSupabase()
    .from("blocked_periods")
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlockedPeriod(id) {
  const { error } = await requireSupabase()
    .from("blocked_periods")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function uploadBusinessLogo(userId, file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/logo.${extension}`;
  const { error } = await requireSupabase()
    .storage.from("business-assets")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = requireSupabase()
    .storage.from("business-assets")
    .getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
