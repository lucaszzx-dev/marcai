import { requireSupabase } from "../../lib/supabase";

const selection =
  "*, clients(id, name, phone, email), services(id, name, duration_minutes, price, active)";

export async function listAppointments({ from, to, limit } = {}) {
  let query = requireSupabase()
    .from("appointments")
    .select(selection)
    .order("starts_at");
  if (from) query = query.gte("starts_at", from);
  if (to) query = query.lt("starts_at", to);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAppointment(id) {
  const { data, error } = await requireSupabase()
    .from("appointments")
    .select(selection)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createAppointment(values, userId) {
  const { data, error } = await requireSupabase()
    .from("appointments")
    .insert({ ...values, user_id: userId })
    .select(selection)
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id, values) {
  const { data, error } = await requireSupabase()
    .from("appointments")
    .update(values)
    .eq("id", id)
    .select(selection)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAppointment(id) {
  const { error } = await requireSupabase()
    .from("appointments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
