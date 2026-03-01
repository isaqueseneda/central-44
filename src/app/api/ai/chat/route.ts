import { streamText, jsonSchema, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  searchStores,
  searchServiceOrders,
  getDashboardSummary,
  getEmployeeWorkload,
  calculateOSCost,
  getUnassignedOS,
  getStoresByRegion,
  getMaterialsInventory,
  getServiceTypeStats,
} from "@/lib/ai-tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
});

const SYSTEM_PROMPT = `Você é o assistente inteligente do **Central 44**, o sistema de gestão de ordens de serviço da empresa **Central Engenharia Elétrica / Tecpel**, baseada em Limeira, SP.

## Contexto do Negócio
- A empresa faz **manutenção de sistemas de alarme de intrusão e sensores** em lojas do varejo
- O principal cliente é a rede **Lojas Cem** (308 lojas em SP, RJ, MG e PR)
- Os serviços incluem: manutenção de alarmes, instalação de sensores (IVP, boca de lobo), substituição de sensores, manutenção de gôndolas, LEDs, sirenes
- A equipe viaja de Limeira para as lojas (média de 450km ida e volta)
- Sempre trabalham em duplas (2 funcionários por OS)
- Veículos da frota: Montana, Celta, HB20, Strada, Ecosport, Fiorino

## Status das OS
- NOT_STARTED = Não iniciada (backlog)
- IN_PROGRESS = Em andamento
- PAID = Pago (concluída)
- RETURN_VISIT = Retorno necessário
- MEASUREMENT = Medição
- REWORK = Retrabalho

## Fórmulas de Custo
- MDO (Mão de obra) = HH (horas-homem) + Refeição + Pernoite
- Transporte = Combustível (KM * taxa) + Estacionamento + Pedágio
- Total = MDO + Material + Transporte
- A taxa por km é aproximadamente R$ 0.50/km
- HH padrão: R$ 405/funcionário/dia (R$ 810 para dupla)

## Instruções
- Responda sempre em **português brasileiro**
- Seja conciso e direto, mas amigável
- Use as ferramentas disponíveis para buscar dados reais do sistema
- Quando o usuário perguntar sobre dados, consulte o banco de dados
- Formate números em reais: R$ 1.234,56
- Para listas longas, use formatação com marcadores
- Sugira ações proativas quando identificar problemas (ex: OS paradas, funcionários ociosos)
- Sempre que possível, calcule estimativas de custo automaticamente`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "OPENROUTER_API_KEY não configurada. Adicione sua chave no .env",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model: openrouter("google/gemini-2.5-flash"),
      system: SYSTEM_PROMPT,
      messages,
      tools: {
        searchStores: {
          description:
            "Busca lojas por nome da cidade, sigla, código ou endereço. Pode filtrar por estado (SP, RJ, MG, PR).",
          inputSchema: jsonSchema<{ query: string; state?: string }>({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Termo de busca (cidade, sigla, código)",
              },
              state: {
                type: "string",
                description: "Filtrar por estado: SP, RJ, MG, PR",
              },
            },
            required: ["query"],
          }),
          execute: async ({ query, state }: any) => {
            const stores = await searchStores(query, state);
            return stores.map((s) => ({
              code: s.code,
              sigla: s.sigla,
              city: s.city,
              state: s.state,
              address: s.address,
              km: s.kmRoundTrip,
              toll: s.tollRoundTrip,
              phone: s.phone,
            }));
          },
        },

        searchServiceOrders: {
          description:
            "Busca ordens de serviço com filtros de status, loja ou funcionário.",
          inputSchema: jsonSchema<{
            status?: string;
            storeName?: string;
            employeeName?: string;
            limit?: number;
          }>({
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: [
                  "NOT_STARTED",
                  "IN_PROGRESS",
                  "PAID",
                  "RETURN_VISIT",
                  "MEASUREMENT",
                  "REWORK",
                ],
                description: "Status da OS",
              },
              storeName: {
                type: "string",
                description: "Nome da cidade da loja",
              },
              employeeName: {
                type: "string",
                description: "Nome do funcionário",
              },
              limit: {
                type: "number",
                description: "Máximo de resultados (padrão: 10)",
              },
            },
          }),
          execute: async (params: any) => {
            const orders = await searchServiceOrders(params);
            return orders.map((os) => ({
              id: os.id,
              orderNumber: os.orderNumber,
              name: os.name,
              status: os.status,
              type: os.type,
              date: os.date,
              totalCost: os.totalCost,
              vehicle: os.vehicle?.name,
              stores: os.stores.map(
                (s) => `${s.store.code} - ${s.store.city}`
              ),
              employees: os.employees.map((e) => e.employee.shortName),
              services: os.serviceTypes.map((st) => st.serviceType.name),
            }));
          },
        },

        getDashboard: {
          description:
            "Retorna resumo geral do sistema: total de OS, distribuição por status, receita total, funcionários ativos e OS recentes.",
          inputSchema: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
          }),
          execute: async () => {
            return getDashboardSummary();
          },
        },

        getEmployeeWorkload: {
          description:
            "Retorna a carga de trabalho de cada funcionário ativo: quantas OS estão ativas, pendentes e concluídas.",
          inputSchema: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
          }),
          execute: async () => {
            return getEmployeeWorkload();
          },
        },

        calculateCost: {
          description:
            "Calcula o custo estimado de uma nova OS baseado em distância, pedágio e número de funcionários.",
          inputSchema: jsonSchema<{
            kmRoundTrip: number;
            tollRoundTrip: number;
            numEmployees: number;
            estimatedHours?: number;
          }>({
            type: "object",
            properties: {
              kmRoundTrip: {
                type: "number",
                description: "Distância ida e volta em km",
              },
              tollRoundTrip: {
                type: "number",
                description: "Custo do pedágio ida e volta em R$",
              },
              numEmployees: {
                type: "number",
                description: "Número de funcionários (geralmente 2)",
              },
              estimatedHours: {
                type: "number",
                description: "Horas estimadas (padrão: 8)",
              },
            },
            required: ["kmRoundTrip", "tollRoundTrip", "numEmployees"],
          }),
          execute: async (params: any) => {
            return calculateOSCost(params);
          },
        },

        getUnassignedOS: {
          description:
            "Lista todas as OS pendentes sem funcionário atribuído (backlog não agendado).",
          inputSchema: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
          }),
          execute: async () => {
            const orders = await getUnassignedOS();
            return orders.map((os) => ({
              id: os.id,
              name: os.name,
              stores: os.stores.map(
                (s) =>
                  `${s.store.code} - ${s.store.city} (${s.store.kmRoundTrip ?? "?"}km)`
              ),
              services: os.serviceTypes.map((st) => st.serviceType.name),
              createdAt: os.createdAt,
            }));
          },
        },

        getStoresByRegion: {
          description:
            "Retorna todas as lojas de um estado com OS pendentes e receita.",
          inputSchema: jsonSchema<{ state: string }>({
            type: "object",
            properties: {
              state: {
                type: "string",
                enum: ["SP", "RJ", "MG", "PR"],
                description: "Estado para filtrar",
              },
            },
            required: ["state"],
          }),
          execute: async ({ state }: any) => {
            return getStoresByRegion(state);
          },
        },

        getMaterials: {
          description:
            "Lista todos os materiais com preço de compra, venda, margem e uso em OS.",
          inputSchema: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
          }),
          execute: async () => {
            return getMaterialsInventory();
          },
        },

        getServiceTypes: {
          description:
            "Lista todos os tipos de serviço com estatísticas de OS e receita.",
          inputSchema: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
          }),
          execute: async () => {
            return getServiceTypeStats();
          },
        },
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return new Response(
      JSON.stringify({
        error:
          "Erro ao processar mensagem. Verifique a configuração do OpenRouter.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
