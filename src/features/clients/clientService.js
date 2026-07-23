import { requireSupabase } from "../../lib/supabase";
export async function listClients() {
  const { data, error } = await requireSupabase()
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}
export async function getClient(id) {
  const { data, error } = await requireSupabase()
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
export async function createClient(values, userId) {
  const { data, error } = await requireSupabase()
    .from("clients")
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function updateClient(id, values) {
  const { data, error } = await requireSupabase()
    .from("clients")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteClient(id) {
  const { error } = await requireSupabase()
    .from("clients")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getClientAppointments(id) {
  const { data, error } = await requireSupabase()
    .from("appointments")
    .select("*, services(name, price, duration_minutes)")
    .eq("client_id", id)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data;
}
