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

Toda entidade clínica (`User`, `Patient`, `Appointment`) tem um `clinicId`. Cada clínica cadastrada é isolada das demais — nenhuma query cruza `clinicId`, e o `clinicId` do usuário logado vem do JWT, nunca do cliente.

- `Clinic`: a clínica/consultório (tenant)
- `User`: médico ou staff da clínica (roles: `ADMIN`, `DOCTOR`, `STAFF`)
- `Patient`: paciente cadastrado por uma clínica
- `Appointment`: consulta agendada, vinculada a paciente + médico, com checagem de conflito de horário

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
2. Tela de cadastro/edição de pacientes no frontend
3. Prontuário eletrônico (histórico clínico, evolução por consulta)
4. Financeiro (pagamentos, convênios, recibos)
5. Convite de outros médicos/staff para a clínica (gestão de usuários)
6. Notificações/lembretes de consulta (e-mail ou WhatsApp)
7. Planos de assinatura por clínica (billing do próprio SaaS)

## Notas de segurança

- Senhas são armazenadas com hash (`bcryptjs`), nunca em texto plano.
- Todas as rotas de dados (pacientes, agenda) exigem JWT válido e filtram por `clinicId` do token.
- `JWT_SECRET` deve ser um valor forte e exclusivo em produção — nunca reutilize o do `.env.example`.
