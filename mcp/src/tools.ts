import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "./db.js";

// Helper to format tool responses
function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export function registerTools(server: McpServer) {
  // ============================================
  // Store Tools
  // ============================================

  server.tool(
    "list_stores",
    "Lista lojas cadastradas. Pode filtrar por busca (nome, codigo, cidade), estado (UF) e paginar resultados.",
    {
      q: z.string().optional().describe("Texto para busca (nome, codigo, cidade)"),
      state: z.string().optional().describe("Filtrar por estado (UF, ex: SP, MG)"),
      page: z.number().optional().default(1).describe("Pagina (default: 1)"),
      limit: z.number().optional().default(50).describe("Itens por pagina (default: 50)"),
    },
    async ({ q, state, page, limit }) => {
      try {
        const where: any = {};
        if (state) where.state = state.toUpperCase();
        if (q) {
          where.OR = [
            { code: { contains: q, mode: "insensitive" } },
            { sigla: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ];
        }

        const [stores, total] = await Promise.all([
          prisma.store.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { code: "asc" },
          }),
          prisma.store.count({ where }),
        ]);

        return ok({
          stores,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (e: any) {
        return err(`Erro ao listar lojas: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_store",
    "Busca uma loja pelo ID. Retorna todos os dados incluindo ordens de servico vinculadas.",
    {
      id: z.string().describe("ID da loja"),
    },
    async ({ id }) => {
      try {
        const store = await prisma.store.findUnique({
          where: { id },
          include: {
            serviceOrders: {
              include: {
                serviceOrder: {
                  select: { id: true, orderNumber: true, name: true, status: true, date: true },
                },
              },
              take: 20,
            },
          },
        });
        if (!store) return err(`Loja com ID "${id}" nao encontrada.`);
        return ok(store);
      } catch (e: any) {
        return err(`Erro ao buscar loja: ${e.message}`);
      }
    }
  );

  server.tool(
    "create_store",
    "Cria uma nova loja no sistema.",
    {
      code: z.string().describe("Codigo unico da loja (ex: 'LJ001')"),
      sigla: z.string().describe("Sigla/nome curto da loja"),
      city: z.string().describe("Cidade"),
      state: z.string().describe("Estado (UF, ex: SP)"),
      address: z.string().describe("Endereco completo"),
      cep: z.string().optional().describe("CEP"),
      cnpj: z.string().optional().describe("CNPJ"),
      stateRegistration: z.string().optional().describe("Inscricao estadual"),
      constructionCode: z.string().optional().describe("Codigo de obra"),
      phone: z.string().optional().describe("Telefone"),
      kmRoundTrip: z.number().optional().describe("Km ida e volta"),
      tollRoundTrip: z.number().optional().describe("Pedagio ida e volta (R$)"),
      storeNumber: z.number().optional().describe("Numero da loja"),
      latitude: z.number().optional().describe("Latitude"),
      longitude: z.number().optional().describe("Longitude"),
    },
    async (data) => {
      try {
        const store = await prisma.store.create({ data });
        return ok({ message: "Loja criada com sucesso.", store });
      } catch (e: any) {
        return err(`Erro ao criar loja: ${e.message}`);
      }
    }
  );

  server.tool(
    "update_store",
    "Atualiza dados de uma loja existente.",
    {
      id: z.string().describe("ID da loja"),
      code: z.string().optional().describe("Codigo unico da loja"),
      sigla: z.string().optional().describe("Sigla/nome curto"),
      city: z.string().optional().describe("Cidade"),
      state: z.string().optional().describe("Estado (UF)"),
      address: z.string().optional().describe("Endereco"),
      cep: z.string().optional().describe("CEP"),
      cnpj: z.string().optional().describe("CNPJ"),
      stateRegistration: z.string().optional().describe("Inscricao estadual"),
      constructionCode: z.string().optional().describe("Codigo de obra"),
      phone: z.string().optional().describe("Telefone"),
      kmRoundTrip: z.number().optional().describe("Km ida e volta"),
      tollRoundTrip: z.number().optional().describe("Pedagio ida e volta (R$)"),
      storeNumber: z.number().optional().describe("Numero da loja"),
      latitude: z.number().optional().describe("Latitude"),
      longitude: z.number().optional().describe("Longitude"),
    },
    async ({ id, ...data }) => {
      try {
        // Remove undefined values
        const updateData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        const store = await prisma.store.update({ where: { id }, data: updateData });
        return ok({ message: "Loja atualizada com sucesso.", store });
      } catch (e: any) {
        return err(`Erro ao atualizar loja: ${e.message}`);
      }
    }
  );

  server.tool(
    "delete_store",
    "Exclui uma loja do sistema. Cuidado: a loja nao pode estar vinculada a ordens de servico ativas.",
    {
      id: z.string().describe("ID da loja"),
    },
    async ({ id }) => {
      try {
        await prisma.store.delete({ where: { id } });
        return ok({ message: "Loja excluida com sucesso." });
      } catch (e: any) {
        return err(`Erro ao excluir loja: ${e.message}`);
      }
    }
  );

  // ============================================
  // Employee Tools
  // ============================================

  server.tool(
    "list_employees",
    "Lista funcionarios cadastrados. Pode filtrar por busca (nome) e status ativo/inativo.",
    {
      q: z.string().optional().describe("Texto para busca no nome"),
      isActive: z.boolean().optional().describe("Filtrar por ativo (true) ou inativo (false)"),
      page: z.number().optional().default(1).describe("Pagina"),
      limit: z.number().optional().default(50).describe("Itens por pagina"),
    },
    async ({ q, isActive, page, limit }) => {
      try {
        const where: any = {};
        if (isActive !== undefined) where.isActive = isActive;
        if (q) {
          where.OR = [
            { shortName: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
          ];
        }

        const [employees, total] = await Promise.all([
          prisma.employee.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { shortName: "asc" },
          }),
          prisma.employee.count({ where }),
        ]);

        return ok({
          employees,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (e: any) {
        return err(`Erro ao listar funcionarios: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_employee",
    "Busca um funcionario pelo ID com suas atribuicoes em ordens de servico.",
    {
      id: z.string().describe("ID do funcionario"),
    },
    async ({ id }) => {
      try {
        const employee = await prisma.employee.findUnique({
          where: { id },
          include: {
            assignments: {
              include: {
                serviceOrder: {
                  select: { id: true, orderNumber: true, name: true, status: true, date: true },
                },
              },
              take: 20,
            },
          },
        });
        if (!employee) return err(`Funcionario com ID "${id}" nao encontrado.`);
        return ok(employee);
      } catch (e: any) {
        return err(`Erro ao buscar funcionario: ${e.message}`);
      }
    }
  );

  server.tool(
    "create_employee",
    "Cadastra um novo funcionario.",
    {
      shortName: z.string().describe("Nome curto / apelido do funcionario"),
      fullName: z.string().optional().describe("Nome completo"),
      rg: z.string().optional().describe("RG"),
      phone: z.string().optional().describe("Telefone"),
      startDate: z.string().optional().describe("Data de inicio (ISO 8601, ex: 2024-01-15)"),
      isActive: z.boolean().optional().default(true).describe("Status ativo"),
    },
    async ({ startDate, ...data }) => {
      try {
        const employee = await prisma.employee.create({
          data: {
            ...data,
            startDate: startDate ? new Date(startDate) : undefined,
          },
        });
        return ok({ message: "Funcionario criado com sucesso.", employee });
      } catch (e: any) {
        return err(`Erro ao criar funcionario: ${e.message}`);
      }
    }
  );

  server.tool(
    "update_employee",
    "Atualiza dados de um funcionario existente.",
    {
      id: z.string().describe("ID do funcionario"),
      shortName: z.string().optional().describe("Nome curto"),
      fullName: z.string().optional().describe("Nome completo"),
      rg: z.string().optional().describe("RG"),
      phone: z.string().optional().describe("Telefone"),
      startDate: z.string().optional().describe("Data de inicio (ISO 8601)"),
      isActive: z.boolean().optional().describe("Status ativo"),
    },
    async ({ id, startDate, ...data }) => {
      try {
        const updateData: any = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        if (startDate) updateData.startDate = new Date(startDate);

        const employee = await prisma.employee.update({ where: { id }, data: updateData });
        return ok({ message: "Funcionario atualizado com sucesso.", employee });
      } catch (e: any) {
        return err(`Erro ao atualizar funcionario: ${e.message}`);
      }
    }
  );

  server.tool(
    "delete_employee",
    "Exclui um funcionario do sistema.",
    {
      id: z.string().describe("ID do funcionario"),
    },
    async ({ id }) => {
      try {
        await prisma.employee.delete({ where: { id } });
        return ok({ message: "Funcionario excluido com sucesso." });
      } catch (e: any) {
        return err(`Erro ao excluir funcionario: ${e.message}`);
      }
    }
  );

  // ============================================
  // Vehicle Tools
  // ============================================

  server.tool(
    "list_vehicles",
    "Lista veiculos cadastrados. Pode filtrar por status ativo/inativo.",
    {
      isActive: z.boolean().optional().describe("Filtrar por ativo (true) ou inativo (false)"),
    },
    async ({ isActive }) => {
      try {
        const where: any = {};
        if (isActive !== undefined) where.isActive = isActive;

        const vehicles = await prisma.vehicle.findMany({
          where,
          orderBy: { name: "asc" },
        });
        return ok({ vehicles, total: vehicles.length });
      } catch (e: any) {
        return err(`Erro ao listar veiculos: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_vehicle",
    "Busca um veiculo pelo ID com suas ordens de servico vinculadas.",
    {
      id: z.string().describe("ID do veiculo"),
    },
    async ({ id }) => {
      try {
        const vehicle = await prisma.vehicle.findUnique({
          where: { id },
          include: {
            serviceOrders: {
              select: { id: true, orderNumber: true, name: true, status: true, date: true },
              take: 20,
              orderBy: { date: "desc" },
            },
          },
        });
        if (!vehicle) return err(`Veiculo com ID "${id}" nao encontrado.`);
        return ok(vehicle);
      } catch (e: any) {
        return err(`Erro ao buscar veiculo: ${e.message}`);
      }
    }
  );

  server.tool(
    "create_vehicle",
    "Cadastra um novo veiculo.",
    {
      name: z.string().describe("Nome/descricao do veiculo"),
      licensePlate: z.string().describe("Placa do veiculo (unica)"),
      isActive: z.boolean().optional().default(true).describe("Status ativo"),
    },
    async (data) => {
      try {
        const vehicle = await prisma.vehicle.create({ data });
        return ok({ message: "Veiculo criado com sucesso.", vehicle });
      } catch (e: any) {
        return err(`Erro ao criar veiculo: ${e.message}`);
      }
    }
  );

  server.tool(
    "update_vehicle",
    "Atualiza dados de um veiculo existente.",
    {
      id: z.string().describe("ID do veiculo"),
      name: z.string().optional().describe("Nome/descricao"),
      licensePlate: z.string().optional().describe("Placa"),
      isActive: z.boolean().optional().describe("Status ativo"),
    },
    async ({ id, ...data }) => {
      try {
        const updateData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        const vehicle = await prisma.vehicle.update({ where: { id }, data: updateData });
        return ok({ message: "Veiculo atualizado com sucesso.", vehicle });
      } catch (e: any) {
        return err(`Erro ao atualizar veiculo: ${e.message}`);
      }
    }
  );

  // ============================================
  // Service Order Tools
  // ============================================

  server.tool(
    "list_service_orders",
    "Lista ordens de servico (OS). Pode filtrar por status, tipo, busca (nome, numero), e paginar.",
    {
      status: z
        .enum(["NOT_STARTED", "IN_PROGRESS", "RETURN_VISIT", "MEASUREMENT", "PAID", "REWORK"])
        .optional()
        .describe("Filtrar por status da OS"),
      type: z
        .enum(["GENERAL", "ALARM", "LED"])
        .optional()
        .describe("Filtrar por tipo da OS"),
      q: z.string().optional().describe("Busca por nome ou numero da OS"),
      page: z.number().optional().default(1).describe("Pagina"),
      limit: z.number().optional().default(50).describe("Itens por pagina"),
    },
    async ({ status, type, q, page, limit }) => {
      try {
        const where: any = {};
        if (status) where.status = status;
        if (type) where.type = type;
        if (q) {
          const asNumber = parseInt(q, 10);
          where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            ...(isNaN(asNumber) ? [] : [{ orderNumber: asNumber }]),
          ];
        }

        const [orders, total] = await Promise.all([
          prisma.serviceOrder.findMany({
            where,
            include: {
              stores: { include: { store: { select: { id: true, code: true, sigla: true, city: true } } } },
              employees: { include: { employee: { select: { id: true, shortName: true } } } },
              vehicle: { select: { id: true, name: true, licensePlate: true } },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
          }),
          prisma.serviceOrder.count({ where }),
        ]);

        return ok({
          serviceOrders: orders,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (e: any) {
        return err(`Erro ao listar ordens de servico: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_service_order",
    "Busca uma ordem de servico pelo ID com todos os detalhes: lojas, funcionarios, servicos, materiais e veiculo.",
    {
      id: z.string().describe("ID da ordem de servico"),
    },
    async ({ id }) => {
      try {
        const order = await prisma.serviceOrder.findUnique({
          where: { id },
          include: {
            stores: { include: { store: true } },
            employees: { include: { employee: true } },
            serviceTypes: { include: { serviceType: true } },
            materials: { include: { material: true } },
            vehicle: true,
          },
        });
        if (!order) return err(`Ordem de servico com ID "${id}" nao encontrada.`);
        return ok(order);
      } catch (e: any) {
        return err(`Erro ao buscar ordem de servico: ${e.message}`);
      }
    }
  );

  server.tool(
    "create_service_order",
    "Cria uma nova ordem de servico (OS) com conexoes para lojas, funcionarios, servicos e materiais.",
    {
      name: z.string().describe("Nome/descricao da OS"),
      status: z
        .enum(["NOT_STARTED", "IN_PROGRESS", "RETURN_VISIT", "MEASUREMENT", "PAID", "REWORK"])
        .optional()
        .default("NOT_STARTED")
        .describe("Status inicial"),
      priority: z.number().optional().default(0).describe("Prioridade (0 = normal)"),
      type: z
        .enum(["GENERAL", "ALARM", "LED"])
        .optional()
        .default("GENERAL")
        .describe("Tipo da OS"),
      date: z.string().optional().describe("Data da OS (ISO 8601)"),
      warranty: z.boolean().optional().default(false).describe("Se eh garantia"),
      vehicleId: z.string().optional().describe("ID do veiculo"),
      storeIds: z.array(z.string()).optional().describe("Lista de IDs de lojas"),
      employeeIds: z.array(z.string()).optional().describe("Lista de IDs de funcionarios"),
      serviceTypeIds: z.array(z.string()).optional().describe("Lista de IDs de tipos de servico"),
      materialIds: z
        .array(
          z.object({
            materialId: z.string().describe("ID do material"),
            quantity: z.number().optional().describe("Quantidade"),
          })
        )
        .optional()
        .describe("Lista de materiais com quantidade"),
      kmDiscount: z.number().optional().describe("Desconto de km"),
      tollDiscount: z.number().optional().describe("Desconto de pedagio"),
      parking: z.number().optional().describe("Estacionamento (R$)"),
      mealAllowance: z.number().optional().describe("Refeicao (R$)"),
      overnightAllowance: z.number().optional().describe("Pernoite (R$)"),
      materialCost: z.number().optional().describe("Custo de material (R$)"),
      transportCost: z.number().optional().describe("Custo de transporte (R$)"),
      laborCost: z.number().optional().describe("Custo de mao de obra (R$)"),
      manHours: z.number().optional().describe("Horas trabalhadas"),
      totalCost: z.number().optional().describe("Custo total (R$)"),
      materialsUsedNotes: z.string().optional().describe("Notas sobre materiais usados"),
      servicesPerformed: z.string().optional().describe("Servicos realizados (texto livre)"),
      managerComment: z.string().optional().describe("Comentario do gerente"),
    },
    async ({ storeIds, employeeIds, serviceTypeIds, materialIds, date, ...data }) => {
      try {
        const order = await prisma.serviceOrder.create({
          data: {
            ...data,
            date: date ? new Date(date) : undefined,
            stores: storeIds?.length
              ? { create: storeIds.map((storeId) => ({ storeId })) }
              : undefined,
            employees: employeeIds?.length
              ? { create: employeeIds.map((employeeId) => ({ employeeId })) }
              : undefined,
            serviceTypes: serviceTypeIds?.length
              ? { create: serviceTypeIds.map((serviceTypeId) => ({ serviceTypeId })) }
              : undefined,
            materials: materialIds?.length
              ? {
                  create: materialIds.map((m) => ({
                    materialId: m.materialId,
                    quantity: m.quantity,
                  })),
                }
              : undefined,
          },
          include: {
            stores: { include: { store: true } },
            employees: { include: { employee: true } },
            serviceTypes: { include: { serviceType: true } },
            materials: { include: { material: true } },
            vehicle: true,
          },
        });
        return ok({ message: "Ordem de servico criada com sucesso.", serviceOrder: order });
      } catch (e: any) {
        return err(`Erro ao criar ordem de servico: ${e.message}`);
      }
    }
  );

  server.tool(
    "update_service_order_status",
    "Atualiza rapidamente o status de uma ordem de servico. Fluxo principal: NOT_STARTED -> IN_PROGRESS -> MEASUREMENT -> PAID. Excecoes: RETURN_VISIT, REWORK.",
    {
      id: z.string().describe("ID da ordem de servico"),
      status: z
        .enum(["NOT_STARTED", "IN_PROGRESS", "RETURN_VISIT", "MEASUREMENT", "PAID", "REWORK"])
        .describe("Novo status"),
    },
    async ({ id, status }) => {
      try {
        const order = await prisma.serviceOrder.update({
          where: { id },
          data: { status },
          select: { id: true, orderNumber: true, name: true, status: true },
        });
        return ok({ message: `Status atualizado para ${status}.`, serviceOrder: order });
      } catch (e: any) {
        return err(`Erro ao atualizar status: ${e.message}`);
      }
    }
  );

  server.tool(
    "delete_service_order",
    "Exclui uma ordem de servico e todas as suas associacoes (lojas, funcionarios, servicos, materiais).",
    {
      id: z.string().describe("ID da ordem de servico"),
    },
    async ({ id }) => {
      try {
        await prisma.serviceOrder.delete({ where: { id } });
        return ok({ message: "Ordem de servico excluida com sucesso." });
      } catch (e: any) {
        return err(`Erro ao excluir ordem de servico: ${e.message}`);
      }
    }
  );

  // ============================================
  // Material Tools
  // ============================================

  server.tool(
    "list_materials",
    "Lista materiais cadastrados. Pode filtrar por busca (nome) e tags.",
    {
      q: z.string().optional().describe("Texto para busca no nome do material"),
      page: z.number().optional().default(1).describe("Pagina"),
      limit: z.number().optional().default(50).describe("Itens por pagina"),
    },
    async ({ q, page, limit }) => {
      try {
        const where: any = {};
        if (q) {
          where.name = { contains: q, mode: "insensitive" };
        }

        const [materials, total] = await Promise.all([
          prisma.material.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { name: "asc" },
          }),
          prisma.material.count({ where }),
        ]);

        return ok({
          materials,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch (e: any) {
        return err(`Erro ao listar materiais: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_material",
    "Busca um material pelo ID com informacoes de uso em ordens de servico.",
    {
      id: z.string().describe("ID do material"),
    },
    async ({ id }) => {
      try {
        const material = await prisma.material.findUnique({
          where: { id },
          include: {
            serviceOrders: {
              include: {
                serviceOrder: {
                  select: { id: true, orderNumber: true, name: true, status: true },
                },
              },
              take: 20,
            },
          },
        });
        if (!material) return err(`Material com ID "${id}" nao encontrado.`);
        return ok(material);
      } catch (e: any) {
        return err(`Erro ao buscar material: ${e.message}`);
      }
    }
  );

  server.tool(
    "create_material",
    "Cadastra um novo material no sistema.",
    {
      name: z.string().describe("Nome do material"),
      purchasePrice: z.number().optional().describe("Preco de compra (R$)"),
      salePrice: z.number().optional().describe("Preco de venda (R$)"),
      tags: z.array(z.string()).optional().describe("Tags para categorizar o material"),
    },
    async (data) => {
      try {
        const material = await prisma.material.create({ data });
        return ok({ message: "Material criado com sucesso.", material });
      } catch (e: any) {
        return err(`Erro ao criar material: ${e.message}`);
      }
    }
  );

  server.tool(
    "update_material",
    "Atualiza dados de um material existente.",
    {
      id: z.string().describe("ID do material"),
      name: z.string().optional().describe("Nome do material"),
      purchasePrice: z.number().optional().describe("Preco de compra (R$)"),
      salePrice: z.number().optional().describe("Preco de venda (R$)"),
      tags: z.array(z.string()).optional().describe("Tags"),
    },
    async ({ id, ...data }) => {
      try {
        const updateData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );
        const material = await prisma.material.update({ where: { id }, data: updateData });
        return ok({ message: "Material atualizado com sucesso.", material });
      } catch (e: any) {
        return err(`Erro ao atualizar material: ${e.message}`);
      }
    }
  );

  // ============================================
  // Service Type Tools
  // ============================================

  server.tool(
    "list_service_types",
    "Lista todos os tipos de servico cadastrados.",
    {},
    async () => {
      try {
        const serviceTypes = await prisma.serviceType.findMany({
          orderBy: { name: "asc" },
        });
        return ok({ serviceTypes, total: serviceTypes.length });
      } catch (e: any) {
        return err(`Erro ao listar tipos de servico: ${e.message}`);
      }
    }
  );

  server.tool(
    "get_service_type",
    "Busca um tipo de servico pelo ID.",
    {
      id: z.string().describe("ID do tipo de servico"),
    },
    async ({ id }) => {
      try {
        const serviceType = await prisma.serviceType.findUnique({
          where: { id },
          include: {
            serviceOrders: {
              include: {
                serviceOrder: {
                  select: { id: true, orderNumber: true, name: true, status: true },
                },
              },
              take: 20,
            },
          },
        });
        if (!serviceType) return err(`Tipo de servico com ID "${id}" nao encontrado.`);
        return ok(serviceType);
      } catch (e: any) {
        return err(`Erro ao buscar tipo de servico: ${e.message}`);
      }
    }
  );

  // ============================================
  // Analytics Tools
  // ============================================

  server.tool(
    "get_dashboard_stats",
    "Retorna estatisticas gerais do dashboard: total de OS, pendentes, em andamento, pagas no mes, receita, total de lojas e funcionarios.",
    {},
    async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const [
          totalOrders,
          notStarted,
          inProgress,
          paidThisMonth,
          measurement,
          returnVisit,
          rework,
          totalStores,
          totalEmployees,
          activeEmployees,
          totalVehicles,
          paidOrdersThisMonth,
        ] = await Promise.all([
          prisma.serviceOrder.count(),
          prisma.serviceOrder.count({ where: { status: "NOT_STARTED" } }),
          prisma.serviceOrder.count({ where: { status: "IN_PROGRESS" } }),
          prisma.serviceOrder.count({
            where: {
              status: "PAID",
              updatedAt: { gte: startOfMonth, lte: endOfMonth },
            },
          }),
          prisma.serviceOrder.count({ where: { status: "MEASUREMENT" } }),
          prisma.serviceOrder.count({ where: { status: "RETURN_VISIT" } }),
          prisma.serviceOrder.count({ where: { status: "REWORK" } }),
          prisma.store.count(),
          prisma.employee.count(),
          prisma.employee.count({ where: { isActive: true } }),
          prisma.vehicle.count({ where: { isActive: true } }),
          prisma.serviceOrder.findMany({
            where: {
              status: "PAID",
              updatedAt: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { totalCost: true },
          }),
        ]);

        const revenueThisMonth = paidOrdersThisMonth.reduce(
          (sum, o) => sum + (o.totalCost || 0),
          0
        );

        return ok({
          serviceOrders: {
            total: totalOrders,
            notStarted,
            inProgress,
            measurement,
            returnVisit,
            rework,
            paidThisMonth,
          },
          revenueThisMonth,
          stores: totalStores,
          employees: { total: totalEmployees, active: activeEmployees },
          vehicles: totalVehicles,
          period: {
            month: now.toLocaleString("pt-BR", { month: "long" }),
            year: now.getFullYear(),
          },
        });
      } catch (e: any) {
        return err(`Erro ao obter estatisticas: ${e.message}`);
      }
    }
  );

  server.tool(
    "search_all",
    "Busca global em todas as entidades: lojas, funcionarios, veiculos, materiais e ordens de servico.",
    {
      q: z.string().describe("Texto para busca global"),
    },
    async ({ q }) => {
      try {
        const [stores, employees, vehicles, materials, serviceOrders] = await Promise.all([
          prisma.store.findMany({
            where: {
              OR: [
                { code: { contains: q, mode: "insensitive" } },
                { sigla: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 10,
            select: { id: true, code: true, sigla: true, city: true, state: true },
          }),
          prisma.employee.findMany({
            where: {
              OR: [
                { shortName: { contains: q, mode: "insensitive" } },
                { fullName: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 10,
            select: { id: true, shortName: true, fullName: true, isActive: true },
          }),
          prisma.vehicle.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { licensePlate: { contains: q, mode: "insensitive" } },
              ],
            },
            take: 10,
            select: { id: true, name: true, licensePlate: true, isActive: true },
          }),
          prisma.material.findMany({
            where: { name: { contains: q, mode: "insensitive" } },
            take: 10,
            select: { id: true, name: true, purchasePrice: true, salePrice: true },
          }),
          prisma.serviceOrder.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                ...(isNaN(parseInt(q, 10)) ? [] : [{ orderNumber: parseInt(q, 10) }]),
              ],
            },
            take: 10,
            select: { id: true, orderNumber: true, name: true, status: true, type: true, date: true },
          }),
        ]);

        return ok({
          query: q,
          results: {
            stores: { items: stores, count: stores.length },
            employees: { items: employees, count: employees.length },
            vehicles: { items: vehicles, count: vehicles.length },
            materials: { items: materials, count: materials.length },
            serviceOrders: { items: serviceOrders, count: serviceOrders.length },
          },
          totalResults:
            stores.length + employees.length + vehicles.length + materials.length + serviceOrders.length,
        });
      } catch (e: any) {
        return err(`Erro na busca global: ${e.message}`);
      }
    }
  );
}
