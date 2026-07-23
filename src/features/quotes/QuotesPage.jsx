import { useEffect, useState } from "react";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { formatCurrency } from "../../lib/formatters";
import { listAppointments } from "../appointments/appointmentService";
import { useAuth } from "../auth/AuthContext";
import { listClients } from "../clients/clientService";
import {
  createQuote,
  deleteQuote,
  listQuotes,
  updateQuote,
} from "./quoteService";

const emptyItem = { description: "", quantity: "1", unit_price: "" };
const emptyForm = {
  appointment_id: "",
  client_id: "",
  valid_until: "",
  discount: "0",
  payment_terms: "",
  notes: "",
};
const statusLabels = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Vencido",
};

export default function QuotesPage() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadData() {
    const [quoteData, clientData, appointmentData] = await Promise.all([
      listQuotes(),
      listClients(),
      listAppointments(),
    ]);
    setQuotes(quoteData);
    setClients(clientData);
    setAppointments(
      appointmentData.filter((item) => item.status !== "cancelled"),
    );
  }

  useEffect(() => {
    loadData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) *
        (Number(String(item.unit_price).replace(",", ".")) || 0),
    0,
  );
  const discount = Number(String(form.discount).replace(",", ".")) || 0;

  function selectAppointment(appointmentId) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    setForm((current) => ({
      ...current,
      appointment_id: appointmentId,
      client_id: appointment?.clients?.id || current.client_id,
    }));
    if (appointment?.notes && !items[0].description) {
      setItems([{ ...emptyItem, description: appointment.notes }]);
    }
  }

  function changeItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await createQuote(
        {
          ...form,
          appointment_id: form.appointment_id || null,
          discount,
          valid_until: form.valid_until || null,
          payment_terms: form.payment_terms.trim() || null,
          notes: form.notes.trim() || null,
        },
        items.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit_price: Number(String(item.unit_price).replace(",", ".")),
        })),
        user.id,
      );
      await loadData();
      setForm(emptyForm);
      setItems([{ ...emptyItem }]);
      setSuccess("Orçamento salvo como rascunho.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyAndSend(quote) {
    setError("");
    try {
      const link = `${window.location.origin}/orcamento/${quote.public_token}`;
      await updateQuote(quote.id, { status: "sent" });
      await navigator.clipboard.writeText(link);
      await loadData();
      setSuccess("Link privado copiado. Agora é só enviá-lo ao cliente.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Spinner label="Carregando orçamentos…" />;

  return (
    <section className="page page-wide">
      <div className="page-heading">
        <p className="eyebrow">Propostas comerciais</p>
        <h1>Orçamentos</h1>
        <p>Crie uma proposta e envie um link privado para o cliente aprovar.</p>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="finance-grid">
        <form className="card settings-section" onSubmit={submit}>
          <h2>Novo orçamento</h2>
          <div className="form-grid">
            <label>
              Solicitação ou agendamento (opcional)
              <select
                value={form.appointment_id}
                onChange={(event) => selectAppointment(event.target.value)}
              >
                <option value="">Criar orçamento sem vínculo</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.clients?.name} ·{" "}
                    {appointment.notes || "Atendimento"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cliente
              <select
                value={form.client_id}
                onChange={(event) =>
                  setForm({ ...form, client_id: event.target.value })
                }
                required
              >
                <option value="">Selecione</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Validade
              <input
                type="date"
                value={form.valid_until}
                onChange={(event) =>
                  setForm({ ...form, valid_until: event.target.value })
                }
              />
            </label>
          </div>

          <div className="quote-items-header" aria-hidden="true">
            <span>Descrição</span>
            <span>Quantidade</span>
            <span>Valor unitário</span>
            <span />
          </div>
          <div className="quote-items">
            {items.map((item, index) => (
              <div key={index}>
                <input
                  aria-label={`Descrição do item ${index + 1}`}
                  placeholder="Descrição do item"
                  value={item.description}
                  onChange={(event) =>
                    changeItem(index, "description", event.target.value)
                  }
                  required
                />
                <input
                  aria-label={`Quantidade do item ${index + 1}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.quantity}
                  onChange={(event) =>
                    changeItem(index, "quantity", event.target.value)
                  }
                  required
                />
                <input
                  aria-label={`Valor unitário do item ${index + 1}`}
                  placeholder="Valor unitário"
                  inputMode="decimal"
                  value={item.unit_price}
                  onChange={(event) =>
                    changeItem(index, "unit_price", event.target.value)
                  }
                  required
                />
                <button
                  type="button"
                  aria-label={`Remover item ${index + 1}`}
                  onClick={() =>
                    setItems((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              setItems((current) => [...current, { ...emptyItem }])
            }
          >
            ＋ Adicionar item
          </button>

          <div className="form-grid">
            <label>
              Desconto
              <input
                inputMode="decimal"
                value={form.discount}
                onChange={(event) =>
                  setForm({ ...form, discount: event.target.value })
                }
              />
            </label>
            <label>
              Condições de pagamento
              <input
                value={form.payment_terms}
                onChange={(event) =>
                  setForm({ ...form, payment_terms: event.target.value })
                }
                placeholder="Ex.: 50% de entrada e 50% na entrega"
              />
            </label>
            <label className="full">
              Observações
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
            </label>
          </div>
          <p className="quote-total">
            Total:{" "}
            <strong>{formatCurrency(Math.max(0, subtotal - discount))}</strong>
          </p>
          <div className="form-actions">
            <button className="button button-primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar orçamento"}
            </button>
          </div>
        </form>

        <section className="card settings-section">
          <h2>Orçamentos recentes</h2>
          {quotes.length === 0 ? (
            <p className="empty-state">Nenhum orçamento criado ainda.</p>
          ) : (
            <div className="category-list">
              {quotes.map((quote) => {
                const amount = Math.max(
                  0,
                  quote.quote_items.reduce(
                    (sum, item) =>
                      sum + Number(item.quantity) * Number(item.unit_price),
                    0,
                  ) - Number(quote.discount),
                );
                const link = `${window.location.origin}/orcamento/${quote.public_token}`;
                return (
                  <div key={quote.id} className="quote-row">
                    <span className={`status status-${quote.status}`}>
                      {statusLabels[quote.status]}
                    </span>
                    <div>
                      <strong>
                        #{quote.number} · {quote.clients.name}
                      </strong>
                      <small>{formatCurrency(amount)}</small>
                    </div>
                    <span className="category-actions">
                      <button onClick={() => copyAndSend(quote)}>
                        Enviar/copiar link
                      </button>
                      <a href={link} target="_blank" rel="noreferrer">
                        Ver
                      </a>
                      <button
                        className="category-delete"
                        onClick={async () => {
                          await deleteQuote(quote.id);
                          setQuotes((current) =>
                            current.filter((item) => item.id !== quote.id),
                          );
                        }}
                      >
                        Excluir
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
