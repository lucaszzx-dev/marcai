import { requireSupabase } from "../../lib/supabase";
export async function signIn({ email, password }) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}
export async function signUp({ fullName, businessName, email, password }) {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, business_name: businessName } },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/redefinir-senha`,
  });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}
