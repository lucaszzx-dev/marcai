# Marcaí

Plataforma web de agenda, orçamentos e gestão para profissionais autônomos e pequenos negócios.

## Sobre o projeto

Centraliza clientes, serviços, disponibilidade, agendamentos, orçamentos, finanças e relatórios em uma aplicação com isolamento de dados por usuário.

## Tecnologias

- React, JavaScript e Vite
- React Router
- Supabase Auth e PostgreSQL
- Vitest, ESLint e Prettier

## Funcionalidades

- Autenticação, sessão persistente e recuperação de senha
- Gestão de clientes, serviços e disponibilidade
- Agenda com proteção contra conflitos de horário
- Orçamentos, aprovação de clientes e registros financeiros
- Dashboard, relatórios mensais e exportação CSV
- Página pública de agendamento e layout responsivo

## Como executar

Requer Node.js 20.19+ ou 22.12+.

1. Crie um arquivo local de ambiente, sem versioná-lo.
2. Execute `npm install` e `npm run dev`.
3. Aplique as migrações em `supabase/migrations` na ordem numérica no projeto Supabase.

Variáveis de ambiente necessárias:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nunca use uma chave `service_role` ou secret key no frontend.

## Demonstração

[marcai-iota.vercel.app](https://marcai-iota.vercel.app)

## Status

MVP em desenvolvimento.
