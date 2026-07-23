import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Alert from "../components/common/Alert";
import Spinner from "../components/common/Spinner";
import { listAppointments } from "../features/appointments/appointmentService";
import { statusLabels } from "../features/appointments/appointmentStatus";
import {
  materialStatuses,
  workflowStages,
} from "../features/appointments/workflow";
import { useAuth } from "../features/auth/AuthContext";
import { listClients } from "../features/clients/clientService";
import { listServices } from "../features/services/serviceService";
import { friendlyError } from "../lib/errors";
import { formatCurrency, formatDateTime } from "../lib/formatters";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    appointments: [],
    clients: [],
    services: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    Promise.all([
      listAppointments({
        from: monthStart.toISOString(),
        to: monthEnd.toISOString(),
      }),
      listClients(),
      listServices(),
    ])
      .then(([appointments, clients, services]) =>
        setData({ appointments, clients, services }),
      )
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = useMemo(
    () =>
      data.appointments
        .filter(
          (item) =>
            new Date(item.starts_at) >= new Date() &&
            item.status !== "cancelled",
        )
        .slice(0, 5),
    [data.appointments],
  );
  const completed = data.appointments.filter(
    (item) => item.status === "completed",
  );
  const revenue = completed.reduce(
    (sum, item) => sum + Number(item.amount ?? item.services?.price ?? 0),
    0,
  );
  const received = data.appointments
    .filter((item) => item.payment_status === "paid")
    .reduce(
      (sum, item) => sum + Number(item.amount ?? item.services?.price ?? 0),
      0,
    );
  const preparationAlerts = data.appointments.filter((item) => {
    if (item.status === "cancelled" || item.workflow_stage === "completed")
      return false;
    const deadline = item.preparation_deadline
      ? new Date(`${item.preparation_deadline}T23:59:59`)
      : null;
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    return (
      item.material_status === "to_order" || (deadline && deadline <= soon)
    );
  });

  return (
    <section className="page">
      <div className="dashboard-hero">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Olá! Vamos organizar seu dia?</h1>
          <p>
            Clientes, serviços e próximos horários reunidos em uma visão clara.
          </p>
          <div className="hero-actions">
            <Link className="button button-light" to="/app/agenda/novo">
              ＋ Novo agendamento
            </Link>
            <Link className="button button-ghost" to="/app/clientes/novo">
              Cadastrar cliente
            </Link>
          </div>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <Spinner label="Preparando sua visão geral…" />
      ) : (
        <>
          <div className="metrics-grid">
            <article className="metric-card card">
              <span>Clientes</span>
              <strong>{data.clients.length}</strong>
              <small>contatos cadastrados</small>
            </article>
            <article className="metric-card card">
              <span>Serviços ativos</span>
              <strong>
                {data.services.filter((item) => item.active).length}
              </strong>
              <small>disponíveis na agenda</small>
            </article>
            <article className="metric-card card">
              <span>Atendimentos no mês</span>
              <strong>
                {
                  data.appointments.filter(
                    (item) => item.status !== "cancelled",
                  ).length
                }
              </strong>
              <small>sem contar cancelados</small>
            </article>
            <article className="metric-card card accent-card">
              <span>Recebido no mês</span>
              <strong>{formatCurrency(received)}</strong>
              <small>{formatCurrency(revenue)} em serviços concluídos</small>
            </article>
          </div>
          <div className="dashboard-grid dashboard-main-grid">
            <article className="card feature-card upcoming-card">
              <div className="card-title-row">
                <div>
                  <span>Agenda</span>
                  <h2>Próximos atendimentos</h2>
                </div>
                <Link to="/app/agenda">Ver agenda →</Link>
              </div>
              {upcoming.length === 0 ? (
                <div className="compact-empty">
                  <p>Nenhum atendimento próximo neste mês.</p>
                  <Link to="/app/agenda/novo">Marcar agora →</Link>
                </div>
              ) : (
                <ul className="appointment-list">
                  {upcoming.map((item) => (
                    <li key={item.id}>
                      <div className="appointment-date">
                        <strong>{new Date(item.starts_at).getDate()}</strong>
                        <span>
                          {new Date(item.starts_at).toLocaleDateString(
                            "pt-BR",
                            {
                              month: "short",
                            },
                          )}
                        </span>
                      </div>
                      <div>
                        <strong>{item.clients?.name}</strong>
                        <small>
                          {item.services?.name} · {statusLabels[item.status]}
                        </small>
                      </div>
                      <time>{formatDateTime(item.starts_at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </article>
            <aside className="card quick-actions">
              <span>Acesso rápido</span>
              <h2>O que deseja fazer?</h2>
              <Link to="/app/clientes/novo">＋ Cadastrar cliente</Link>
              <Link to="/app/servicos/novo">＋ Criar serviço</Link>
              <Link to="/app/agenda/novo">＋ Marcar atendimento</Link>
              <Link to="/app/relatorios">Ver relatórios</Link>
              <Link to="/app/configuracoes">Configurar meu negócio</Link>
            </aside>
          </div>
          {preparationAlerts.length > 0 && (
            <article className="card preparation-alerts">
              <div className="card-title-row">
                <div>
                  <span>Atenção necessária</span>
                  <h2>Materiais e prazos próximos</h2>
                </div>
                <Link to="/app/agenda">Abrir agenda →</Link>
              </div>
              <ul className="appointment-list">
                {preparationAlerts.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.clients?.name}</strong>
                      <small>
                        {workflowStages[item.workflow_stage]} ·{" "}
                        {materialStatuses[item.material_status]}
                      </small>
                    </div>
                    <div>
                      {item.preparation_deadline
                        ? `Preparar até ${new Date(`${item.preparation_deadline}T12:00:00`).toLocaleDateString("pt-BR")}`
                        : "Material ainda precisa ser solicitado"}
                    </div>
                    <Link to={`/app/agenda/${item.id}/editar`}>Revisar →</Link>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </>
      )}
      <p className="signed-in">
        Sessão protegida para <strong>{user.email}</strong>
      </p>
    </section>
  );
}
