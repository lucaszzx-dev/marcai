import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { parsePrice } from "../../lib/formatters";
import { useAuth } from "../auth/AuthContext";
import { createService, getService, updateService } from "./serviceService";

const empty = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "60",
  active: true,
};
export default function ServiceForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    getService(id)
      .then((data) => {
        setPriceOnRequest(Number(data.price) === 0);
        setForm({ ...data, price: String(data.price).replace(".", ",") });
      })
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]:
        event.target.type === "checkbox"
          ? event.target.checked
          : event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    const price = priceOnRequest ? 0 : parsePrice(form.price);
    if (Number.isNaN(price))
      return setError("Informe um preço válido, como 60,00.");
    setSaving(true);
    setError("");
    const values = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      duration_minutes: Number(form.duration_minutes),
      active: form.active,
    };
    try {
      if (editing) await updateService(id, values);
      else await createService(values, user.id);
      navigate("/app/servicos", {
        replace: true,
        state: {
          message: editing
            ? "Serviço atualizado com sucesso."
            : "Serviço cadastrado com sucesso.",
        },
      });
    } catch (err) {
      setError(friendlyError(err));
      setSaving(false);
    }
  }
  if (loading) return <Spinner label="Carregando serviço…" />;
  return (
    <section className="page narrow">
      <div className="page-heading">
        <Link className="back-link" to="/app/servicos">
          ← Voltar para serviços
        </Link>
        <p className="eyebrow">Catálogo</p>
        <h1>{editing ? "Editar serviço" : "Novo serviço"}</h1>
        <p>
          Informe um preço fixo ou marque “Preço sob consulta” quando o valor
          depender de medidas, local ou orçamento.
        </p>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <form className="card client-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            Nome
            <input
              name="name"
              value={form.name}
              onChange={update}
              required
              minLength="2"
              autoFocus
            />
          </label>
          <label>
            Preço (R$)
            <input
              name="price"
              value={form.price}
              onChange={update}
              required={!priceOnRequest}
              disabled={priceOnRequest}
              inputMode="decimal"
              placeholder="60,00"
            />
          </label>
          <label>
            Duração em minutos
            <input
              name="duration_minutes"
              value={form.duration_minutes}
              onChange={update}
              required
              type="number"
              min="5"
              max="1440"
              step="5"
            />
          </label>
          <label className="checkbox full quote-checkbox">
            <input
              type="checkbox"
              checked={priceOnRequest}
              onChange={(event) => setPriceOnRequest(event.target.checked)}
            />
            <span>
              <strong>Preço sob consulta</strong>
              <small>
                Use quando o valor depender de medidas, distância, material ou
                avaliação.
              </small>
            </span>
          </label>
          <label className="full">
            Descrição
            <textarea
              name="description"
              value={form.description ?? ""}
              onChange={update}
              rows="4"
            />
          </label>
          <label className="checkbox full">
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={update}
            />{" "}
            Serviço disponível para novos agendamentos
          </label>
        </div>
        <div className="form-actions">
          <Link className="button button-secondary" to="/app/servicos">
            Cancelar
          </Link>
          <button className="button button-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar serviço"}
          </button>
        </div>
      </form>
    </section>
  );
}
