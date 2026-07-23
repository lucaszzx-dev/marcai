import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { formatCurrency, formatDateTime } from "../../lib/formatters";
import {
  deleteAppointment,
  listAppointments,
  updateAppointment,
} from "./appointmentService";
import { statusLabels } from "./appointmentStatus";
import { materialStatuses, workflowStages } from "./workflow";

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

function weekDays(anchor) {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function monthDays(anchor) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function sameDay(value, date) {
  const candidate = new Date(value);
  return candidate.toDateString() === date.toDateString();
}

export default function AppointmentsPage() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const month = useMemo(() => monthDays(anchor), [anchor]);

  useEffect(() => {
    setLoading(true);
    const options = {};
    if (view === "week" || view === "month") {
      const visibleDays = view === "month" ? month : days;
      options.from = visibleDays[0].toISOString();
      const end = new Date(visibleDays[visibleDays.length - 1]);
      end.setDate(end.getDate() + 1);
      options.to = end.toISOString();
    }
    listAppointments(options)
      .then(setItems)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [days, month, view]);

  function moveWeek(amount) {
    setAnchor((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  }

  function moveMonth(amount) {
    setAnchor((current) => {
      const next = new Date(current);
      next.setDate(1);
      next.setMonth(next.getMonth() + amount);
      return next;
    });
  }

  async function changeStatus(item, status) {
    try {
      const updated = await updateAppointment(item.id, { status });
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function confirmDelete() {
    try {
      await deleteAppointment(target.id);
      setItems((current) => current.filter((item) => item.id !== target.id));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setTarget(null);
    }
  }

  return (
    <section className="page page-wide">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Sua rotina</p>
          <h1>Agenda</h1>
          <p>Planeje o mês, organize materiais e acompanhe cada atendimento.</p>
        </div>
        <Link className="button button-primary" to="/app/agenda/novo">
          ＋ Novo agendamento
        </Link>
      </div>
      {location.state?.message && (
        <Alert type="success">{location.state.message}</Alert>
      )}
      {error && <Alert type="error">{error}</Alert>}

      <div className="calendar-toolbar card">
        <div className="segmented" aria-label="Visualização da agenda">
          <button
            className={view === "month" ? "active" : ""}
            onClick={() => setView("month")}
          >
            Mês
          </button>
          <button
            className={view === "week" ? "active" : ""}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
          >
            Lista
          </button>
        </div>
        {view === "month" && (
          <div className="week-navigation">
            <button onClick={() => moveMonth(-1)} aria-label="Mês anterior">
              ←
            </button>
            <button onClick={() => setAnchor(new Date())}>Hoje</button>
            <strong>
              {anchor.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <button onClick={() => moveMonth(1)} aria-label="Próximo mês">
              →
            </button>
          </div>
        )}
        {view === "week" && (
          <div className="week-navigation">
            <button onClick={() => moveWeek(-1)} aria-label="Semana anterior">
              ←
            </button>
            <button onClick={() => setAnchor(new Date())}>Hoje</button>
            <strong>
              {days[0].toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })}{" "}
              –{" "}
              {days[6].toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </strong>
            <button onClick={() => moveWeek(1)} aria-label="Próxima semana">
              →
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Spinner label="Carregando agenda…" />
      ) : items.length === 0 && view === "list" ? (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h2>Nenhum atendimento neste período</h2>
          <p>Escolha outro período ou marque um novo horário.</p>
          <Link className="button button-primary" to="/app/agenda/novo">
            Marcar atendimento
          </Link>
        </div>
      ) : view === "month" ? (
        <div className="month-calendar">
          <div className="month-weekdays" aria-hidden="true">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="month-grid">
            {month.map((day) => {
              const dayItems = items.filter((item) =>
                sameDay(item.starts_at, day),
              );
              const outside = day.getMonth() !== anchor.getMonth();
              return (
                <section
                  className={`month-day ${outside ? "outside" : ""} ${sameDay(new Date(), day) ? "today" : ""}`}
                  key={day.toISOString()}
                >
                  <header>
                    <strong>{day.getDate()}</strong>
                    {dayItems.length > 0 && <span>{dayItems.length}</span>}
                  </header>
                  <div>
                    {dayItems.map((item) => (
                      <Link
                        className={`calendar-event event-${item.status}`}
                        to={`/app/agenda/${item.id}/editar`}
                        key={item.id}
                      >
                        <time>
                          {new Date(item.starts_at).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </time>
                        <strong>{item.clients?.name}</strong>
                        <small>
                          {item.services?.name || "Pedido personalizado"}
                        </small>
                        <small>{workflowStages[item.workflow_stage]}</small>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="week-calendar">
          {days.map((day) => (
            <section
              className={`day-column ${sameDay(new Date(), day) ? "today" : ""}`}
              key={day.toISOString()}
            >
              <header>
                <span>
                  {day.toLocaleDateString("pt-BR", { weekday: "short" })}
                </span>
                <strong>{day.getDate()}</strong>
              </header>
              <div className="day-appointments">
                {items.filter((item) => sameDay(item.starts_at, day)).length ===
                0 ? (
                  <small className="free-day">Livre</small>
                ) : (
                  items
                    .filter((item) => sameDay(item.starts_at, day))
                    .map((item) => (
                      <Link
                        className={`calendar-event event-${item.status}`}
                        to={`/app/agenda/${item.id}/editar`}
                        key={item.id}
                      >
                        <time>
                          {new Date(item.starts_at).toLocaleTimeString(
                            "pt-BR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </time>
                        <strong>{item.clients?.name}</strong>
                        <small>
                          {item.services?.name || "Pedido personalizado"}
                        </small>
                        <small>{workflowStages[item.workflow_stage]}</small>
                      </Link>
                    ))
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Cliente</th>
                <th>Serviço</th>
                <th>Valor</th>
                <th>Preparação</th>
                <th>Situação</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Data e hora">
                    <strong>{formatDateTime(item.starts_at)}</strong>
                    <small>até {formatDateTime(item.ends_at)}</small>
                  </td>
                  <td data-label="Cliente">
                    <strong>{item.clients?.name}</strong>
                    {item.clients?.phone && <small>{item.clients.phone}</small>}
                    {item.clients?.email && <small>{item.clients.email}</small>}
                  </td>
                  <td data-label="Serviço">
                    {item.services?.name || "Pedido personalizado"}
                    {item.request_description && (
                      <small>{item.request_description}</small>
                    )}
                  </td>
                  <td data-label="Valor">
                    {item.amount == null
                      ? "A definir"
                      : formatCurrency(item.amount)}
                  </td>
                  <td data-label="Preparação">
                    <strong>
                      {workflowStages[item.workflow_stage] || "Não informada"}
                    </strong>
                    <small>
                      {materialStatuses[item.material_status] ||
                        "Material não informado"}
                    </small>
                    {item.preparation_deadline && (
                      <small>
                        Prazo:{" "}
                        {new Date(
                          `${item.preparation_deadline}T12:00:00`,
                        ).toLocaleDateString("pt-BR")}
                      </small>
                    )}
                  </td>
                  <td data-label="Situação">
                    <select
                      aria-label={`Situação de ${item.clients?.name}`}
                      value={item.status}
                      onChange={(event) =>
                        changeStatus(item, event.target.value)
                      }
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-actions">
                    {item.clients?.phone && (
                      <a
                        href={`https://wa.me/55${item.clients.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${item.clients.name}! Seu atendimento de ${item.services?.name || "pedido personalizado"} está marcado para ${formatDateTime(item.starts_at)}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lembrar
                      </a>
                    )}
                    {item.clients?.email && (
                      <a
                        href={`mailto:${item.clients.email}?subject=${encodeURIComponent("Sua solicitação de orçamento")}`}
                      >
                        E-mail
                      </a>
                    )}
                    <Link to={`/app/agenda/${item.id}/editar`}>Editar</Link>
                    <button onClick={() => setTarget(item)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {target && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setTarget(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>Excluir este agendamento?</h2>
            <p>O horário será removido permanentemente.</p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => setTarget(null)}
              >
                Cancelar
              </button>
              <button className="button button-danger" onClick={confirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
