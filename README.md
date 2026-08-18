# Software Medicina

Sistema de organização de consultório médico (agenda, pacientes, e futuramente prontuário e financeiro), pensado desde já para múltiplas clínicas (multi-tenant).

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Autenticação**: JWT, com `clinicId` embutido no token para isolar dados por clínica

## Estrutura

```
backend/    API REST (auth, pacientes, agenda)
frontend/   Aplicação web (login, cadastro de clínica, agenda do dia)
```

## Modelo de dados (multi-tenant)

Toda entidade clínica (`User`, `Patient`, `Appointment`, `AvailabilitySlot`, `SlotRequest`) tem um `clinicId`. Cada clínica cadastrada é isolada das demais — nenhuma query cruza `clinicId`, e o `clinicId` do usuário logado vem do JWT, nunca do cliente.

- `Clinic`: a clínica/consultório (tenant), com um `slug` único usado na agenda pública
- `User`: médico ou staff da clínica (roles: `ADMIN`, `DOCTOR`, `STAFF`)
- `Patient`: paciente cadastrado por uma clínica
- `Appointment`: consulta agendada, vinculada a paciente + médico, com checagem de conflito de horário
- `AvailabilitySlot`: horário livre que o médico abre na agenda para pacientes solicitarem
- `SlotRequest`: pedido de um paciente ("levantou a mão") para um horário livre; ao ser confirmado vira um `Appointment`

## Agenda pública e solicitações de horário

1. Na tela **Disponibilidade**, o médico/staff gera horários livres para um intervalo de dias, dias da semana e janela de horário (`POST /availability/bulk`).
2. A tela **Solicitações** mostra um link público (`/agendar/:slug`, rota `GET/POST /public/:slug/...`, sem autenticação) que pode ser copiado ou enviado por WhatsApp para o paciente.
3. O paciente abre o link, escolhe um médico (se houver mais de um) e "levanta a mão" para um ou mais horários livres, informando nome e telefone.
4. Na aba **Solicitações**, o consultório confirma um dos horários — isso cria a `Appointment`, marca o horário como ocupado e recusa automaticamente as demais opções concorrentes (mesmo horário ou mesma leva do paciente). Botões de "Ligar" e "WhatsApp" com o telefone do paciente facilitam o contato para avisar da confirmação.

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
3. Use a API diretamente (ou uma futura tela de cadastro) para criar pacientes via `POST /patients` e consultas via `POST /appointments`.

## Próximos módulos (roadmap sugerido)

1. ~~Agenda de consultas~~ (base pronta)
2. ~~Agenda pública + solicitação de horário pelo paciente~~ (base pronta)
3. Tela de cadastro/edição de pacientes no frontend
4. Prontuário eletrônico (histórico clínico, evolução por consulta)
5. Financeiro (pagamentos, convênios, recibos)
6. Convite de outros médicos/staff para a clínica (gestão de usuários)
7. Notificações automáticas de confirmação (e-mail ou WhatsApp Business API — hoje o contato é manual via link `wa.me`)
8. Planos de assinatura por clínica (billing do próprio SaaS)

## Notas de segurança

- Senhas são armazenadas com hash (`bcryptjs`), nunca em texto plano.
- Todas as rotas de dados (pacientes, agenda) exigem JWT válido e filtram por `clinicId` do token.
- `JWT_SECRET` deve ser um valor forte e exclusivo em produção — nunca reutilize o do `.env.example`.
