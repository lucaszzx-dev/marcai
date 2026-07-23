import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Alert from "../../components/common/Alert";
import Spinner from "../../components/common/Spinner";
import { friendlyError } from "../../lib/errors";
import { deleteClient, listClients } from "./clientService";
export default function ClientsPage() {
  const location = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filteredClients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return clients;
    return clients.filter((client) =>
      [client.name, client.phone, client.email]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase("pt-BR").includes(term)),
    );
  }, [clients, search]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const visibleClients = filteredClients.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err) => setError(friendlyError(err)))
      .finally(() => setLoading(false));
  }, []);
  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteClient(target.id);
      setClients((current) =>
        current.filter((client) => client.id !== target.id),
      );
      setTarget(null);
    } catch (err) {
      setError(friendlyError(err));
      setTarget(null);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <section className="page">
      <div className="page-heading row">
        <div>
          <p className="eyebrow">Sua base de contatos</p>
          <h1>Clientes</h1>
          <p>Centralize as informações de quem confia no seu trabalho.</p>
        </div>
        <Link className="button button-primary" to="/app/clientes/novo">
          ＋ Novo cliente
        </Link>
      </div>
      {location.state?.message && (
        <Alert type="success">{location.state.message}</Alert>
      )}
      {error && (
        <Alert type="error">
          Não foi possível carregar os clientes: {error}
        </Alert>
      )}
      {!loading && clients.length > 0 && (
        <div className="list-toolbar card">
          <label>
            <span className="sr-only">Buscar clientes</span>
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome, telefone ou e-mail…"
            />
          </label>
          <span>{filteredClients.length} cliente(s)</span>
        </div>
      )}
      {loading ? (
        <Spinner label="Carregando clientes…" />
      ) : clients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✦</div>
          <h2>Seu primeiro cliente começa aqui</h2>
          <p>
            Cadastre os dados de contato para manter tudo organizado desde o
            primeiro atendimento.
          </p>
          <Link className="button button-primary" to="/app/clientes/novo">
            Cadastrar primeiro cliente
          </Link>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="empty-state compact-empty-state">
          <h2>Nenhum cliente encontrado</h2>
          <p>Tente buscar por outro nome, telefone ou e-mail.</p>
        </div>
      ) : (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/app/clientes/${client.id}`}>
                        <strong>{client.name}</strong>
                      </Link>
                      {client.notes && <small>{client.notes}</small>}
                    </td>
                    <td>{client.phone || "—"}</td>
                    <td>{client.email || "—"}</td>
                    <td className="table-actions">
                      {client.phone && (
                        <a
                          href={`https://wa.me/55${client.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}
                      <Link to={`/app/clientes/${client.id}/editar`}>
                        Editar
                      </Link>
                      <button onClick={() => setTarget(client)}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <nav className="pagination" aria-label="Paginação">
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                ← Anterior
              </button>
              <span>
                Página {page} de {pageCount}
              </span>
              <button
                disabled={page === pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Próxima →
              </button>
            </nav>
          )}
        </>
      )}
      {target && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => !deleting && setTarget(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="delete-title">Excluir {target.name}?</h2>
            <p>
              Se ele possuir agendamentos, o histórico será preservado e a
              exclusão será impedida.
            </p>
            <div className="form-actions">
              <button
                className="button button-secondary"
                onClick={() => setTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="button button-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
