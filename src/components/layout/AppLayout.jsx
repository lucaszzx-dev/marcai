import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2v3m10-3v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a4 4 0 0 0 0-8m5 18v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-12 4h18M4 7h16a1 1 0 0 1 1 1v12H3V8a1 1 0 0 1 1-1Z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0-12v2m0 13v2m8.5-8.5h-2m-13 0h-2m14.5-6-1.4 1.4M7.4 16.6 6 18m12 0-1.4-1.4M7.4 7.4 6 6" />
    </svg>
  );
}
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  async function logout() {
    await signOut();
    navigate("/login", { replace: true });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/app">
          marca<span>í</span>
        </NavLink>
        <nav aria-label="Navegação principal">
          <NavLink end to="/app">
            <CalendarIcon />
            Visão geral
          </NavLink>
          <NavLink to="/app/clientes">
            <UsersIcon />
            Clientes
          </NavLink>
          <NavLink to="/app/servicos">
            <BriefcaseIcon />
            Serviços
          </NavLink>
          <NavLink to="/app/agenda">
            <CalendarIcon />
            Agenda
          </NavLink>
          <NavLink to="/app/relatorios">
            <ChartIcon />
            Relatórios
          </NavLink>
          <NavLink to="/app/financeiro">
            <ChartIcon />
            Financeiro
          </NavLink>
          <NavLink to="/app/orcamentos">
            <BriefcaseIcon />
            Orçamentos
          </NavLink>
          <NavLink to="/app/configuracoes">
            <SettingsIcon />
            Configurações
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <NavLink
            className="sidebar-profile-link"
            to="/app/configuracoes"
            title="Abrir configurações da conta"
          >
            <div className="avatar">{user?.email?.[0].toUpperCase()}</div>
            <div>
              <span>Conta profissional</span>
              <small>{user?.email}</small>
            </div>
          </NavLink>
          <button onClick={logout} title="Sair" aria-label="Sair da conta">
            ↗
          </button>
        </div>
      </aside>
      <header className="mobile-header">
        <NavLink className="brand brand-dark" to="/app">
          marca<span>í</span>
        </NavLink>
        <div className="mobile-header-actions">
          <NavLink to="/app/configuracoes" className="mobile-settings-link">
            <SettingsIcon />
            <span>Configurar</span>
          </NavLink>
          <button onClick={logout} className="link-button">
            Sair
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        <NavLink end to="/app">
          <CalendarIcon />
          <span>Início</span>
        </NavLink>
        <NavLink to="/app/clientes">
          <UsersIcon />
          <span>Clientes</span>
        </NavLink>
        <NavLink to="/app/servicos">
          <BriefcaseIcon />
          <span>Serviços</span>
        </NavLink>
        <NavLink to="/app/agenda">
          <CalendarIcon />
          <span>Agenda</span>
        </NavLink>
        <NavLink to="/app/financeiro">
          <ChartIcon />
          <span>Financeiro</span>
        </NavLink>
        <NavLink to="/app/orcamentos">
          <BriefcaseIcon />
          <span>Orçamentos</span>
        </NavLink>
        <NavLink to="/app/relatorios">
          <ChartIcon />
          <span>Relatórios</span>
        </NavLink>
      </nav>
    </div>
  );
}
