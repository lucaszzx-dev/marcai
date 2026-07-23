import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { formatCurrency } from "../../lib/formatters";
import {
  getPublicBookingData,
  requestPublicAppointment,
} from "./publicBookingService";

function overlaps(start, end, busy) {
  return busy.some(
    (period) =>
      start < new Date(period.ends_at) && end > new Date(period.starts_at),
  );
}

function availableSlots(data, serviceId, dateValue) {
  if (!data || !serviceId || !dateValue) return [];
  const service =
    serviceId === "custom"
      ? {
          duration_minutes: data.profile.custom_request_duration_minutes ?? 60,
        }
      : data.services.find((item) => item.id === serviceId);
  const date = new Date(`${dateValue}T12:00:00`);
  const hours = data.hours.find((item) => item.weekday === date.getDay());
  if (!service || !hours) return [];
  const [startHour, startMinute] = hours.start_time.split(":").map(Number);
  const [endHour, endMinute] = hours.end_time.split(":").map(Number);
  const cursor = new Date(`${dateValue}T00:00:00`);
  cursor.setHours(startHour, startMinute, 0, 0);
  const dayEnd = new Date(`${dateValue}T00:00:00`);
  dayEnd.setHours(endHour, endMinute, 0, 0);
  const breakStart = hours.break_start
    ? new Date(`${dateValue}T${String(hours.break_start).slice(0, 5)}:00`)
    : null;
  const breakEnd = hours.break_end
    ? new Date(`${dateValue}T${String(hours.break_end).slice(0, 5)}:00`)
    : null;
  const slots = [];
  while (cursor < dayEnd) {
    const start = new Date(cursor);
    const end = new Date(start.getTime() + service.duration_minutes * 60_000);
    if (
      end <= dayEnd &&
      start > new Date() &&
      !overlaps(start, end, data.busy) &&
      !(breakStart && breakEnd && start < breakEnd && end > breakStart)
    )
      slots.push(start);
    cursor.setMinutes(
      cursor.getMinutes() + (data.profile.slot_interval_minutes ?? 30),
    );
  }
  return slots;
}

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({
    service: "",
    date: "",
    time: "",
    name: "",
    phone: "",
    email: "",
    notes: "",
    requestDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    getPublicBookingData(slug)
      .then((value) => {
        if (!value) setError("Esta página de agendamento não está disponível.");
        else setData(value);
      })
      .catch(() => setError("Não foi possível abrir esta agenda."))
      .finally(() => setLoading(false));
  }, [slug]);
  const slots = useMemo(
    () => availableSlots(data, form.service, form.date),
    [data, form.service, form.date],
  );
  const selectedService = data?.services.find(
    (item) => item.id === form.service,
  );
  const businessName = data?.profile
    ? data.profile.business_name || data.profile.full_name
    : "";
  const singleWordName = businessName.trim().split(/\s+/).length === 1;
  const maxDate = new Date();
  maxDate.setDate(
    maxDate.getDate() + (data?.profile.booking_window_days ?? 30),
  );
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestPublicAppointment({
        p_slug: slug,
        p_service_id: form.service === "custom" ? null : form.service,
        p_starts_at: new Date(`${form.date}T${form.time}:00`).toISOString(),
        p_client_name: form.name,
        p_phone: form.phone || null,
        p_email: form.email || null,
        p_notes: form.notes || null,
        p_request_description:
          form.service === "custom" ? form.requestDescription : null,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.message.includes("acabou de ser reservado")
          ? "Este horário acabou de ser reservado. Escolha outro."
          : "Não foi possível solicitar o horário. Atualize a página e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <main className="public-booking center-page">
        <Spinner label="Abrindo agenda…" />
      </main>
    );
  if (!data)
    return (
      <main className="public-booking center-page">
        <section className="config-card">
          <Link className="brand brand-dark" to="/">
            marca<span>í</span>
          </Link>
          <h1>Agenda indisponível</h1>
          <Alert type="error">{error}</Alert>
        </section>
      </main>
    );
  return (
    <main className="public-booking">
      <header className="public-header">
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <small>Agendamento online</small>
      </header>
      <div className="public-booking-grid">
        <aside className="business-intro">
          <p className="eyebrow">Agende seu horário</p>
          {data.profile.logo_url && (
            <img
              className="public-logo"
              src={data.profile.logo_url}
              alt={`Logo de ${data.profile.business_name || data.profile.full_name}`}
            />
          )}
          <h1
            className={singleWordName ? "single-word-business-name" : ""}
            style={
              singleWordName
                ? {
                    fontSize: `${Math.max(
                      2.2,
                      4 - Math.max(0, businessName.length - 10) * 0.18,
                    )}rem`,
                  }
                : undefined
            }
          >
            {businessName}
          </h1>
          <p>
            {data.profile.bio ||
              "Escolha o serviço e encontre o melhor horário para você."}
          </p>
          {data.profile.phone && (
            <a
              className="whatsapp-link"
              href={`https://wa.me/55${data.profile.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              Falar pelo WhatsApp ↗
            </a>
          )}
          {data.profile.address && (
            <p className="public-detail">📍 {data.profile.address}</p>
          )}
          {data.profile.instagram && (
            <a
              className="public-detail"
              href={`https://instagram.com/${data.profile.instagram}`}
              target="_blank"
              rel="noreferrer"
            >
              Instagram: @{data.profile.instagram} ↗
            </a>
          )}
        </aside>
        <section className="booking-panel card">
          {success ? (
            <div className="booking-success">
              <div>✓</div>
              <h2>Solicitação enviada!</h2>
              <p>
                {data.profile.confirmation_message ||
                  "O horário ficou reservado como pendente. O profissional poderá confirmar o atendimento."}
              </p>
              <button
                className="button button-primary"
                onClick={() => {
                  setSuccess(false);
                  setForm({
                    service: "",
                    date: "",
                    time: "",
                    name: "",
                    phone: "",
                    email: "",
                    notes: "",
                    requestDescription: "",
                  });
                }}
              >
                Fazer outro agendamento
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2>Escolha seu atendimento</h2>
              {error && <Alert type="error">{error}</Alert>}
              <div className="public-services">
                {data.services.map((service) => (
                  <label
                    className={form.service === service.id ? "selected" : ""}
                    key={service.id}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={service.id}
                      checked={form.service === service.id}
                      onChange={update}
                      required
                    />
                    <span>
                      <strong>{service.name}</strong>
                      <small>
                        {service.duration_minutes} min ·{" "}
                        {Number(service.price) === 0
                          ? "Orçamento sob consulta"
                          : formatCurrency(service.price)}
                      </small>
                    </span>
                  </label>
                ))}
                {data.profile.allow_custom_requests && (
                  <label
                    className={form.service === "custom" ? "selected" : ""}
                  >
                    <input
                      type="radio"
                      name="service"
                      value="custom"
                      checked={form.service === "custom"}
                      onChange={update}
                      required
                    />
                    <span>
                      <strong>Quero descrever o que preciso</strong>
                      <small>
                        Pedido personalizado · orçamento sob consulta
                      </small>
                    </span>
                  </label>
                )}
              </div>
              {form.service && (
                <>
                  {form.service === "custom" && (
                    <label>
                      Descreva o produto ou serviço desejado
                      <textarea
                        name="requestDescription"
                        value={form.requestDescription}
                        onChange={update}
                        rows="5"
                        minLength="5"
                        maxLength="2000"
                        placeholder="Exemplo: preciso de um box para banheiro. Informe medidas aproximadas, local da instalação, material desejado e outros detalhes que souber."
                        required
                      />
                    </label>
                  )}
                  <label>
                    Escolha o dia
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      min={new Date().toISOString().slice(0, 10)}
                      max={maxDate.toISOString().slice(0, 10)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          date: event.target.value,
                          time: "",
                        }))
                      }
                      required
                    />
                  </label>
                  {form.date && (
                    <div>
                      <span className="field-label">Horários disponíveis</span>
                      <div className="slots-grid">
                        {slots.length === 0 ? (
                          <p>Nenhum horário livre neste dia.</p>
                        ) : (
                          slots.map((slot) => {
                            const value = slot.toTimeString().slice(0, 5);
                            return (
                              <button
                                type="button"
                                className={
                                  form.time === value ? "selected" : ""
                                }
                                key={value}
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    time: value,
                                  }))
                                }
                              >
                                {value}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              {form.time && (
                <div className="booking-contact">
                  <label>
                    Seu nome
                    <input
                      name="name"
                      value={form.name}
                      onChange={update}
                      required
                      minLength="2"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      WhatsApp
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={update}
                        type="tel"
                      />
                    </label>
                    <label>
                      E-mail
                      <input
                        name="email"
                        value={form.email}
                        onChange={update}
                        type="email"
                      />
                    </label>
                  </div>
                  <label>
                    Observação
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={update}
                      rows="3"
                    />
                  </label>
                  <button
                    className="button button-primary booking-submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Enviando…"
                      : form.service === "custom"
                        ? "Enviar solicitação de orçamento"
                        : Number(selectedService.price) === 0
                          ? "Solicitar orçamento"
                          : `Solicitar por ${formatCurrency(selectedService.price)}`}
                  </button>
                </div>
              )}
              {(data.profile.accepted_payments?.length > 0 ||
                data.profile.cancellation_policy) && (
                <aside className="booking-rules">
                  {data.profile.accepted_payments?.length > 0 && (
                    <p>
                      <strong>Pagamento:</strong>{" "}
                      {data.profile.accepted_payments.join(", ")}
                    </p>
                  )}
                  {data.profile.cancellation_policy && (
                    <p>
                      <strong>Cancelamento:</strong>{" "}
                      {data.profile.cancellation_policy}
                    </p>
                  )}
                </aside>
              )}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
