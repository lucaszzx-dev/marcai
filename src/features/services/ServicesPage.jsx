import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { formatCurrency } from "../../lib/formatters";
import { deleteService, listServices, updateService } from "./serviceService";

export default function ServicesPage() {
  const location = useLocation();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);

  useEffect(() => {
    listServices()
      .then(setServices)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(service) {
    try {
      const updated = await updateService(service.id, {
        active: !service.active,
      });
      setServices((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function confirmDelete() {
    try {
      await deleteService(target.id);
      setServices((items) => items.filter((item) => item.id !== target.id));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setTarget(null);
    }
  }

  return (
    <section className="page">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Seu catálogo</p>
          <h1>Serviços</h1>
          <p>Defina o que você oferece, o preço e o tempo necessário.</p>
        </div>
        <Link className="button button-primary" to="/app/servicos/novo">
          ＋ Novo serviço
        </Link>
      </div>
      {location.state?.message && (
        <Alert type="success">{location.state.message}</Alert>
      )}
      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <Spinner label="Carregando serviços…" />
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h2>Cadastre seu primeiro serviço</h2>
          <p>
            Os serviços serão usados para calcular preço e duração dos
            agendamentos.
          </p>
          <Link className="button button-primary" to="/app/servicos/novo">
            Cadastrar serviço
          </Link>
        </div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Preço</th>
                <th>Duração</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td data-label="Serviço">
                    <strong>{service.name}</strong>
                    {service.description && (
                      <small>{service.description}</small>
                    )}
                  </td>
                  <td data-label="Preço">
                    {Number(service.price) === 0
                      ? "Sob consulta"
                      : formatCurrency(service.price)}
                  </td>
                  <td data-label="Duração">{service.duration_minutes} min</td>
                  <td data-label="Status">
                    <span
                      className={`status status-${service.active ? "active" : "inactive"}`}
                    >
                      {service.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <Link to={`/app/servicos/${service.id}/editar`}>
                      Editar
                    </Link>
                    <button onClick={() => toggle(service)}>
                      {service.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => setTarget(service)}>Excluir</button>
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
            <h2>Excluir {target.name}?</h2>
            <p>
              Se o serviço já estiver em um agendamento, ele será preservado.
              Nesse caso, desative-o.
            </p>
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
