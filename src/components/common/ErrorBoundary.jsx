import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, details) {
    console.error("Erro não tratado no Marcaí", error, details);
  }

  render() {
    if (this.state.failed)
      return (
        <main className="center-page">
          <section className="config-card">
            <div className="brand brand-dark">
              marca<span>í</span>
            </div>
            <p className="eyebrow">Algo saiu do esperado</p>
            <h1>Não conseguimos abrir esta tela.</h1>
            <p>
              Seus dados continuam seguros. Atualize a página para tentar
              novamente.
            </p>
            <button
              className="button button-primary"
              onClick={() => window.location.reload()}
            >
              Atualizar página
            </button>
          </section>
        </main>
      );
    return this.props.children;
  }
}
