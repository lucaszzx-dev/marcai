import { Link, useLocation } from "react-router-dom";

export default function LegalPage() {
  const privacy = useLocation().pathname === "/privacidade";
  return (
    <main className="legal-page">
      <header>
        <Link className="brand brand-dark" to="/">
          marca<span>í</span>
        </Link>
        <Link to="/">← Voltar</Link>
      </header>
      <article>
        <p className="eyebrow">Informações legais</p>
        <h1>{privacy ? "Política de Privacidade" : "Termos de Uso"}</h1>
        <p className="legal-date">Versão inicial — julho de 2026</p>
        {privacy ? (
          <>
            <h2>Quais dados são tratados</h2>
            <p>
              O Marcaí armazena os dados informados na conta, os contatos
              profissionais cadastrados e as informações necessárias para
              organizar serviços e agendamentos.
            </p>
            <h2>Para que os dados são usados</h2>
            <p>
              Os dados são usados somente para autenticação, funcionamento da
              agenda, relacionamento com clientes e apresentação de indicadores
              ao titular da conta.
            </p>
            <h2>Armazenamento e segurança</h2>
            <p>
              As informações são armazenadas no Supabase e protegidas por regras
              que separam os dados de cada conta. Senhas são processadas pelo
              serviço de autenticação e não ficam visíveis no aplicativo.
            </p>
            <h2>Direitos e contato</h2>
            <p>
              O usuário poderá solicitar correção ou exclusão de seus dados.
              Antes do lançamento comercial, esta política deverá receber os
              dados de contato do responsável pelo produto e revisão jurídica.
            </p>
          </>
        ) : (
          <>
            <h2>Uso do serviço</h2>
            <p>
              O Marcaí é uma ferramenta de organização de clientes, serviços e
              horários. O usuário é responsável pelas informações cadastradas e
              pela comunicação com seus clientes.
            </p>
            <h2>Disponibilidade</h2>
            <p>
              Esta é uma versão em desenvolvimento e poderá receber alterações.
              Recursos externos, como WhatsApp e e-mail, dependem dos
              respectivos fornecedores.
            </p>
            <h2>Responsabilidades</h2>
            <p>
              O usuário deve manter sua senha protegida e usar a plataforma de
              forma lícita. Antes do lançamento comercial, estes termos deverão
              passar por revisão jurídica.
            </p>
          </>
        )}
      </article>
    </main>
  );
}
