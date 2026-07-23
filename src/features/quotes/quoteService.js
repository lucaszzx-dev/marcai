import { requireSupabase } from "../../lib/supabase";

const selection = "*, clients(name, phone, email), quote_items(*)";
export async function listQuotes() {
  const { data, error } = await requireSupabase()
    .from("quotes")
    .select(selection)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function createQuote(values, items, userId) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0,
  );
  if (!items.length || items.some((item) => !item.description.trim())) {
    throw new Error("Adicione pelo menos um item com descrição.");
  }
  if (Number(values.discount) > subtotal) {
    throw new Error("O desconto não pode ser maior que o subtotal.");
  }
  const client = requireSupabase();
  const { data: quote, error } = await client
    .from("quotes")
    .insert({ ...values, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  const { error: itemError } = await client
    .from("quote_items")
    .insert(
      items.map((item, position) => ({
        ...item,
        quote_id: quote.id,
        position,
      })),
    );
  if (itemError) {
    await client.from("quotes").delete().eq("id", quote.id);
    throw itemError;
  }
  return quote;
}
export async function updateQuote(id, values) {
  const { data, error } = await requireSupabase()
    .from("quotes")
    .update(values)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteQuote(id) {
  const { error } = await requireSupabase()
    .from("quotes")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
export async function getPublicQuote(token) {
  const { data, error } = await requireSupabase().rpc("get_public_quote", {
    p_token: token,
  });
  if (error) throw error;
  return data;
}
export async function respondToQuote(token, response) {
  const { data, error } = await requireSupabase().rpc("respond_to_quote", {
    p_token: token,
    p_response: response,
  });
  if (error) throw error;
  return data;
}
