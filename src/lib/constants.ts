export const STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Não iniciada",
  IN_PROGRESS: "Em andamento",
  RETURN_VISIT: "Retorno",
  MEASUREMENT: "Medição",
  PAID: "Pago",
  REWORK: "Retrabalho",
};

export const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-zinc-500",
  IN_PROGRESS: "bg-blue-500",
  RETURN_VISIT: "bg-pink-500",
  MEASUREMENT: "bg-green-500",
  PAID: "bg-emerald-600",
  REWORK: "bg-red-500",
};

export const TYPE_LABELS: Record<string, string> = {
  GENERAL: "Geral",
  ALARM: "Alarme",
  LED: "LED",
};

export const PRIORITY_LABELS: Record<number, string> = {
  0: "",
  1: "\u2B50",
  2: "\u2B50\u2B50",
  3: "\u2B50\u2B50\u2B50",
};

export const DAY_LABELS: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
};

export const DAY_SHORT_LABELS: Record<number, string> = {
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
};
