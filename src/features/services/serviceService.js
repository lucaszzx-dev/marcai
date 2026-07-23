import { requireSupabase } from "../../lib/supabase";

export async function listServices({ activeOnly = false } = {}) {
  let query = requireSupabase().from("services").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getService(id) {
  const { data, error } = await requireSupabase()
    .from("services")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createService(values, userId) {
  const { data, error } = await requireSupabase()
    .from("services")
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateService(id, values) {
  const { data, error } = await requireSupabase()
    .from("services")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteService(id) {
  const { error } = await requireSupabase()
    .from("services")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
