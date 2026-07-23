# Marcaí

Aplicação web de agenda e gestão para profissionais autônomos e pequenos negócios. Reúne clientes, serviços, calendário, disponibilidade, agendamento público, orçamentos, finanças e relatórios, com isolamento de dados por usuário.

**Aplicação publicada:** [marcai-iota.vercel.app](https://marcai-iota.vercel.app)

## Tecnologias

- React 19, Vite e JavaScript
- React Router
- Supabase Auth, API e PostgreSQL
- CSS próprio e responsivo
- Vitest, ESLint e Prettier

## Instalação

Requer Node.js 20.19+ ou 22.12+.

```bash
npm install
copy .env.example .env
npm run dev
```

Configure no `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

Nunca use a chave `service_role` ou uma secret key no frontend.

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. No SQL Editor, execute uma vez cada arquivo de `supabase/migrations`, na ordem numérica (`001` até `012`).
3. Configure a URL local em **Authentication > URL Configuration**.
4. Ao publicar, adicione também a URL definitiva do site.

O banco cria perfis, clientes, serviços, agendamentos, horários de trabalho, bloqueios, orçamentos e registros financeiros. Inclui RLS, prevenção de choque de horários e funções seguras para agendamento e aprovação de orçamento.

## Como o banco funciona

O Marcaí usa PostgreSQL hospedado no Supabase. Os dados ficam na nuvem e continuam disponíveis mesmo quando o computador do desenvolvedor está desligado.

- `supabase/migrations`: cria e evolui tabelas, regras, índices e funções do banco.
- `src/lib/supabase.js`: inicia a conexão usando as variáveis do `.env`.
- Arquivos `*Service.js`: executam operações de leitura, criação, alteração e exclusão.
- Páginas e formulários React: chamam os services e apresentam os resultados.
- RLS (Row Level Security): garante no próprio banco que cada profissional acesse somente seus dados.

Fluxo simplificado:

```text
Tela React → service → API do Supabase → PostgreSQL
                                      → RLS confere o usuário
PostgreSQL → API do Supabase → service → tela atualizada
```

## Funcionalidades

- Cadastro, login, logout, sessão persistente e recuperação de senha
- Clientes com busca, paginação, histórico e WhatsApp manual
- Serviços fixos e solicitações personalizadas
- Agenda mensal, semanal e em lista, com proteção contra conflitos
- Etapas de execução, materiais e prazos de preparação
- Orçamentos com itens, desconto, link privado e aprovação do cliente
- Aprovação vinculada à agenda e ao valor do atendimento
- Controle de receitas, despesas e categorias personalizadas
- Dashboard e relatórios mensais com exportação CSV
- Perfil profissional, horários de trabalho, folgas e bloqueios
- Página pública com horários realmente disponíveis
- Landing page, política de privacidade e termos iniciais
- Layout responsivo para computador e celular

## Segurança

As tabelas usam Row Level Security: o banco confere o usuário autenticado em cada operação. O agendamento público usa funções PostgreSQL que mostram somente os dados necessários e validam disponibilidade no servidor.

O módulo financeiro apoia a gestão operacional, mas não substitui um sistema contábil ou uma consultoria profissional.

## Qualidade

```bash
npm run lint
npm test
npm run format:check
npm run build
```

## Publicação

O arquivo `vercel.json` prepara as rotas do React para publicação na Vercel. Depois do deploy, cadastre a URL pública no Supabase e altere a Site URL de autenticação.

WhatsApp automático, cobranças, revisão jurídica definitiva e validação com profissionais reais dependem de serviços e decisões externas.
