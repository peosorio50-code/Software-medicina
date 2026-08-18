# Backlog funcional

Extraído da seção 5 (Escopo funcional) e 6.1/6.2 (Requisitos não funcionais) do documento de pesquisa `plataformaconsultoriomedico.docx`.

Prioridade segue MoSCoW: **Essencial** compõe o MVP, **Importante** entra na sequência imediata, **Desejável** fica para amadurecimento. Os identificadores (ex. `AG-01`) são o vocabulário do projeto — use-os em branches, commits e testes.

## AG — Agenda

| ID | Requisito | Prioridade |
| --- | --- | --- |
| AG-01 | Visões de dia, semana e mês, com filtro por profissional, local e tipo de atendimento | Essencial |
| AG-02 | Agendamento com duração configurável por tipo de consulta (primeira consulta, retorno, procedimento) | Essencial |
| AG-03 | Bloqueio de horários, férias, feriados e intervalos recorrentes | Essencial |
| AG-04 | Estados do agendamento: agendado, confirmado, aguardando, em atendimento, atendido, faltou, cancelado | Essencial |
| AG-05 | Encaixe e arrastar para remarcar, com registro em auditoria de quem alterou | Essencial |
| AG-06 | Confirmação ativa: mensagem que exige resposta do paciente e atualiza o estado automaticamente | Essencial |
| AG-07 | Lista de espera com oferta automática da vaga liberada por cancelamento | Importante |
| AG-08 | Política de cancelamento configurável, com prazo mínimo e registro de descumprimento | Importante |
| AG-09 | Agendamento online pelo paciente, com regras de disponibilidade definidas pelo profissional | Importante |
| AG-10 | Recorrência para tratamentos em série e retorno programado com lembrete | Desejável |
| AG-11 | Indicador de risco de falta por paciente, baseado no histórico de comparecimento | Desejável |

## PAC — Pacientes e cadastro

| ID | Requisito | Prioridade |
| --- | --- | --- |
| PAC-01 | Cadastro com identificação, contato, endereço, convênio e responsável legal quando menor | Essencial |
| PAC-02 | Busca rápida por nome, CPF, telefone ou data de nascimento, com tolerância a erro de digitação | Essencial |
| PAC-03 | Detecção e mesclagem de cadastros duplicados | Importante |
| PAC-04 | Pré-cadastro pelo próprio paciente via link enviado antes da consulta | Importante |
| PAC-05 | Campo de nome social, obrigatório para aderência às normas vigentes | Essencial |
| PAC-06 | Registro de consentimentos (LGPD, telemedicina, uso de imagem) com data, versão do texto e evidência | Essencial |
| PAC-07 | Importação de base de outro sistema via planilha, com validação e relatório de erros | Importante |
| PAC-08 | Linha do tempo do paciente unificando consultas, documentos, exames e comunicações | Importante |
| PAC-09 | Marcadores e segmentação para campanhas de retorno e prevenção | Desejável |

## PEP — Prontuário eletrônico

| ID | Requisito | Prioridade |
| --- | --- | --- |
| PEP-01 | Registro de atendimento com anamnese, exame físico, hipótese diagnóstica, conduta e evolução | Essencial |
| PEP-02 | Modelos configuráveis por especialidade e por médico, com campos estruturados e texto livre | Essencial |
| PEP-03 | Versionamento: nenhuma evolução assinada pode ser sobrescrita; correção gera retificação datada e vinculada | Essencial |
| PEP-04 | Trilha de auditoria de leitura e escrita, com usuário, data, hora e origem do acesso | Essencial |
| PEP-05 | Codificação diagnóstica por CID-10, com busca por texto | Essencial |
| PEP-06 | Anexos de exames e imagens com pré-visualização e busca por data e tipo | Essencial |
| PEP-07 | Comparativo de evoluções anteriores lado a lado durante o atendimento | Importante |
| PEP-08 | Campos de acompanhamento longitudinal (peso, pressão, glicemia) com gráfico de evolução | Importante |
| PEP-09 | Assinatura digital do registro clínico com certificado ICP-Brasil | Importante |
| PEP-10 | Bloqueio de exclusão definitiva; encerramento de cadastro usa arquivamento com retenção legal | Essencial |
| PEP-11 | Modo de atendimento em tela única, sem navegação entre abas durante a consulta | Importante |
| PEP-12 | Exportação do prontuário completo do paciente em formato legível e estruturado | Importante |

## DOC — Prescrição e documentos

| ID | Requisito | Prioridade |
| --- | --- | --- |
| DOC-01 | Emissão de receita simples, atestado, laudo, relatório, solicitação de exames e declaração de comparecimento | Essencial |
| DOC-02 | Campos obrigatórios conforme a norma do CFM sobre documentos médicos eletrônicos | Essencial |
| DOC-03 | Assinatura eletrônica avançada e qualificada, com escolha conforme o tipo de documento | Essencial |
| DOC-04 | Integração com plataforma de prescrição digital de mercado para controlados e base de medicamentos | Essencial |
| DOC-05 | Envio ao paciente pelos canais suportados, com registro do envio e do canal utilizado | Essencial |
| DOC-06 | Modelos de documento personalizáveis por médico, com timbre e dados profissionais | Importante |
| DOC-07 | Histórico de documentos emitidos por paciente, com reemissão e verificação de autenticidade | Importante |
| DOC-08 | Renovação de receita de uso contínuo a partir da prescrição anterior | Importante |
| DOC-09 | Bloqueio de emissão de documento assinado por usuário que não seja o próprio prescritor | Essencial |

