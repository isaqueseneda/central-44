import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer) {
  // ============================================
  // Database Schema Resource
  // ============================================

  server.resource(
    "schema",
    "central44://schema",
    {
      description:
        "Descricao completa do schema do banco de dados do Central 44, incluindo modelos, campos e relacionamentos.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "central44://schema",
          mimeType: "text/plain",
          text: `# Central 44 - Database Schema

## Core Models

### Store (Loja)
Lojas/unidades atendidas pela Central Engenharia.
- id: String (CUID, PK)
- code: String (unico - codigo da loja, ex: "LJ001")
- sigla: String (nome curto / sigla da loja)
- city: String (cidade)
- state: String (estado / UF, ex: "SP")
- address: String (endereco completo)
- cep: String? (CEP)
- cnpj: String? (CNPJ)
- stateRegistration: String? (inscricao estadual)
- constructionCode: String? (codigo de obra)
- phone: String? (telefone)
- kmRoundTrip: Float? (quilometragem ida e volta)
- tollRoundTrip: Float? (custo de pedagio ida e volta em R$)
- storeNumber: Int? (numero da loja)
- latitude: Float?
- longitude: Float?
- createdAt: DateTime
- updatedAt: DateTime
Indices: state, city

### Employee (Funcionario)
Funcionarios/tecnicos da Central Engenharia.
- id: String (CUID, PK)
- shortName: String (nome curto / apelido)
- fullName: String? (nome completo)
- rg: String? (RG)
- phone: String? (telefone)
- startDate: DateTime? (data de inicio)
- isActive: Boolean (default: true)
- createdAt: DateTime
- updatedAt: DateTime

### Vehicle (Veiculo)
Veiculos usados para deslocamento ate as lojas.
- id: String (CUID, PK)
- name: String (descricao do veiculo)
- licensePlate: String (placa, unica)
- isActive: Boolean (default: true)
- createdAt: DateTime
- updatedAt: DateTime

### ServiceType (Tipo de Servico)
Tipos de servico oferecidos (ex: instalacao eletrica, alarme, LED).
- id: String (CUID, PK)
- name: String (nome, unico)
- tags: String[] (categorias)
- createdAt: DateTime

### Material
Materiais utilizados nos servicos.
- id: String (CUID, PK)
- name: String (nome do material)
- purchasePrice: Float? (preco de compra em R$)
- salePrice: Float? (preco de venda em R$)
- tags: String[] (categorias)
- createdAt: DateTime
- updatedAt: DateTime

### ServiceOrder (Ordem de Servico - OS)
Tabela central do sistema. Cada OS representa um trabalho a ser realizado.
- id: String (CUID, PK)
- orderNumber: Int (auto-incremento, unico - numero da OS)
- name: String (descricao da OS)
- status: ServiceOrderStatus (NOT_STARTED | IN_PROGRESS | RETURN_VISIT | MEASUREMENT | PAID | REWORK)
- priority: Int (default: 0, maior = mais urgente)
- type: ServiceOrderType (GENERAL | ALARM | LED)
- date: DateTime? (data programada)
- warranty: Boolean (default: false - se eh garantia)
- kmDiscount: Float? (desconto de km)
- tollDiscount: Float? (desconto de pedagio)
- parking: Float? (estacionamento)
- mealAllowance: Float? (refeicao)
- overnightAllowance: Float? (pernoite)
- materialCost: Float? (custo de materiais)
- transportCost: Float? (custo de transporte)
- laborCost: Float? (custo de mao de obra)
- manHours: Float? (horas trabalhadas)
- totalCost: Float? (custo total)
- materialsUsedNotes: String? (descricao dos materiais usados)
- servicesPerformed: String? (descricao dos servicos realizados)
- managerComment: String? (comentario do gerente da loja)
- managerSignatureUrl: String? (URL da assinatura do gerente)
- vehicleId: String? (FK -> Vehicle)
- createdAt: DateTime
- updatedAt: DateTime
Indices: status, date, type

## Junction Tables (Relacionamentos N:N)

### ServiceOrderStore
Associa OS a lojas (uma OS pode atender varias lojas).
- serviceOrderId + storeId (PK composta)

### ServiceOrderEmployee
Associa OS a funcionarios (uma OS pode ter varios tecnicos).
- serviceOrderId + employeeId (PK composta)

### ServiceOrderServiceType
Associa OS a tipos de servico (uma OS pode envolver varios tipos).
- serviceOrderId + serviceTypeId (PK composta)

### ServiceOrderMaterial
Associa OS a materiais com quantidade.
- serviceOrderId + materialId (PK composta)
- quantity: Float?

## Weekly Schedule (Programacao Semanal)

### WeeklySchedule
Programacao semanal de trabalho.
- id: String (CUID, PK)
- weekStart: DateTime (unico - inicio da semana, segunda-feira)
- status: ScheduleStatus (DRAFT | PUBLISHED | COMPLETED)
- notes: String?
- days: DailySchedule[] (dias da semana com equipes e ausencias)

### DailySchedule
Um dia dentro da programacao semanal.
- id: String (CUID, PK)
- weeklyScheduleId: String (FK)
- date: DateTime (data do dia)
- dayOfWeek: Int (0=domingo, 1=segunda, ..., 6=sabado)
- isHoliday: Boolean
- holidayName: String?
- teams: DailyTeam[] (equipes do dia)
- absences: DailyAbsence[] (ausencias do dia)

### DailyTeam
Uma equipe de trabalho em um dia (ex: equipe de manutencao em Avaré).
- id: String (CUID, PK)
- dailyScheduleId: String (FK)
- jobType: JobType (MAN | REF | OBRA)
- city: String (cidade destino)
- driverId: String? (FK -> Employee, motorista da equipe)
- vehicleId: String? (FK -> Vehicle, veiculo da equipe)
- members: DailyTeamMember[] (membros da equipe)

### DailyTeamMember
Um funcionario membro de uma equipe em um dia.
- id: String (CUID, PK)
- dailyTeamId: String (FK)
- employeeId: String (FK -> Employee)
- hours: Float? (horas trabalhadas)

### DailyAbsence
Ausencia de um funcionario em um dia.
- id: String (CUID, PK)
- dailyScheduleId: String (FK)
- employeeId: String (FK -> Employee)
- type: AbsenceType (FOLGA | FALTA | FERIAS)

## Enums

### ServiceOrderStatus
- NOT_STARTED: Nao iniciada
- IN_PROGRESS: Em andamento
- RETURN_VISIT: Retorno (precisa voltar na loja)
- MEASUREMENT: Medicao (aguardando conferencia/aprovacao)
- PAID: Paga (finalizada e paga)
- REWORK: Retrabalho (precisa refazer)

### ServiceOrderType
- GENERAL: Servico geral (eletrica)
- ALARM: Alarme
- LED: LED / iluminacao

### ScheduleStatus
- DRAFT: Rascunho
- PUBLISHED: Publicada
- COMPLETED: Concluida

### JobType
- MAN: Manutencao (reparos e manutencao preventiva)
- REF: Reforma (reformas/renovacoes em lojas)
- OBRA: Obra (construcao/instalacao nova)

### AbsenceType
- FOLGA: Dia de folga
- FALTA: Falta (ausencia nao programada)
- FERIAS: Ferias
`,
        },
      ],
    })
  );

  // ============================================
  // Status Flow Resource
  // ============================================

  server.resource(
    "status-flow",
    "central44://status-flow",
    {
      description:
        "Explica o fluxo de status das ordens de servico (OS) no sistema Central 44.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "central44://status-flow",
          mimeType: "text/plain",
          text: `# Fluxo de Status das Ordens de Servico (OS)

## Fluxo Principal (caminho feliz)

  NOT_STARTED (Nao Iniciada)
       |
       v
  IN_PROGRESS (Em Andamento)
       |
       v
  MEASUREMENT (Medicao)
       |
       v
  PAID (Paga / Finalizada)

## Fluxo Detalhado

1. **NOT_STARTED** (Nao Iniciada)
   - Estado inicial de toda OS.
   - A OS foi criada mas ainda nao comecou a ser executada.
   - Os tecnicos ainda nao foram a campo.

2. **IN_PROGRESS** (Em Andamento)
   - Os tecnicos estao executando o servico na loja.
   - Materiais estao sendo utilizados.
   - A OS esta ativa em campo.

3. **MEASUREMENT** (Medicao)
   - O servico foi executado e esta aguardando conferencia.
   - O gerente da loja precisa validar/assinar.
   - Os custos estao sendo calculados.
   - Aguardando aprovacao para faturamento.

4. **PAID** (Paga)
   - A OS foi concluida, aprovada e paga.
   - Estado final do fluxo normal.
   - Os valores foram contabilizados.

## Status de Excecao

5. **RETURN_VISIT** (Retorno)
   - Necessita voltar a loja para completar o servico.
   - Pode acontecer quando faltou material, tempo ou acesso.
   - Volta para IN_PROGRESS quando o retorno eh agendado.

6. **REWORK** (Retrabalho)
   - O servico precisa ser refeito por problemas de qualidade.
   - Pode gerar custos adicionais.
   - Volta para IN_PROGRESS quando o retrabalho comeca.

## Transicoes Permitidas

NOT_STARTED -> IN_PROGRESS (tecnico comecou o trabalho)
IN_PROGRESS -> MEASUREMENT (servico executado, aguardando conferencia)
IN_PROGRESS -> RETURN_VISIT (precisa retornar)
IN_PROGRESS -> REWORK (problema identificado durante execucao)
MEASUREMENT -> PAID (aprovado e pago)
MEASUREMENT -> REWORK (problema identificado na conferencia)
RETURN_VISIT -> IN_PROGRESS (retorno agendado/iniciado)
REWORK -> IN_PROGRESS (retrabalho iniciado)

## Notas

- Uma OS pode ir e voltar entre IN_PROGRESS e RETURN_VISIT varias vezes.
- REWORK geralmente implica custos adicionais e deve ser monitorado.
- PAID eh o estado final; uma OS paga nao deve mudar de status.
- O campo "warranty" (garantia) indica se a OS eh um servico de garantia,
  que pode ter tratamento diferente de cobranca.
`,
        },
      ],
    })
  );

  // ============================================
  // Business Context Resource
  // ============================================

  server.resource(
    "business-context",
    "central44://business-context",
    {
      description:
        "Contexto de negocio da Central Engenharia Eletrica / Tecpel - empresa, servicos e operacao.",
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: "central44://business-context",
          mimeType: "text/plain",
          text: `# Central Engenharia Eletrica / Tecpel - Contexto de Negocio

## Sobre a Empresa

A **Central Engenharia Eletrica**, tambem conhecida como **Tecpel**, eh uma empresa
sediada em **Limeira, Sao Paulo**. A empresa presta servicos de engenharia eletrica,
instalacao e manutencao para redes de lojas no estado de Sao Paulo.

## Servicos Oferecidos

### Tipos de Servico (ServiceOrderType)
1. **GENERAL** - Servicos gerais de engenharia eletrica
   - Instalacao eletrica
   - Manutencao preventiva e corretiva
   - Quadros eletricos
   - Cabeamento estruturado

2. **ALARM** - Sistemas de alarme e seguranca
   - Instalacao de alarmes
   - Manutencao de sistemas de seguranca
   - Cameras e CFTV

3. **LED** - Iluminacao LED
   - Troca de iluminacao convencional por LED
   - Instalacao de paineis luminosos
   - Letreiros e comunicacao visual luminosa

## Modelo de Operacao

### Clientes
- Redes de lojas espalhadas pelo estado de Sao Paulo
- Cada loja (Store) tem um codigo unico, sigla, endereco e dados de contato
- A empresa rastreia a distancia (km) e custo de pedagio para cada loja

### Equipe
- Tecnicos/funcionarios sao alocados em ordens de servico
- Cada tecnico tem nome curto (apelido) para uso diario
- A empresa controla quem esta ativo e inativo

### Veiculos
- Frota de veiculos para deslocamento ate as lojas (FEC 5731, DHK 7352, FUK 2787, EWQ 4136, EIL 8398)
- Cada veiculo tem placa e pode ser atribuido a uma OS ou equipe de programacao

### Ordens de Servico (OS)
- Unidade central de trabalho da empresa
- Uma OS pode atender uma ou mais lojas
- Uma OS pode ter um ou mais tecnicos
- Uma OS pode envolver varios tipos de servico e materiais
- Cada OS tem custos detalhados: transporte, mao de obra, materiais, pedagio,
  estacionamento, refeicao e pernoite

### Programacao Semanal
- A empresa planeja semanalmente quais tecnicos vao a quais lojas
- Cada semana tem DailySchedules (dias) com DailyTeams (equipes)
- Cada equipe tem: tipo de trabalho (MAN/REF/OBRA), cidade destino, motorista, veiculo, membros
- Tipos de trabalho: MAN=manutencao, REF=reforma, OBRA=construcao/instalacao nova
- Ausencias sao rastreadas: FOLGA (dia de folga), FALTA (ausencia), FERIAS (ferias)
- Horas por funcionario sao registradas por equipe/dia
- A programacao tem status: rascunho, publicada ou concluida

## Metricas Importantes

- **Receita mensal**: soma dos totalCost de OS pagas no mes
- **OS pendentes**: contagem de OS com status NOT_STARTED
- **OS em andamento**: contagem de OS com status IN_PROGRESS
- **Retrabalhos**: monitorar REWORK para controle de qualidade
- **Cobertura**: quantas lojas foram atendidas no periodo

## Glossario

| Termo | Significado |
|-------|-------------|
| OS | Ordem de Servico |
| Loja | Unidade/filial do cliente |
| Sigla | Abreviacao/nome curto da loja |
| Medicao | Etapa de conferencia/validacao do servico |
| Retorno | Visita adicional necessaria |
| Retrabalho | Servico que precisa ser refeito |
| Man Hours | Horas de mao de obra trabalhadas |
| Km ida e volta | Distancia total de deslocamento |
`,
        },
      ],
    })
  );
}
