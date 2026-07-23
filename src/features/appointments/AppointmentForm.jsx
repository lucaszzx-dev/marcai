import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { listClients } from "../clients/clientService";
import { listServices } from "../services/serviceService";
import { friendlyError } from "../../lib/errors";
import {
  calculateEnd,
  formatDateTime,
  parsePrice,
  toLocalInputValue,
} from "../../lib/formatters";
import { useAuth } from "../auth/AuthContext";
import {
  createAppointment,
  getAppointment,
  updateAppointment,
} from "./appointmentService";
import { statusLabels } from "./appointmentStatus";
import { materialStatuses, workflowStages } from "./workflow";
import {
  listBlockedPeriods,
  listBusinessHours,
} from "../settings/settingsService";
import { validateAvailability } from "../settings/availability";

const empty = {
  client_id: "",
  service_id: "",
  starts_at: "",
  status: "pending",
  notes: "",
  amount: "",
  payment_status: "pending",
  payment_method: "",
  request_description: "",
  custom_duration_minutes: "60",
  workflow_stage: "request_received",
  material_status: "not_required",
  preparation_deadline: "",
  material_expected_at: "",
  internal_notes: "",
};
export default function AppointmentForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const presetClient = searchParams.get("cliente");
  const editing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [hours, setHours] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      listClients(),
      listServices({ activeOnly: !editing }),
      editing ? getAppointment(id) : null,
      listBusinessHours(),
      listBlockedPeriods(),
    ])
      .then(([clientData, serviceData, appointment, hoursData, blocksData]) => {
        setClients(clientData);
        setServices(serviceData);
        setHours(hoursData);
        setBlocks(blocksData);
        if (appointment) {
          if (
            appointment.service_id &&
            !serviceData.some((item) => item.id === appointment.service_id)
          )
            serviceData.push(appointment.services);
          setForm({
            client_id: appointment.client_id,
            service_id: appointment.service_id ?? "custom",
            starts_at: toLocalInputValue(appointment.starts_at),
            status: appointment.status,
            notes: appointment.notes ?? "",
            amount: String(
              appointment.amount ?? appointment.services?.price ?? 0,
            ).replace(".", ","),
            payment_status: appointment.payment_status ?? "pending",
            payment_method: appointment.payment_method ?? "",
            request_description: appointment.request_description ?? "",
            custom_duration_minutes: String(
              Math.round(
                (new Date(appointment.ends_at) -
                  new Date(appointment.starts_at)) /
                  60000,
              ),
            ),
            workflow_stage: appointment.workflow_stage ?? "request_received",
            material_status: appointment.material_status ?? "not_required",
            preparation_deadline: appointment.preparation_deadline ?? "",
            material_expected_at: appointment.material_expected_at ?? "",
            internal_notes: appointment.internal_notes ?? "",
          });
        } else if (presetClient) {
          setForm((current) => ({
            ...current,
            client_id: presetClient,
          }));
        }
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [editing, id, presetClient]);
  const selectedService = services.find((item) => item.id === form.service_id);
  const selectedClient = clients.find((item) => item.id === form.client_id);
  const endsAt = useMemo(() => {
    const duration =
      form.service_id === "custom"
        ? Number(form.custom_duration_minutes)
        : selectedService?.duration_minutes;
    return calculateEnd(form.starts_at, duration);
  }, [
    form.starts_at,
    form.service_id,
    form.custom_duration_minutes,
    selectedService,
  ]);
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  function selectService(event) {
    const service = services.find((item) => item.id === event.target.value);
    setForm((current) => ({
      ...current,
      service_id: event.target.value,
      amount:
        event.target.value === "custom"
          ? "0"
          : service
            ? String(service.price).replace(".", ",")
            : "",
    }));
  }
  async function submit(event) {
    event.preventDefault();
    const approvingQuote =
      event.nativeEvent.submitter?.name === "approve_quote";
    if (!endsAt) return setError("Escolha o serviço, a data e o horário.");
    const availabilityError = validateAvailability(
      new Date(form.starts_at),
      endsAt,
      hours,
      blocks,
    );
    if (availabilityError) return setError(availabilityError);
    const amount = parsePrice(form.amount);
    if (Number.isNaN(amount)) return setError("Informe um valor válido.");
    if (approvingQuote && amount <= 0)
      return setError("Informe o valor aprovado antes de fechar o orçamento.");
    setSaving(true);
    setError("");
    const values = {
      client_id: form.client_id,
      service_id: form.service_id === "custom" ? null : form.service_id,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: endsAt.toISOString(),
      status: approvingQuote ? "confirmed" : form.status,
      notes: form.notes.trim() || null,
      amount,
      payment_status: form.payment_status,
      payment_method: form.payment_method || null,
      request_description:
        form.service_id === "custom"
          ? form.request_description.trim() || null
          : null,
      workflow_stage: form.workflow_stage,
      material_status: form.material_status,
      preparation_deadline: form.preparation_deadline || null,
      material_expected_at: form.material_expected_at || null,
      internal_notes: form.internal_notes.trim() || null,
    };
    try {
      if (editing) await updateAppointment(id, values);
      else await createAppointment(values, user.id);
      navigate("/app/agenda", {
        replace: true,
        state: {
          message: editing
            ? approvingQuote
              ? "Orçamento aprovado e trabalho confirmado na agenda."
              : "Agendamento atualizado com sucesso."
            : "Agendamento criado com sucesso.",
        },
      });
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  }
  if (loading) return <Spinner label="Preparando agenda…" />;
  const missingData = clients.length === 0;
  return (
    <section className="page narrow">
      <div className="page-heading">
        <Link className="back-link" to="/app/agenda">
          ← Voltar para agenda
        </Link>
        <p className="eyebrow">Atendimento</p>
        <h1>{editing ? "Editar agendamento" : "Novo agendamento"}</h1>
        <p>O término é calculado pela duração do serviço.</p>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {editing && form.service_id === "custom" && (
        <Alert>
          Este é um pedido privado. Para fechar o orçamento, informe abaixo a
          data definitiva, o valor aprovado e clique em “Fechar orçamento e
          confirmar”. Ele contará nos relatórios sem aparecer para outros
          clientes.
        </Alert>
      )}
      {missingData && (
        <Alert>
          Para agendar, você precisa ter pelo menos um cliente e um serviço
          ativo. <Link to="/app/clientes/novo">Cadastrar cliente</Link> ·{" "}
          <Link to="/app/servicos/novo">Cadastrar serviço</Link>
        </Alert>
      )}
      <form className="card client-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            Cliente
            <select
              name="client_id"
              value={form.client_id}
              onChange={update}
              required
            >
              <option value="">Selecione</option>
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {selectedClient && (
            <aside className="client-contact-summary full">
              <div>
                <strong>Contato de {selectedClient.name}</strong>
                <small>
                  {selectedClient.phone || "Sem telefone"} ·{" "}
                  {selectedClient.email || "Sem e-mail"}
                </small>
              </div>
              <div>
                {selectedClient.phone && (
                  <a
                    href={`https://wa.me/55${selectedClient.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir WhatsApp ↗
                  </a>
                )}
                {selectedClient.email && (
                  <a href={`mailto:${selectedClient.email}`}>Enviar e-mail</a>
                )}
              </div>
            </aside>
          )}
          {form.service_id === "custom" && (
            <>
              <label className="full">
                Descrição do pedido
                <textarea
                  name="request_description"
                  value={form.request_description}
                  onChange={update}
                  rows="4"
                  minLength="5"
                  required
                />
              </label>
              <label>
                Tempo reservado
                <select
                  name="custom_duration_minutes"
                  value={form.custom_duration_minutes}
                  onChange={update}
                >
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="90">1 hora e 30 minutos</option>
                  <option value="120">2 horas</option>
                </select>
              </label>
            </>
          )}
          <label>
            Serviço
            <select
              name="service_id"
              value={form.service_id}
              onChange={selectService}
              required
            >
              <option value="">Selecione</option>
              <option value="custom">Pedido personalizado (privado)</option>
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} — {item.duration_minutes} min
                </option>
              ))}
            </select>
          </label>
          <label>
            {form.service_id === "custom"
              ? "Data e horário definitivos"
              : "Data e horário"}
            <input
              type="datetime-local"
              name="starts_at"
              value={form.starts_at}
              onChange={update}
              required
            />
          </label>
          <label>
            Situação
            <select name="status" value={form.status} onChange={update}>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etapa do trabalho
            <select
              name="workflow_stage"
              value={form.workflow_stage}
              onChange={update}
            >
              {Object.entries(workflowStages).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Situação do material
            <select
              name="material_status"
              value={form.material_status}
              onChange={update}
            >
              {Object.entries(materialStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prazo para deixar tudo pronto
            <input
              type="date"
              name="preparation_deadline"
              value={form.preparation_deadline}
              onChange={update}
            />
          </label>
          <label>
            Previsão de chegada do material
            <input
              type="date"
              name="material_expected_at"
              value={form.material_expected_at}
              onChange={update}
            />
          </label>
          <label>
            Valor do atendimento (R$)
            <input
              name="amount"
              value={form.amount}
              onChange={update}
              inputMode="decimal"
              placeholder="60,00"
              required
            />
          </label>
          <label>
            Pagamento
            <select
              name="payment_status"
              value={form.payment_status}
              onChange={update}
            >
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="refunded">Estornado</option>
            </select>
          </label>
          <label>
            Forma de pagamento
            <select
              name="payment_method"
              value={form.payment_method}
              onChange={update}
            >
              <option value="">Não informada</option>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
            </select>
          </label>
          {endsAt && (
            <p className="calculated-time full">
              Término previsto: <strong>{formatDateTime(endsAt)}</strong>
            </p>
          )}
          <label className="full">
            Observações
            <textarea
              name="notes"
              value={form.notes}
              onChange={update}
              rows="4"
            />
          </label>
          <label className="full">
            Anotações internas
            <textarea
              name="internal_notes"
              value={form.internal_notes}
              onChange={update}
              rows="4"
              placeholder="Fornecedor, material necessário, medidas conferidas e outros detalhes que somente sua equipe deve ver."
            />
            <small>Estas informações nunca aparecem para o cliente.</small>
          </label>
        </div>
        <div className="form-actions">
          <Link className="button button-secondary" to="/app/agenda">
            Cancelar
          </Link>
          <button
            className="button button-primary"
            disabled={saving || missingData}
          >
            {saving ? "Salvando…" : "Salvar agendamento"}
          </button>
          {editing && form.service_id === "custom" && (
            <button
              className="button button-primary"
              name="approve_quote"
              disabled={saving || missingData}
            >
              Fechar orçamento e confirmar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
