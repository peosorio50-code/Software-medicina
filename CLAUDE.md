# Software Médicina — contexto do projeto

Plataforma web de gestão para consultórios médicos no Brasil (agenda, pacientes e, futuramente,
prontuário eletrônico e financeiro), multi-tenant desde a base — cada clínica cadastrada (`Clinic`)
isola os seus próprios `User`, `Patient` e `Appointment` via `clinicId`.

Este contexto vem da pesquisa de mercado/regulatória em `docs/regulatory-reference.md` e do backlog
funcional em `docs/backlog.md` (extraídos de `plataformaconsultoriomedico.docx`). Há também um rascunho
visual estático em `docs/index.html` (publicado via GitHub Pages) que define a identidade visual do
produto — nome "Meu Consultório", paleta verde, tipografia (Fraunces + IBM Plex Sans/Mono) e o padrão
de tema claro/escuro. O frontend real (`frontend/`) segue essa identidade.

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

## Regras invioláveis

- Nenhuma rota executa exclusão física de dado clínico (paciente, consulta, evolução).
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
