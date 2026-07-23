import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { useAuth } from "../auth/AuthContext";
import { createClient, getClient, updateClient } from "./clientService";
const emptyForm = {
  name: "",
  phone: "",
  email: "",
  birth_date: "",
  tags: "",
  preferences: "",
  notes: "",
};
export default function ClientForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!editing) return;
    getClient(id)
      .then((data) =>
        setForm({
          name: data.name,
          phone: data.phone ?? "",
          email: data.email ?? "",
          birth_date: data.birth_date ?? "",
          tags: (data.tags ?? []).join(", "),
          preferences: data.preferences ?? "",
          notes: data.notes ?? "",
        }),
      )
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = {
      ...form,
      birth_date: form.birth_date || null,
      tags: form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      preferences: form.preferences.trim() || null,
    };
    try {
      if (editing) await updateClient(id, values);
      else await createClient(values, user.id);
      navigate("/app/clientes", {
        replace: true,
        state: {
          message: editing
            ? "Cliente atualizado com sucesso."
            : "Cliente cadastrado com sucesso.",
        },
      });
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  }
  if (loading) return <Spinner label="Carregando cliente…" />;
  return (
    <section className="page narrow">
      <div className="page-heading">
        <div>
          <Link className="back-link" to="/app/clientes">
            ← Voltar para clientes
          </Link>
          <p className="eyebrow">Relacionamento</p>
          <h1>{editing ? "Editar cliente" : "Novo cliente"}</h1>
          <p>
            {editing
              ? "Atualize os dados de contato e as observações."
              : "Registre os dados essenciais para começar o atendimento."}
          </p>
        </div>
      </div>
      {error && <Alert type="error">Não foi possível salvar: {error}</Alert>}
      <form className="card client-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            Nome completo
            <input
              name="name"
              value={form.name}
              onChange={update}
              required
              autoFocus
            />
          </label>
          <label>
            Telefone
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              type="tel"
              placeholder="(11) 99999-9999"
            />
          </label>
          <label>
            E-mail
            <input
              name="email"
              value={form.email}
              onChange={update}
              type="email"
              placeholder="cliente@email.com"
            />
          </label>
          <label>
            Data de nascimento
            <input
              name="birth_date"
              value={form.birth_date}
              onChange={update}
              type="date"
            />
          </label>
          <label>
            Etiquetas
            <input
              name="tags"
              value={form.tags}
              onChange={update}
              placeholder="VIP, recorrente, indicação"
            />
          </label>
          <label className="full">
            Preferências do cliente
            <textarea
              name="preferences"
              value={form.preferences}
              onChange={update}
              rows="3"
              placeholder="Preferências de atendimento, produtos ou horários."
            />
          </label>
          <label className="full">
            Observações
            <textarea
              name="notes"
              value={form.notes}
              onChange={update}
              rows="5"
              placeholder="Preferências, cuidados ou informações relevantes para o atendimento."
            />
          </label>
        </div>
        <div className="form-actions">
          <Link className="button button-secondary" to="/app/clientes">
            Cancelar
          </Link>
          <button className="button button-primary" disabled={saving}>
            {saving
              ? "Salvando…"
              : editing
                ? "Salvar alterações"
                : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </section>
  );
}
