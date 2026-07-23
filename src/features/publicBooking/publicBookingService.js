import { requireSupabase } from "../../lib/supabase";

export async function getPublicBookingData(slug) {
  const { data, error } = await requireSupabase().rpc(
    "get_public_booking_data",
    { p_slug: slug },
  );
  if (error) throw error;
  return data;
}

export async function requestPublicAppointment(values) {
  const { data, error } = await requireSupabase().rpc(
    "request_public_appointment",
    values,
  );
  if (error) throw error;
  return data;
}
