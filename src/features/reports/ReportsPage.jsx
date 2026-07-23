import { useEffect, useMemo, useState } from "react";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { listAppointments } from "../appointments/appointmentService";
import { friendlyError } from "../../lib/errors";
import { formatCurrency } from "../../lib/formatters";

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    listAppointments({ from: start.toISOString(), to: end.toISOString() })
      .then(setItems)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [month]);
  const completed = items.filter((item) => item.status === "completed");
  const revenue = completed.reduce(
    (sum, item) => sum + Number(item.amount ?? item.services?.price ?? 0),
    0,
  );
  const received = items
    .filter((item) => item.payment_status === "paid")
    .reduce(
      (sum, item) => sum + Number(item.amount ?? item.services?.price ?? 0),
      0,
    );
  const contracted = items
    .filter((item) => ["confirmed", "completed"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const services = useMemo(
    () =>
      Object.values(
        items.reduce((result, item) => {
          const name = item.services?.name || "Pedido personalizado";
          result[name] ??= { name, count: 0, revenue: 0 };
          result[name].count += 1;
          if (item.status === "completed")
            result[name].revenue += Number(
              item.amount ?? item.services?.price ?? 0,
            );
          return result;
        }, {}),
      ).sort((a, b) => b.count - a.count),
    [items],
  );
  function exportCsv() {
    const rows = [
      ["Data", "Cliente", "Serviço", "Situação", "Valor"],
      ...items.map((item) => [
        new Date(item.starts_at).toLocaleString("pt-BR"),
        item.clients?.name,
        item.services?.name || "Pedido personalizado",
        item.status,
        item.amount ?? item.services?.price,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `marcai-${month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return (
    <section className="page">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Resultados</p>
          <h1>Relatórios</h1>
          <p>Acompanhe atendimentos e valores realizados.</p>
        </div>
        <div className="report-actions">
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <button
            className="button button-secondary"
            onClick={exportCsv}
            disabled={!items.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <Spinner label="Calculando resultados…" />
      ) : (
        <>
          <div className="metrics-grid">
            <article className="metric-card card">
              <span>Agendamentos</span>
              <strong>{items.length}</strong>
              <small>no período</small>
            </article>
            <article className="metric-card card">
              <span>Concluídos</span>
              <strong>{completed.length}</strong>
              <small>atendimentos</small>
            </article>
            <article className="metric-card card">
              <span>Cancelamentos</span>
              <strong>
                {items.filter((item) => item.status === "cancelled").length}
              </strong>
              <small>no período</small>
            </article>
            <article className="metric-card card accent-card">
              <span>Valor contratado</span>
              <strong>{formatCurrency(contracted)}</strong>
              <small>confirmado ou concluído</small>
            </article>
            <article className="metric-card card accent-card">
              <span>Valor recebido</span>
              <strong>{formatCurrency(received)}</strong>
              <small>{formatCurrency(revenue)} em serviços concluídos</small>
            </article>
          </div>
          <div className="card report-card">
            <h2>Serviços mais agendados</h2>
            {services.length === 0 ? (
              <p className="muted">Sem dados neste período.</p>
            ) : (
              services.map((service) => (
                <div className="service-ranking" key={service.name}>
                  <div>
                    <strong>{service.name}</strong>
                    <small>{service.count} agendamento(s)</small>
                  </div>
                  <strong>{formatCurrency(service.revenue)}</strong>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
