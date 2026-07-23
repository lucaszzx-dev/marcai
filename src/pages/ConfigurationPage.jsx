import { Link } from "react-router-dom";
import Alert from "../components/common/Alert";
export default function ConfigurationPage() {
  return (
    <main className="center-page">
      <section className="config-card">
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <p className="eyebrow">Configuração necessária</p>
        <h1>Conecte seu projeto ao Supabase</h1>
        <Alert>
          O app está pronto, mas precisa das variáveis de ambiente para
          autenticar usuários e salvar clientes.
        </Alert>
        <ol>
          <li>
            Copie <code>.env.example</code> para <code>.env</code>.
          </li>
          <li>
            Informe <code>VITE_SUPABASE_URL</code> e{" "}
            <code>VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>
            Execute, em ordem, os arquivos SQL <code>001</code> e{" "}
            <code>002</code> da pasta <code>supabase/migrations</code>.
          </li>
          <li>Reinicie o servidor de desenvolvimento.</li>
        </ol>
        <p>Consulte o README para o passo a passo completo.</p>
      </section>
    </main>
  );
}
