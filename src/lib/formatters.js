export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function toLocalInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function calculateEnd(startsAt, durationMinutes) {
  if (!startsAt || !durationMinutes) return null;
  return new Date(
    new Date(startsAt).getTime() + Number(durationMinutes) * 60_000,
  );
}

export function parsePrice(value) {
  const normalized = String(value).trim().replace(/\./g, "").replace(",", ".");
  const price = Number(normalized);
  return Number.isFinite(price) ? price : NaN;
}
