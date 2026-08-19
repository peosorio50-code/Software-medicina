# Referência regulatória

Extraído da seção 4 (Requisitos regulatórios e legais) do documento de pesquisa `plataformaconsultoriomedico.docx`, data-base agosto de 2026.

Software médico no Brasil não é um CRUD com tema de saúde: normas determinam como o dado é assinado, por quanto tempo é guardado, quem pode acessá-lo, em que formato é trocado e o que deve ser registrado sobre o próprio uso do sistema. Assinatura digital, trilha de auditoria e isolamento seguro entre clínicas (multi-tenant) não são recursos que se acrescentam no fim — precisam estar na arquitetura desde o início.

**As datas, prazos e versões de norma abaixo devem ser reconferidos nas fontes oficiais antes de qualquer implementação que dependa deles** — o cenário normativo muda com frequência.

## Panorama por tema

| Tema | Norma de referência | O que o software precisa fazer |
| --- | --- | --- |
| Prontuário eletrônico | CFM 1.821/2007 e Manual SBIS-CFM | Autenticação individual, perfis, auditoria imutável, criptografia, backup, versionamento de registro |
| Guarda de prontuário | Lei 13.787/2018 | Reter por no mínimo 20 anos; bloquear exclusão definitiva |
| Substituição do papel | CFM 1.821/2007 (NGS2) | Assinatura digital ICP-Brasil no registro clínico |
| Dados pessoais | Lei 13.709/2018 (LGPD) | Base legal, DPO, RIPD, direitos do titular, resposta a incidente, isolamento entre clínicas |
| Telemedicina | Lei 14.510/2022 e CFM 2.314/2022 | Consentimento explícito armazenado no registro, sigilo na transmissão, registro em prontuário |
| Documentos eletrônicos | CFM 2.299/2021 | Campos obrigatórios e plataforma inscrita no CRM |
| Assinatura | MP 2.200-2/2001 e Lei 14.063/2020 | Suporte a assinatura qualificada (ICP-Brasil) e avançada |
| Controlados | RDC 471/2021 e RDC 1.000/2025 | Assinatura qualificada, data de assinatura como emissão, vedação de emissão por terceiros, integração ao SNCR |
| Convênios | Padrão TISS (ANS) | Geração e validação de XML na versão vigente, controle de lote e glosas |
| Fiscal (PF) | IN RFB 2.240/2024 | Controle e alerta de emissão do recibo eletrônico por pagamento |
| Interoperabilidade | RNDS / HL7 FHIR | Modelo de dados aderente a FHIR e terminologias padronizadas |
| Inteligência artificial | CFM 2.454/2026 e RDC 657/2022 | Registro do uso de IA em prontuário, revisão humana obrigatória, transparência ao paciente |
| Publicidade | CFM 2.336/2023 | Exibir nome e CRM em toda peça pública; anonimato em imagens de pacientes |

## Decisões de produto que essas normas implicam

- **Nível de garantia de segurança**: operar como sistema complementar ao papel (NGS1) ou como substituto legal do prontuário (NGS2, exige assinatura digital ICP-Brasil). Essa escolha muda a arquitetura de autenticação, assinatura e auditoria — deve ser decidida antes da primeira linha de código.
- **Prescrição de medicamentos controlados**: exige vínculo com o Sistema Nacional de Controle de Receituários (SNCR) da Anvisa. Construir do zero não é recomendado; a integração com um provedor consolidado é o caminho indicado pelo documento de pesquisa.
- **LGPD**: dado de saúde é dado pessoal sensível (art. 5º, II c/c art. 11). No modelo SaaS, a clínica é controladora e a plataforma é operadora — o produto precisa entregar à clínica os recursos técnicos para atender pedidos de titulares (exportação, retificação, relatório de acessos).
- **Isolamento multi-tenant**: vazamento entre clínicas é o pior incidente possível em produto multilocatário. Precisa ser garantido em nível de banco (ex. row-level security), não apenas na camada de aplicação.
- **Retenção**: prontuário por no mínimo 20 anos (Lei 13.787/2018); documentos fiscais por 5 anos. Exclusão física de dado clínico deve ser bloqueada por regra de negócio.

## Regras invioláveis derivadas (ver também `CLAUDE.md`)

- Nenhuma rota executa exclusão física de dado clínico.
- Nenhuma escrita em entidade clínica ocorre sem registro em auditoria.
- O identificador da clínica nunca vem do corpo da requisição; é resolvido do contexto autenticado (JWT).
- Evolução clínica assinada não é atualizada; correção gera nova versão vinculada e datada.
- Documento assinado só pode ser emitido pelo próprio profissional autenticado.
- Saída de modelo de linguagem (IA) nunca é gravada em prontuário sem confirmação explícita do médico.
- Nenhum dado clínico em log, em mensagem de erro ou em ambiente de desenvolvimento.
