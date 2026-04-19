import { z } from "zod";

export const storeSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  sigla: z.string().min(1, "Sigla é obrigatória"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "UF é obrigatório").max(2),
  address: z.string().min(1, "Endereço é obrigatório"),
  cep: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  stateRegistration: z.string().nullable().optional(),
  constructionCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  kmRoundTrip: z.number().nullable().optional(),
  tollRoundTrip: z.number().nullable().optional(),
  storeNumber: z.number().int().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const employeeSchema = z.object({
  shortName: z.string().min(1, "Nome é obrigatório"),
  fullName: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const vehicleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  licensePlate: z.string().min(1, "Placa é obrigatória"),
  isActive: z.boolean().optional().default(true),
});

export const serviceTypeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  tags: z.array(z.string()).optional().default([]),
});

export const materialSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  purchasePrice: z.number().nullable().optional(),
  salePrice: z.number().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export const teamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  driverId: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  memberIds: z.array(z.string()).optional().default([]),
  memberDetails: z
    .array(
      z.object({
        employeeId: z.string(),
        rank: z.number().int().optional().default(0),
        isLeader: z.boolean().optional().default(false),
      }),
    )
    .optional()
    .default([]),
});

export const serviceOrderSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  status: z
    .enum([
      "NOT_STARTED",
      "IN_PROGRESS",
      "RETURN_VISIT",
      "MEASUREMENT",
      "PAID",
      "REWORK",
    ])
    .optional()
    .default("NOT_STARTED"),
  priority: z.number().int().min(0).max(3).optional().default(0),
  type: z.enum(["GENERAL", "ALARM", "LED"]).optional().default("GENERAL"),
  date: z.string().datetime().nullable().optional(),
  warranty: z.boolean().optional().default(false),
  isObra: z.boolean().optional().default(false),
  vehicleId: z.string().nullable().optional(),
  // Report fields
  numeroChamado: z.string().nullable().optional(),
  solicitadoPor: z.string().nullable().optional(),
  enderecoAtendimento: z.string().nullable().optional(),
  servicoSolicitado: z.string().nullable().optional(),
  // KM & pricing
  kmIdaVolta: z.number().nullable().optional(),
  kmRodada: z.number().nullable().optional(),
  precoKm: z.number().nullable().optional(),
  // Financial
  kmDiscount: z.number().nullable().optional(),
  tollDiscount: z.number().nullable().optional(),
  parking: z.number().nullable().optional(),
  mealAllowance: z.number().nullable().optional(),
  overnightAllowance: z.number().nullable().optional(),
  materialCost: z.number().nullable().optional(),
  transportCost: z.number().nullable().optional(),
  laborCost: z.number().nullable().optional(),
  manHours: z.number().nullable().optional(),
  extraHours: z.number().nullable().optional(),
  horasDia: z.number().nullable().optional(),
  totalCost: z.number().nullable().optional(),
  materialsUsedNotes: z.string().nullable().optional(),
  servicesPerformed: z.string().nullable().optional(),
  managerComment: z.string().nullable().optional(),
  managerSignatureUrl: z.string().nullable().optional(),
  // Execution fields (filled by technician / store manager)
  technicianNotes: z.string().nullable().optional(),
  materialsDescribed: z.string().nullable().optional(),
  clientRating: z.string().nullable().optional(),
  clientComment: z.string().nullable().optional(),
  receivedByName: z.string().nullable().optional(),
  receivedByCargo: z.string().nullable().optional(),
  executionDate: z.string().datetime().nullable().optional(),
  entryTime: z.string().nullable().optional(),
  exitTime: z.string().nullable().optional(),
  executedByName: z.string().nullable().optional(),
  executedByCargo: z.string().nullable().optional(),
  // Relations
  storeIds: z.array(z.string()).optional().default([]),
  serviceTypeIds: z.array(z.string()).optional().default([]),
  materialIds: z.array(z.string()).optional().default([]),
  // Teams
  teamIds: z.array(z.string()).optional().default([]),
  // Per-material quantity/price tracking
  materialDetails: z
    .array(
      z.object({
        materialId: z.string(),
        quantity: z.number().nullable().optional(),
        unitPrice: z.number().nullable().optional(),
      }),
    )
    .optional()
    .default([]),
});

export type TeamInput = z.infer<typeof teamSchema>;
export type StoreInput = z.infer<typeof storeSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type ServiceOrderInput = z.infer<typeof serviceOrderSchema>;
