# Software Médicina — contexto do projeto

Plataforma web de gestão para consultórios médicos no Brasil (agenda, pacientes e, futuramente,
prontuário eletrônico e financeiro), multi-tenant desde a base — cada clínica cadastrada (`Clinic`)
isola os seus próprios `User`, `Patient` e `Appointment` via `clinicId`.

Este contexto vem da pesquisa de mercado/regulatória em `docs/regulatory-reference.md` e do backlog
funcional em `docs/backlog.md` (extraídos de `plataformaconsultoriomedico.docx`). Há também um rascunho
visual estático em `docs/index.html` (publicado via GitHub Pages) que define a identidade visual do
produto — nome "Meu Consultório", paleta verde, tipografia (Fraunces + IBM Plex Sans/Mono) e o padrão
de tema claro/escuro. O frontend real (`frontend/`) segue essa identidade.

## Paridade entre o rascunho visual e o app real (regra de trabalho)

O repositório contém duas representações do mesmo produto, e elas **não** se atualizam
uma a partir da outra:

- `docs/index.html` — rascunho visual estático, arquivo único, dados fictícios, publicado
  via GitHub Pages em https://peosorio50-code.github.io/Software-medicina/. **É por onde o
  dono do produto enxerga o sistema**, já que o app real ainda não tem deploy.
- `frontend/` + `backend/` — o produto real, que só roda depois de conectar banco e chaves.

**Toda mudança de funcionalidade ou de interface entra nos dois lados na mesma tarefa.**
Uma tela que existe só num dos lados não é trabalho em andamento, é defeito: quem revisa vê
apenas o rascunho publicado e conclui, erradamente, que o produto já faz aquilo. Foi assim
que as cinco funcionalidades de IA passaram a existir no rascunho e no backend, mas não na
tela do app real.

Ao terminar qualquer alteração, rode `./scripts/check-paridade.sh` e relate na resposta:

1. o que mudou em `docs/index.html`;
2. o que mudou em `frontend/` e `backend/`;
3. o que ficou só de um lado — e por quê.

Se a pessoa pedir a mudança só num dos lados, faça só nele, mas **diga explicitamente na
resposta que o outro lado não foi alterado**.

### Exceções legítimas (as únicas)

- **Infraestrutura sem tela**: migração de banco, índice, variável de ambiente, refatoração
  interna, teste. Não há o que espelhar no rascunho.
- **Recurso represado por decisão ainda não tomada** (ex.: NGS1 vs NGS2 para o Prontuário).
  Nesse caso os **dois** lados mostram o mesmo placeholder "Próximo módulo" — nunca um lado
  funcionando e o outro vazio.
- O rascunho não tem login, banco nem rede: ele simula com dado fictício, e isso é o
  esperado. Simular é correto; **omitir a tela não é**.
- O rascunho nunca promete ação que o produto real não executa (não existe envio por
  WhatsApp: os dois lados copiam a mensagem para a área de transferência).

## Público-alvo e decisões já tomadas

- **Público-alvo inicial**: médico autônomo com consultório particular (menor complexidade, não exige
  faturamento TISS de convênio desde o início). Clínicas com convênio ficam para uma fase posterior.
- **Nível de garantia de segurança**: ainda não decidido entre NGS1 (complementar ao papel) e NGS2
  (substituto legal do prontuário, exige assinatura ICP-Brasil) — decisão a ser tomada antes de
  implementar o módulo de Prontuário/assinatura de documentos.
- **Prescrição de controlados**: quando implementada, integrar a um provedor consolidado (vínculo
  obrigatório com o SNCR da Anvisa) em vez de construir do zero.
- **Modelo de precificação**: preço fixo por clínica (não por profissional) é a lacuna competitiva
  identificada na pesquisa — evitar cobrança por profissional se/quando houver billing do próprio SaaS.

## Stack

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL. Autenticação JWT com `clinicId`
  embutido no token.
- **Frontend**: React + TypeScript + Vite, React Router, CSS puro com variáveis de tema (sem framework
  de UI). Ver `frontend/src/index.css` para os design tokens (claro/escuro).
- Identificadores de requisito do backlog (`AG-01`, `PAC-03`, `NF-SEC-05`, ...) são o vocabulário do
  projeto — use-os em branches, commits e testes sempre que a mudança implementar ou alterar um
  requisito listado em `docs/backlog.md`.

## Regras de arquitetura

Estas quatro regras são estruturais: valem para qualquer código novo e **não mudam sem
pedido explícito do dono do produto**. Elas existem para manter uma propriedade específica —
o servidor é um produto independente da tela, capaz de atender também um app de celular ou
outro cliente qualquer sem reescrita.

