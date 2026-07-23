import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { formatCurrency } from "../../lib/formatters";
import { getPublicQuote, respondToQuote } from "./quoteService";

const labels = {
  sent: "Aguardando sua resposta",
  approved: "Orçamento aprovado",
  rejected: "Orçamento recusado",
  expired: "Orçamento vencido",
};

export default function PublicQuotePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    getPublicQuote(token)
      .then((value) => {
        if (!value) setError("Este orçamento não está disponível.");
        else setData(value);
      })
      .catch(() => setError("Não foi possível abrir este orçamento."))
      .finally(() => setLoading(false));
  }, [token]);
  const subtotal = useMemo(
    () => data?.items.reduce((sum, item) => sum + Number(item.total), 0) ?? 0,
    [data],
  );
  async function respond(response) {
    setSaving(true);
    setError("");
    try {
      await respondToQuote(token, response);
      setData((current) => ({
        ...current,
        quote: { ...current.quote, status: response },
      }));
    } catch (err) {
      setError(err.message || "Não foi possível registrar sua resposta.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <main className="center-page">
        <Spinner label="Abrindo orçamento…" />
      </main>
    );
  if (!data)
    return (
      <main className="center-page">
        <section className="config-card">
          <Link className="brand brand-dark" to="/">
            marca<span>í</span>
          </Link>
          <h1>Orçamento indisponível</h1>
          <Alert type="error">{error}</Alert>
        </section>
      </main>
    );
  const total = Math.max(0, subtotal - Number(data.quote.discount));
  return (
    <main className="public-quote">
      <article className="quote-document card">
        <header>
          <div>
            {data.business.logo_url ? (
              <img src={data.business.logo_url} alt="Logo" />
            ) : (
              <Link className="brand brand-dark" to="/">
                marca<span>í</span>
              </Link>
            )}
            <h1>{data.business.name}</h1>
            <p>{data.business.address}</p>
          </div>
          <div>
            <p className="eyebrow">Orçamento #{data.quote.number}</p>
            <strong className={`status status-${data.quote.status}`}>
              {labels[data.quote.status]}
            </strong>
            <p>Cliente: {data.client.name}</p>
            {data.quote.valid_until && (
              <p>
                Válido até{" "}
                {new Date(
                  `${data.quote.valid_until}T12:00:00`,
                ).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </header>
        {error && <Alert type="error">{error}</Alert>}
        <div className="quote-table">
          <div className="quote-table-head">
            <span>Descrição</span>
            <span>Qtd.</span>
            <span>Unitário</span>
            <span>Total</span>
          </div>
          {data.items.map((item, index) => (
            <div key={index}>
              <strong>{item.description}</strong>
              <span>{item.quantity}</span>
              <span>{formatCurrency(item.unit_price)}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
        <section className="quote-summary">
          <p>
            Subtotal <strong>{formatCurrency(subtotal)}</strong>
          </p>
          {Number(data.quote.discount) > 0 && (
            <p>
              Desconto <strong>− {formatCurrency(data.quote.discount)}</strong>
            </p>
          )}
          <p className="quote-grand-total">
            Total <strong>{formatCurrency(total)}</strong>
          </p>
        </section>
        {(data.quote.payment_terms || data.quote.notes) && (
          <section className="quote-conditions">
            {data.quote.payment_terms && (
              <p>
                <strong>Condições de pagamento:</strong>{" "}
                {data.quote.payment_terms}
              </p>
            )}
            {data.quote.notes && (
              <p>
                <strong>Observações:</strong> {data.quote.notes}
              </p>
            )}
          </section>
        )}
        <footer>
          <button
            className="button button-secondary"
            onClick={() => window.print()}
          >
            Imprimir ou salvar PDF
          </button>
          {data.quote.status === "sent" && (
            <div>
              <button
                className="button button-secondary"
                disabled={saving}
                onClick={() => respond("rejected")}
              >
                Recusar
              </button>
              <button
                className="button button-primary"
                disabled={saving}
                onClick={() => respond("approved")}
              >
                Aprovar orçamento
              </button>
            </div>
          )}
        </footer>
      </article>
    </main>
  );
}
