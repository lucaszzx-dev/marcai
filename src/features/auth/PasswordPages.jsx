import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Alert from "../../components/common/Alert";
import { friendlyError } from "../../lib/errors";
import { requestPasswordReset, updatePassword } from "./authService";

function PasswordShell({ eyebrow, title, text, children }) {
  return (
    <main className="center-page auth-soft-page">
      <section className="config-card password-card">
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
        {children}
      </section>
    </main>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <PasswordShell
      eyebrow="Acesso à conta"
      title="Recupere sua senha"
      text="Enviaremos um link seguro para você escolher uma nova senha."
    >
      {error && <Alert type="error">{error}</Alert>}
      {sent ? (
        <>
          <Alert type="success">
            Se este e-mail estiver cadastrado, o link chegará em instantes.
          </Alert>
          <Link className="button button-secondary" to="/login">
            Voltar ao login
          </Link>
        </>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
          <button className="button button-primary" disabled={loading}>
            {loading ? "Enviando…" : "Enviar link"}
          </button>
          <Link className="back-link centered-link" to="/login">
            ← Voltar ao login
          </Link>
        </form>
      )}
    </PasswordShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (password !== confirmation)
      return setError("As duas senhas precisam ser iguais.");
    setLoading(true);
    setError("");
    try {
      await updatePassword(password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(friendlyError(err));
      setLoading(false);
    }
  }
  return (
    <PasswordShell
      eyebrow="Segurança"
      title="Crie uma nova senha"
      text="Use pelo menos seis caracteres e não reutilize senhas importantes."
    >
      {error && <Alert type="error">{error}</Alert>}
      <form className="form-stack" onSubmit={submit}>
        <label>
          Nova senha
          <input
            type="password"
            minLength="6"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <label>
          Confirme a senha
          <input
            type="password"
            minLength="6"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
          />
        </label>
        <button className="button button-primary" disabled={loading}>
          {loading ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </PasswordShell>
  );
}