1. **O backend só responde JSON.** Nenhuma rota renderiza HTML, serve arquivo estático ou
   monta tela. Sem motor de template (EJS, Pug, Handlebars) no projeto.
2. **Regra de negócio, validação e verificação de permissão ficam no backend.** O frontend
   nunca é a única barreira: validar no formulário é conveniência para o usuário, não
   segurança. Toda entrada é revalidada no servidor (Zod) e toda autorização é decidida lá.
3. **O frontend fala com o servidor apenas por `frontend/src/api.ts`.** Nenhum `fetch`,
   `axios` ou `EventSource` solto em componente ou página. O endereço do servidor e o
   cabeçalho de autorização são montados num lugar só.
4. **Autenticação por token no header (`Authorization: Bearer`), nunca por cookie de sessão.**
   É o que permite que um cliente não-navegador (app de celular) use a mesma API sem adaptação.

Ver também, em **Regras invioláveis**, a regra do `clinicId` — ela é a contrapartida de
multi-tenancy destas quatro.

### Onde o código ainda não cumpre (estado em 2026-08-28)

Registrado aqui porque uma regra escrita como se já valesse induz ao erro de quem lê depois:

- **Regra 2, parte de permissão — não vale hoje.** A checagem de papel (`ADMIN`/`DOCTOR`/`STAFF`)
  existe só em `backend/src/routes/users.ts` e `backend/src/routes/clinic.ts`. Nos outros 11
  grupos de rotas (agenda, pacientes, financeiro, documentos, notas, IA) não há verificação
  alguma: qualquer usuário autenticado da clínica passa. Não é o frontend segurando sozinho —
  é ausência de barreira. O isolamento **entre** clínicas continua íntegro; falta a separação
  **dentro** da clínica. Fechar isso é trabalho espalhado por 11 arquivos, não um ajuste pontual.
- **Regra 3 — uma violação conhecida.** `frontend/src/pages/Settings.tsx` chama `fetch` direto
  em `/clinic/export`, remontando URL e cabeçalho por conta própria. A causa é uma limitação
  do `api.ts`: ele só sabe tratar JSON e não tem como pedir um arquivo para download. Enquanto
  isso não for resolvido, toda funcionalidade nova de exportar ou baixar documento tende a
  repetir a violação — a correção é dar ao `api.ts` um método de download, não abrir exceção.

As regras 1 e 4 são cumpridas integralmente hoje.

## Regras invioláveis

- Nenhuma rota executa exclusão física de dado clínico (paciente, consulta, evolução).
  **Hoje esta regra é violada** (levantamento de 2026-08-28). Há `prisma.*.delete()` — apagar
  de verdade, sem volta — nestas rotas, e as três primeiras são exatamente o que a regra
  nomeia:
    - `patients.ts` → `Patient` ("paciente")
    - `appointments.ts` → `Appointment` ("consulta")
    - `documents.ts` → `PatientDocument` (documento emitido para um paciente)
    - `invoices.ts`, `finance.ts` (categoria, recorrência e transação) → não é dado clínico,
      mas tem dever de retenção fiscal; decidir caso a caso.
    - `documentTemplates.ts` e `users.ts` → modelo e usuário, fora do escopo desta regra.
  Corrigir exige inativação lógica no schema (campo de arquivamento + filtro nas consultas),
  não só trocar o verbo da rota.
- Nenhuma escrita em entidade clínica ocorre sem registro em auditoria (a trilha de auditoria ainda
  precisa ser implementada — ver `NF-SEC-04` e `ADM` em `docs/backlog.md`).
- O `clinicId` nunca vem do corpo da requisição; é sempre resolvido do JWT autenticado
  (`req.auth.clinicId`), nunca de um parâmetro ou payload enviado pelo cliente.
- Evolução clínica assinada não é atualizada; correção gera nova versão vinculada e datada.
- Documento assinado só pode ser emitido pelo próprio profissional autenticado.
- Saída de modelo de linguagem (IA) nunca é gravada em prontuário sem confirmação explícita do médico.
- Nenhum dado clínico (nome de paciente, conteúdo de evolução, documento) em log, mensagem de erro ou
  ambiente de desenvolvimento — usar dados sintéticos.

Ver `docs/regulatory-reference.md` para o porquê de cada regra (CFM, LGPD, telemedicina, etc.).

## Definição de pronto para um requisito do backlog

- Teste automatizado cobrindo o caminho feliz e, quando aplicável, a violação de isolamento entre
  clínicas (um tenant não pode enxergar dado de outro).
- Validação de entrada no servidor, não apenas no formulário do frontend.
- Comportamento verificado em viewport móvel (o médico usa o celular entre atendimentos; a secretária
  usa desktop).
- Referência ao identificador do requisito na mensagem do commit.
