# Software Medicina

Sistema de organização de consultório médico (agenda, pacientes, e futuramente prontuário e financeiro), pensado desde já para múltiplas clínicas (multi-tenant).

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Autenticação**: JWT, com `clinicId` embutido no token para isolar dados por clínica

## Estrutura

```
backend/    API REST (auth, pacientes, agenda, disponibilidade/solicitações, agenda pública)
frontend/   Aplicação web (login, cadastro de clínica, agenda do dia, pacientes, disponibilidade,
            solicitações, agenda pública para o paciente)
docs/       Referência regulatória, backlog funcional e rascunho visual do produto
```

## Design e tema

O frontend segue a identidade visual definida em `docs/index.html` (rascunho estático publicado via
GitHub Pages): paleta verde, tipografia Fraunces (títulos) + IBM Plex Sans (corpo) + IBM Plex Mono
(números), e suporte a **modo claro e escuro** com fundo branco/preto — alternável pelo usuário (ícone
de sol/lua na barra lateral) e com preferência salva em `localStorage`, respeitando `prefers-color-scheme`
no primeiro acesso. Os design tokens ficam em `frontend/src/index.css`.

## Modelo de dados (multi-tenant)

Toda entidade clínica (`User`, `Patient`, `Appointment`, `AvailabilitySlot`, `SlotRequest`) tem um `clinicId`. Cada clínica cadastrada é isolada das demais — nenhuma query cruza `clinicId`, e o `clinicId` do usuário logado vem do JWT, nunca do cliente.

- `Clinic`: a clínica/consultório (tenant), com um `slug` único usado na agenda pública
- `User`: médico ou staff da clínica (roles: `ADMIN`, `DOCTOR`, `STAFF`)
- `Patient`: paciente cadastrado por uma clínica
- `Appointment`: consulta agendada, vinculada a paciente + médico, com checagem de conflito de horário
- `AvailabilitySlot`: horário livre que o médico abre na agenda para pacientes solicitarem (AG-09)
- `SlotRequest`: pedido de um paciente ("levantou a mão") para um horário livre; ao ser confirmado vira um `Appointment`

## Agenda pública e solicitação de horário (AG-09)

1. Na tela **Disponibilidade**, o médico/staff gera horários livres para um intervalo de dias, dias da
   semana e janela de horário (`POST /availability/bulk`).
2. A tela **Solicitações** mostra um link público (`/agendar/:slug`, rotas `GET/POST /public/:slug/...`,
   sem autenticação) que pode ser copiado ou enviado por WhatsApp para o paciente.
3. O paciente abre o link, escolhe um médico (se houver mais de um) e "levanta a mão" para um ou mais
   horários livres, informando nome e telefone — sem precisar de conta.
4. Na aba **Solicitações**, o consultório confirma um dos horários — isso cria a `Appointment`, marca o
   horário como ocupado e recusa automaticamente as demais opções concorrentes (mesmo horário ou mesma
   leva do paciente). Botões de "Ligar" e "WhatsApp" com o telefone do paciente facilitam o contato para
   avisar da confirmação.

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL rodando localmente (ou via Docker)

### Backend

```bash
cd backend
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npm install
npm run prisma:migrate      # cria as tabelas
npm run dev                 # API em http://localhost:3333
```

### Frontend

```bash
cd frontend
cp .env.example .env        # aponta para a URL da API
npm install
npm run dev                 # app em http://localhost:5173
```

### Fluxo básico para testar

1. Abra o frontend, clique em "Cadastre sua clínica" e crie a primeira clínica + usuário admin.
2. Você será redirecionado para a Agenda (vazia).
3. Cadastre pacientes pela tela de Pacientes ("+ Novo paciente") e consultas via `POST /appointments`
   (ainda sem tela dedicada de criação de consulta).
4. Em **Disponibilidade**, gere horários livres; em **Solicitações**, copie o link público e abra em
   outra aba (sem login) para simular um paciente levantando a mão por um horário.

## Próximos módulos (roadmap sugerido)

Ver backlog completo com prioridades (MoSCoW) e identificadores por módulo em `docs/backlog.md`.

1. ~~Agenda de consultas~~ (base pronta)
2. ~~Tela de cadastro/edição de pacientes no frontend~~ (cadastro e busca prontos; edição/mesclagem
   de duplicados ainda não)
3. ~~Agendamento online pelo paciente (AG-09)~~ (base pronta: disponibilidade, agenda pública,
   solicitações)
4. Prontuário eletrônico (histórico clínico, evolução por consulta) — ver `docs/regulatory-reference.md`
   para os requisitos de NGS1/NGS2 e assinatura antes de iniciar
5. Financeiro (pagamentos, convênios, recibos)
6. Convite de outros médicos/staff para a clínica (gestão de usuários)
7. Notificações automáticas de confirmação (e-mail ou WhatsApp Business API — hoje o contato é manual
   via link `wa.me`)
8. Planos de assinatura por clínica (billing do próprio SaaS)

## Notas de segurança

- Senhas são armazenadas com hash (`bcryptjs`), nunca em texto plano.
- Todas as rotas de dados (pacientes, agenda) exigem JWT válido e filtram por `clinicId` do token.
- `JWT_SECRET` deve ser um valor forte e exclusivo em produção — nunca reutilize o do `.env.example`.
