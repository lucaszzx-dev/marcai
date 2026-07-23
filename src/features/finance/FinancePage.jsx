import { useEffect, useMemo, useState } from "react";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { formatCurrency } from "../../lib/formatters";
import { useAuth } from "../auth/AuthContext";
import { listAppointments } from "../appointments/appointmentService";
import {
  createCategory,
  createEntry,
  deleteCategory,
  deleteEntry,
  listCategories,
  listEntries,
  updateCategory,
} from "./financeService";

const suggested = [
  ["Venda de serviço", "income"],
  ["Material", "expense"],
  ["Comissão", "expense"],
  ["Transporte", "expense"],
  ["Taxas", "expense"],
  ["Despesa geral", "expense"],
];
const today = new Date().toISOString().slice(0, 10);

export default function FinancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [category, setCategory] = useState({ name: "", kind: "expense" });
  const [entry, setEntry] = useState({
    category_id: "",
    appointment_id: "",
    description: "",
    amount: "",
    entry_date: today,
    status: "paid",
    recurring: false,
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const start = `${month}-01`;
    const endDate = new Date(`${start}T12:00:00`);
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);
    setLoading(true);
    Promise.all([listCategories(), listEntries(start, end), listAppointments()])
      .then(([categoryData, entryData, appointmentData]) => {
        setCategories(categoryData);
        setEntries(entryData);
        setAppointments(appointmentData);
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [month]);

  const totals = useMemo(() => {
    const paid = entries.filter((item) => item.status === "paid");
    const income = paid
      .filter((item) => item.financial_categories.kind === "income")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = paid
      .filter((item) => item.financial_categories.kind === "expense")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    return { income, expense, profit: income - expense };
  }, [entries]);

  async function addCategory(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createCategory(
        { name: category.name.trim(), kind: category.kind },
        user.id,
      );
      setCategories((items) => [...items, created]);
      setCategory({ name: "", kind: "expense" });
      setMessage("Categoria criada.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function addSuggestions() {
    setSaving(true);
    try {
      const existing = new Set(
        categories.map((item) => `${item.kind}:${item.name}`),
      );
      const created = [];
      for (const [name, kind] of suggested) {
        if (!existing.has(`${kind}:${name}`))
          created.push(await createCategory({ name, kind }, user.id));
      }
      setCategories((items) => [...items, ...created]);
      setMessage("Sugestões adicionadas. Você pode desativar as que não usar.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function addEntry(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const created = await createEntry(
        {
          ...entry,
          amount: Number(entry.amount.replace(",", ".")),
          appointment_id: entry.appointment_id || null,
          notes: entry.notes.trim() || null,
        },
        user.id,
      );
      if (entry.entry_date.startsWith(month))
        setEntries((items) => [created, ...items]);
      setEntry((current) => ({
        ...current,
        description: "",
        amount: "",
        notes: "",
      }));
      setMessage("Lançamento financeiro salvo.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(item) {
    try {
      await deleteCategory(item.id);
      setCategories((all) => all.filter((entry) => entry.id !== item.id));
      setMessage("Categoria excluída.");
      setError("");
    } catch (err) {
      if (err.code === "23503")
        setError(
          "Esta categoria já possui lançamentos. Desative-a para preservar o histórico financeiro.",
        );
      else setError(friendlyError(err));
    }
  }

  function exportCsv() {
    const rows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Situação", "Valor"],
      ...entries.map((item) => [
        item.entry_date,
        item.financial_categories.kind === "income" ? "Receita" : "Despesa",
        item.financial_categories.name,
        item.description,
        item.status === "paid" ? "Realizado" : "Previsto",
        item.amount,
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
    link.download = `marcai-financeiro-${month}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (loading) return <Spinner label="Carregando financeiro…" />;
  return (
    <section className="page page-wide finance-page">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Gestão financeira</p>
          <h1>Financeiro</h1>
          <p>Personalize categorias e acompanhe receitas, despesas e lucro.</p>
        </div>
        <div className="report-actions">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            className="button button-secondary"
            onClick={exportCsv}
            disabled={!entries.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}
      <div className="metrics-grid">
        <article className="metric-card card">
          <span>Receitas realizadas</span>
          <strong>{formatCurrency(totals.income)}</strong>
        </article>
        <article className="metric-card card">
          <span>Despesas realizadas</span>
          <strong>{formatCurrency(totals.expense)}</strong>
        </article>
        <article
          className={`metric-card card ${totals.profit >= 0 ? "accent-card" : "finance-loss"}`}
        >
          <span>Lucro líquido</span>
          <strong>{formatCurrency(totals.profit)}</strong>
        </article>
      </div>
      <div className="finance-grid">
        <form className="card settings-section" onSubmit={addEntry}>
          <h2>Novo lançamento</h2>
          <div className="form-grid">
            <label>
              Categoria
              <select
                value={entry.category_id}
                onChange={(e) =>
                  setEntry({ ...entry, category_id: e.target.value })
                }
                required
              >
                <option value="">Selecione</option>
                {categories
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} —{" "}
                      {item.kind === "income" ? "Receita" : "Despesa"}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Valor (R$)
              <input
                value={entry.amount}
                onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
                inputMode="decimal"
                required
              />
            </label>
            <label className="full">
              Descrição
              <input
                value={entry.description}
                onChange={(e) =>
                  setEntry({ ...entry, description: e.target.value })
                }
                required
              />
            </label>
            <label>
              Data
              <input
                type="date"
                value={entry.entry_date}
                onChange={(e) =>
                  setEntry({ ...entry, entry_date: e.target.value })
                }
                required
              />
            </label>
            <label>
              Situação
              <select
                value={entry.status}
                onChange={(e) => setEntry({ ...entry, status: e.target.value })}
              >
                <option value="paid">Realizado/pago</option>
                <option value="planned">Previsto</option>
              </select>
            </label>
            <label className="full">
              Atendimento relacionado{" "}
              <span className="optional">(opcional)</span>
              <select
                value={entry.appointment_id}
                onChange={(e) =>
                  setEntry({ ...entry, appointment_id: e.target.value })
                }
              >
                <option value="">Despesa ou receita geral</option>
                {appointments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.clients?.name} —{" "}
                    {item.services?.name ||
                      item.request_description ||
                      "Pedido personalizado"}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox full">
              <input
                type="checkbox"
                checked={entry.recurring}
                onChange={(e) =>
                  setEntry({ ...entry, recurring: e.target.checked })
                }
              />{" "}
              Lançamento recorrente
            </label>
            <label className="full">
              Observações
              <textarea
                rows="3"
                value={entry.notes}
                onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={saving || !categories.length}
            >
              Salvar lançamento
            </button>
          </div>
        </form>
        <section className="card settings-section">
          <div className="card-title-row">
            <div>
              <h2>Categorias</h2>
              <p className="muted">
                Crie somente as categorias úteis para seu negócio.
              </p>
            </div>
            <button
              className="button button-secondary"
              onClick={addSuggestions}
              disabled={saving}
            >
              Adicionar sugestões
            </button>
          </div>
          <form className="category-form" onSubmit={addCategory}>
            <input
              placeholder="Ex.: Produtos descartáveis"
              value={category.name}
              onChange={(e) =>
                setCategory({ ...category, name: e.target.value })
              }
              required
            />
            <select
              value={category.kind}
              onChange={(e) =>
                setCategory({ ...category, kind: e.target.value })
              }
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
            <button className="button button-primary" disabled={saving}>
              Criar
            </button>
          </form>
          <div className="category-list">
            {categories.map((item) => (
              <div key={item.id}>
                <span className={`finance-kind ${item.kind}`}>
                  {item.kind === "income" ? "Receita" : "Despesa"}
                </span>
                <strong>{item.name}</strong>
                <span className="category-actions">
                  <button
                    onClick={async () => {
                      const updated = await updateCategory(item.id, {
                        active: !item.active,
                      });
                      setCategories((all) =>
                        all.map((entry) =>
                          entry.id === updated.id ? updated : entry,
                        ),
                      );
                    }}
                  >
                    {item.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    className="category-delete"
                    onClick={() => removeCategory(item)}
                  >
                    Excluir
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="card table-wrap finance-history">
        <h2>Movimentações do mês</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Situação</th>
              <th>Valor</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((item) => (
              <tr key={item.id}>
                <td data-label="Data">
                  {new Date(`${item.entry_date}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                  )}
                </td>
                <td data-label="Descrição">
                  <strong>{item.description}</strong>
                  {item.source === "appointment" && (
                    <small>Gerado automaticamente pelo atendimento</small>
                  )}
                  {item.appointments?.clients?.name && (
                    <small>{item.appointments.clients.name}</small>
                  )}
                </td>
                <td data-label="Categoria">{item.financial_categories.name}</td>
                <td data-label="Situação">
                  {item.status === "paid" ? "Realizado" : "Previsto"}
                </td>
                <td
                  data-label="Valor"
                  className={item.financial_categories.kind}
                >
                  {item.financial_categories.kind === "expense" ? "− " : "+ "}
                  {formatCurrency(item.amount)}
                </td>
                <td className="table-actions">
                  {item.source === "appointment" ? (
                    <small>Edite o pagamento na Agenda</small>
                  ) : (
                    <button
                      onClick={async () => {
                        await deleteEntry(item.id);
                        setEntries((all) =>
                          all.filter((entry) => entry.id !== item.id),
                        );
                      }}
                    >
                      Excluir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && (
          <p className="muted finance-empty">Nenhuma movimentação neste mês.</p>
        )}
      </section>
    </section>
  );
}
