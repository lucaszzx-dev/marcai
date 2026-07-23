import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { formatCurrency, formatDateTime } from "../../lib/formatters";
import { statusLabels } from "../appointments/appointmentStatus";
import { getClient, getClientAppointments } from "./clientService";

export default function ClientDetailsPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([getClient(id), getClientAppointments(id)])
      .then(([clientData, appointmentData]) => {
        setClient(clientData);
        setAppointments(appointmentData);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [id]);
  const total = useMemo(
    () =>
      appointments
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.services?.price ?? 0), 0),
    [appointments],
  );
  if (loading) return <Spinner label="Carregando histórico…" />;
  if (!client)
    return (
      <section className="page">
        <Alert type="error">{error}</Alert>
      </section>
    );
  const whatsapp = client.phone?.replace(/\D/g, "");
  return (
    <section className="page narrow">
      <Link className="back-link" to="/app/clientes">
        ← Voltar para clientes
      </Link>
      <div className="client-profile card">
        <div className="large-avatar">{client.name[0].toUpperCase()}</div>
        <div>
          <p className="eyebrow">Cliente</p>
          <h1>{client.name}</h1>
          <p>
            {client.phone || "Sem telefone"} · {client.email || "Sem e-mail"}
          </p>
          {client.birth_date && (
            <small className="client-birthday">
              Aniversário:{" "}
              {new Date(`${client.birth_date}T12:00:00`).toLocaleDateString(
                "pt-BR",
              )}
            </small>
          )}
        </div>
        <div className="profile-actions">
          {whatsapp && (
            <a
              className="button button-whatsapp"
              href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(`Olá, ${client.name}! Tudo bem?`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Conversar no WhatsApp ↗
            </a>
          )}
          <Link
            className="button button-secondary"
            to={`/app/clientes/${client.id}/editar`}
          >
            Editar dados
          </Link>
        </div>
      </div>
      {client.notes && (
        <div className="card notes-card">
          <strong>Observações</strong>
          <p>{client.notes}</p>
        </div>
      )}
      {(client.tags?.length > 0 || client.preferences) && (
        <div className="card client-extra-card">
          {client.tags?.length > 0 && (
            <div className="tags-list">
              {client.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          {client.preferences && (
            <div>
              <strong>Preferências</strong>
              <p>{client.preferences}</p>
            </div>
          )}
        </div>
      )}
      <div className="metrics-grid client-metrics">
        <article className="metric-card card">
          <span>Atendimentos</span>
          <strong>{appointments.length}</strong>
          <small>no histórico</small>
        </article>
        <article className="metric-card card">
          <span>Concluídos</span>
          <strong>
            {appointments.filter((item) => item.status === "completed").length}
          </strong>
          <small>realizados</small>
        </article>
        <article className="metric-card card accent-card">
          <span>Valor realizado</span>
          <strong>{formatCurrency(total)}</strong>
          <small>serviços concluídos</small>
        </article>
      </div>
      <div className="page-heading row history-heading">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h2>Histórico de atendimentos</h2>
        </div>
        <Link
          className="button button-primary"
          to={`/app/agenda/novo?cliente=${client.id}`}
        >
          ＋ Novo horário
        </Link>
      </div>
      {appointments.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum atendimento ainda</h2>
          <p>Quando este cliente for agendado, o histórico aparecerá aqui.</p>
        </div>
      ) : (
        <div className="card timeline">
          {appointments.map((item) => (
            <article key={item.id}>
              <span className={`timeline-dot event-${item.status}`} />
              <div>
                <strong>{item.services?.name}</strong>
                <small>{formatDateTime(item.starts_at)}</small>
              </div>
              <span className={`status status-${item.status}`}>
                {statusLabels[item.status]}
              </span>
              <strong>{formatCurrency(item.services?.price ?? 0)}</strong>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