## TEL — Telemedicina

| ID | Requisito | Prioridade |
| --- | --- | --- |
| TEL-01 | Sala de vídeo por link, sem instalação, funcionando em navegador móvel | Importante |
| TEL-02 | Coleta e armazenamento do consentimento específico para atendimento remoto antes do início | Essencial |
| TEL-03 | Prontuário acessível na mesma tela durante a chamada | Importante |
| TEL-04 | Emissão e envio de documentos sem sair do atendimento | Importante |
| TEL-05 | Sala de espera virtual com aviso ao médico quando o paciente entra | Desejável |
| TEL-06 | Registro automático da modalidade de teleatendimento no prontuário | Essencial |
| TEL-07 | Compartilhamento de tela e de arquivos durante a consulta | Desejável |
| TEL-08 | Verificação de identidade do paciente antes do início do atendimento | Importante |

## FIN — Financeiro

| ID | Requisito | Prioridade |
| --- | --- | --- |
| FIN-01 | Lançamento automático de contas a receber a partir do atendimento realizado | Essencial |
| FIN-02 | Tabela de preços por procedimento, com valores diferenciados por convênio | Essencial |
| FIN-03 | Registro de recebimento por forma de pagamento, incluindo Pix, cartão e parcelamento | Essencial |
| FIN-04 | Contas a pagar e fluxo de caixa por período | Importante |
| FIN-05 | Relatório de inadimplência com régua de cobrança automatizada | Importante |
| FIN-06 | Controle de repasse por profissional, com percentual configurável | Importante |
| FIN-07 | Link de pagamento enviado ao paciente, com baixa automática na conciliação | Importante |
| FIN-08 | Checklist e alerta de emissão do recibo eletrônico de serviços de saúde para pagamentos de pessoa física | Importante |
| FIN-09 | Fechamento mensal com exportação para a contabilidade | Importante |
| FIN-10 | Integração com emissor de nota fiscal de serviço eletrônica | Desejável |

## CON — Convênios e faturamento TISS

| ID | Requisito | Prioridade |
| --- | --- | --- |
| CON-01 | Cadastro de operadoras, planos, tabelas de procedimentos e regras de cobrança | Importante |
| CON-02 | Geração de guias no padrão TISS na versão vigente, com validação local de esquema | Importante |
| CON-03 | Controle de lote, protocolo de envio e retorno da operadora | Importante |
| CON-04 | Painel de glosas com motivo, valor e fluxo de recurso | Importante |
| CON-05 | Manutenção versionada da terminologia TUSS | Importante |
| CON-06 | Verificação de elegibilidade e autorização prévia quando a operadora disponibilizar o serviço | Desejável |
| CON-07 | Relatório de faturamento por operadora, com prazo médio de recebimento | Importante |

## COM — Comunicação e relacionamento

| ID | Requisito | Prioridade |
| --- | --- | --- |
| COM-01 | Envio de lembrete e confirmação por WhatsApp usando exclusivamente a API oficial via provedor autorizado | Essencial |
| COM-02 | Modelos de mensagem aprovados, com variáveis de paciente, data, hora, profissional e endereço | Essencial |
| COM-03 | Régua de comunicação configurável: confirmação, lembrete véspera, aviso no dia, agradecimento e retorno | Importante |
| COM-04 | Caixa de entrada compartilhada com histórico vinculado ao paciente e atribuição de atendente | Importante |
| COM-05 | Registro de opt-in e opt-out de comunicações, respeitando a finalidade declarada | Essencial |
| COM-06 | Proibição de trafegar informação clínica sensível em texto livre pelo canal de mensageria | Essencial |
| COM-07 | Pesquisa de satisfação pós-atendimento com apuração de NPS | Desejável |
| COM-08 | Campanhas de retorno e prevenção por segmento de pacientes | Desejável |

## POR — Portal do paciente

| ID | Requisito | Prioridade |
| --- | --- | --- |
| POR-01 | Área para o paciente ver agendamentos, remarcar e cancelar dentro da política definida | Importante |
| POR-02 | Acesso a documentos emitidos, receitas e solicitações de exame | Importante |
| POR-03 | Preenchimento de ficha e questionários antes da consulta | Importante |
| POR-04 | Upload de exames pelo paciente, com fila de revisão pela clínica | Desejável |
| POR-05 | Autenticação sem senha por código enviado ao contato verificado | Importante |
| POR-06 | Exercício de direitos do titular: solicitar cópia, correção e informação sobre uso dos dados | Importante |

## IND — Indicadores e relatórios

