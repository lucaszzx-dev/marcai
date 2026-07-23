import { requireSupabase } from "../../lib/supabase";

export async function listCategories() {
  const { data, error } = await requireSupabase()
    .from("financial_categories")
    .select("*")
    .order("kind")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createCategory(values, userId) {
  const { data, error } = await requireSupabase()
    .from("financial_categories")
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id, values) {
  const { data, error } = await requireSupabase()
    .from("financial_categories")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await requireSupabase()
    .from("financial_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function listEntries(from, to) {
  const { data, error } = await requireSupabase()
    .from("financial_entries")
    .select(
      "*, financial_categories(name, kind), appointments(clients(name), request_description, services(name))",
    )
    .gte("entry_date", from)
    .lt("entry_date", to)
    .order("entry_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createEntry(values, userId) {
  const { data, error } = await requireSupabase()
    .from("financial_entries")
    .insert({ ...values, user_id: userId })
    .select("*, financial_categories(name, kind)")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await requireSupabase()
    .from("financial_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
