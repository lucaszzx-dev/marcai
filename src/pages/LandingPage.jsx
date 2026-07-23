import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <main className="landing">
      <header className="landing-header">
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
        </nav>
        <div>
          {user ? (
            <Link className="button button-primary" to="/app">
              Abrir minha agenda
            </Link>
          ) : (
            <>
              <Link className="landing-login" to="/login">
                Entrar
              </Link>
              <Link className="button button-primary" to="/cadastro">
                Começar agora
              </Link>
            </>
          )}
        </div>
      </header>
      <section className="landing-hero">
        <div>
          <p className="eyebrow">Agenda profissional, sem complicação</p>
          <h1>Seu tempo organizado. Seu negócio em movimento.</h1>
          <p>
            Clientes, serviços, horários e resultados em um só lugar. Feito para
            profissionais autônomos que querem atender melhor.
          </p>
          <div className="landing-actions">
            <Link
              className="button button-primary"
              to={user ? "/app" : "/cadastro"}
            >
              {user ? "Ir para minha agenda" : "Criar minha agenda grátis"}
            </Link>
            <a className="button button-secondary" href="#como-funciona">
              Conhecer o Marcaí
            </a>
          </div>
          <small>Comece em poucos minutos · Seus dados protegidos</small>
        </div>
        <div className="landing-preview card">
          <div className="preview-top">
            <span>Visão geral</span>
            <span>Hoje</span>
          </div>
          <div className="preview-metrics">
            <div>
              <small>Clientes</small>
              <strong>48</strong>
            </div>
            <div>
              <small>Hoje</small>
              <strong>6</strong>
            </div>
            <div>
              <small>Realizado</small>
              <strong>R$ 420</strong>
            </div>
          </div>
          <div className="preview-event">
            <time>09:00</time>
            <div>
              <strong>Mariana Alves</strong>
              <small>Corte e finalização</small>
            </div>
            <span>Confirmado</span>
          </div>
          <div className="preview-event">
            <time>11:30</time>
            <div>
              <strong>João Pedro</strong>
              <small>Atendimento</small>
            </div>
            <span>Pendente</span>
          </div>
        </div>
      </section>
      <section className="landing-section" id="recursos">
        <p className="eyebrow">Tudo no lugar certo</p>
        <h2>
          Menos mensagens soltas.
          <br />
          Mais controle da sua rotina.
        </h2>
        <div className="landing-features">
          <article>
            <span>01</span>
            <h3>Agenda visual</h3>
            <p>
              Veja sua semana, confirme atendimentos e evite horários
              duplicados.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Clientes próximos</h3>
            <p>Contatos, observações e todo o histórico de atendimentos.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Resultados claros</h3>
            <p>Acompanhe serviços realizados e exporte os dados do mês.</p>
          </article>
        </div>
      </section>
      <section className="how-section" id="como-funciona">
        <div>
          <p className="eyebrow">Simples de verdade</p>
          <h2>Pronto para trabalhar em três passos.</h2>
        </div>
        <ol>
          <li>
            <strong>Configure</strong>
            <span>Cadastre serviços e horários.</span>
          </li>
          <li>
            <strong>Compartilhe</strong>
            <span>Envie sua página de agendamento.</span>
          </li>
          <li>
            <strong>Atenda</strong>
            <span>Acompanhe tudo pela agenda.</span>
          </li>
        </ol>
      </section>
      <footer className="landing-footer">
        <Link className="brand" to="/">
          marca<span>í</span>
        </Link>
        <p>Organização para quem vive do próprio trabalho.</p>
        <div>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos de uso</Link>
        </div>
      </footer>
    </main>
  );
}