| ID | Requisito | Prioridade |
| --- | --- | --- |
| IND-01 | Painel inicial com agenda do dia, pendências e recebimentos do período | Essencial |
| IND-02 | Taxa de no-show por profissional, período e origem do agendamento | Importante |
| IND-03 | Taxa de ocupação da agenda e horários ociosos recorrentes | Importante |
| IND-04 | Ticket médio, receita por profissional e por convênio | Importante |
| IND-05 | Origem do paciente e taxa de retorno | Importante |
| IND-06 | Exportação de qualquer relatório em planilha | Importante |
| IND-07 | Relatório de acessos ao prontuário, para fins de auditoria e LGPD | Essencial |

## IA — Inteligência artificial

| ID | Requisito | Prioridade |
| --- | --- | --- |
| IA-01 | Transcrição da consulta a partir de áudio, com consentimento prévio do paciente registrado | Importante |
| IA-02 | Estruturação da transcrição no formato do modelo de evolução da especialidade | Importante |
| IA-03 | Tela de revisão obrigatória antes de gravar, com diferença visível entre sugerido e aceito | Essencial |
| IA-04 | Marcação automática no prontuário de que houve apoio de IA e de que houve revisão humana | Essencial |
| IA-05 | Resumo do histórico do paciente antes do atendimento, com referência às fontes internas usadas | Importante |
| IA-06 | Redação assistida de documentos administrativos e orientações ao paciente | Desejável |
| IA-07 | Configuração por clínica para desativar completamente os recursos de IA | Essencial |
| IA-08 | Vedação explícita, em produto e em contrato, ao uso de dados de pacientes para treinamento de modelos | Essencial |

## ADM — Administração, acesso e conformidade

| ID | Requisito | Prioridade |
| --- | --- | --- |
| ADM-01 | Multilocação com isolamento de dados por clínica garantido em nível de banco de dados | Essencial |
| ADM-02 | Perfis de acesso: médico, secretária, gestor, financeiro, com permissões granulares | Essencial |
| ADM-03 | Autenticação com segundo fator, obrigatória para perfis com acesso a prontuário | Essencial |
| ADM-04 | Trilha de auditoria consultável pelo próprio cliente, sem intervenção do suporte | Essencial |
| ADM-05 | Cadastro de profissionais com CRM, especialidade e registro de diretor técnico quando aplicável | Essencial |
| ADM-06 | Gestão de múltiplos locais de atendimento por clínica | Importante |
| ADM-07 | Painel de conformidade indicando pendências (consentimentos, certificado vencendo, recibos não emitidos) | Importante |
| ADM-08 | Exportação integral dos dados da clínica a qualquer momento, sem custo e sem retenção comercial | Essencial |
| ADM-09 | Encerramento de conta com política de retenção legal aplicada automaticamente | Essencial |

## NF-SEC — Requisitos não funcionais — Segurança

| ID | Requisito | Prioridade |
| --- | --- | --- |
| NF-SEC-01 | TLS 1.2 ou superior em todo o tráfego; HSTS habilitado | Essencial |
| NF-SEC-02 | Criptografia em repouso do banco de dados e do armazenamento de arquivos | Essencial |
| NF-SEC-03 | Segredos fora do código, em cofre gerenciado, com rotação periódica | Essencial |
| NF-SEC-04 | Trilha de auditoria em modo somente-adição, sem permissão de atualização ou exclusão pela aplicação | Essencial |
| NF-SEC-05 | Isolamento entre clínicas aplicado no banco (segurança em nível de linha) e não apenas na camada de aplicação | Essencial |
| NF-SEC-06 | Segundo fator de autenticação e política de senha forte | Essencial |
| NF-SEC-07 | Limitação de taxa e proteção contra automação em endpoints públicos | Essencial |
| NF-SEC-08 | Teste de intrusão anual e varredura contínua de dependências | Importante |
| NF-SEC-09 | Plano documentado de resposta a incidentes com notificação à ANPD em até 72 horas | Essencial |
| NF-SEC-10 | Nenhum dado de produção em ambiente de desenvolvimento; uso obrigatório de dados sintéticos | Essencial |

## NF-OPS — Requisitos não funcionais — Disponibilidade, desempenho e continuidade

| ID | Requisito | Prioridade |
| --- | --- | --- |
| NF-OPS-01 | Meta de disponibilidade de 99,9% em horário comercial | Essencial |
| NF-OPS-02 | Carregamento da agenda do dia em menos de 1 segundo no percentil 95 | Essencial |
| NF-OPS-03 | Backup automático diário com retenção escalonada e teste de restauração trimestral | Essencial |
| NF-OPS-04 | Objetivo de ponto de recuperação de até 1 hora e de tempo de recuperação de até 4 horas | Essencial |
| NF-OPS-05 | Retenção de dados clínicos por no mínimo 20 anos, com política de armazenamento frio para dados antigos | Essencial |
| NF-OPS-06 | Hospedagem em região brasileira do provedor de nuvem | Essencial |
| NF-OPS-07 | Monitoramento, alertas e rastreamento distribuído com retenção de logs | Importante |
| NF-OPS-08 | Funcionamento em rede instável, com salvamento local do rascunho de evolução | Importante |
