import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import { friendlyError } from "../../lib/errors";
import { signIn, signUp } from "./authService";

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    password: "",
  });
  const [status, setStatus] = useState({
    loading: false,
    error: "",
    success: "",
  });
  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  async function submit(event) {
    event.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    try {
      if (isRegister) {
        const data = await signUp(form);
        if (!data.session)
          setStatus({
            loading: false,
            error: "",
            success:
              "Cadastro realizado. Confira seu e-mail para confirmar a conta.",
          });
        else navigate("/app", { replace: true });
      } else {
        await signIn(form);
        navigate("/app", { replace: true });
      }
    } catch (error) {
      setStatus({ loading: false, error: friendlyError(error), success: "" });
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <p className="eyebrow">{isRegister ? "Comece agora" : "Boas-vindas"}</p>
        <h1 id="auth-title">
          {isRegister ? "Crie sua conta profissional" : "Entre na sua agenda"}
        </h1>
        <p className="muted">
          {isRegister
            ? "Organize seus clientes hoje e prepare seu negócio para crescer."
            : "Seus clientes e sua rotina em um só lugar."}
        </p>
        {status.error && <Alert type="error">{status.error}</Alert>}
        {status.success && <Alert type="success">{status.success}</Alert>}
        <form onSubmit={submit} className="form-stack">
          {isRegister && (
            <>
              <label>
                Nome completo
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={update}
                  required
                  autoComplete="name"
                />
              </label>
              <label>
                Nome do negócio <span className="optional">(opcional)</span>
                <input
                  name="businessName"
                  value={form.businessName}
                  onChange={update}
                  autoComplete="organization"
                />
              </label>
            </>
          )}
          <label>
            E-mail
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              required
              autoComplete="email"
            />
          </label>
          {!isRegister && (
            <Link className="forgot-link" to="/esqueci-a-senha">
              Esqueci minha senha
            </Link>
          )}
          <label>
            Senha
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={update}
              required
              minLength="6"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </label>
          <button className="button button-primary" disabled={status.loading}>
            {status.loading
              ? "Aguarde…"
              : isRegister
                ? "Criar conta"
                : "Entrar"}
          </button>
        </form>
        <p className="auth-switch">
          {isRegister ? "Já tem uma conta?" : "Ainda não tem uma conta?"}{" "}
          <Link to={isRegister ? "/login" : "/cadastro"}>
            {isRegister ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
      </section>
      <aside className="auth-aside">
        <div>
          <p className="eyebrow">Seu trabalho, bem cuidado</p>
          <h2>Mais organização para você. Mais atenção para seus clientes.</h2>
          <p>
            Uma base simples e segura para acompanhar cada relacionamento
            profissional.
          </p>
        </div>
      </aside>
    </main>
  );
}
