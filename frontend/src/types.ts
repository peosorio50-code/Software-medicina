export interface DoctorUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "DOCTOR" | "STAFF";
  photoUrl?: string | null;
  cpf?: string | null;
  crm?: string | null;
  specialties?: string | null;
  signatureUrl?: string | null;
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type DocumentKind = "ATESTADO" | "RECEITA" | "DIAGNOSTICO" | "RECIBO" | "OUTRO";
export type DocumentStatus = "PENDING" | "DONE";

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  ATESTADO: "Atestado",
  RECEITA: "Receita",
  DIAGNOSTICO: "Diagnóstico",
  RECIBO: "Recibo",
  OUTRO: "Outro",
};

// ---------- IA ----------
// Espelham os tipos do backend em backend/src/lib/clinicInsights.ts.

export interface InactivePatient {
  id: string;
  name: string;
  phone: string | null;
  ultimaConsulta: string;
  diasSemVir: number;
  totalConsultas: number;
  intervaloMedioDias: number | null;
  // Quantas vezes o tempo de sumiço passou do ritmo habitual do paciente.
  fatorAtraso: number | null;
}

export interface AgendaStats {
  periodo: { de: string; ate: string };
  total: number;
  porStatus: Record<string, number>;
  taxaFaltaPercent: number;
  taxaCancelamentoPercent: number;
  porFaixaHoraria: { faixa: string; total: number; faltas: number; cancelamentos: number }[];
  diaMaisCheio: { dia: string; total: number } | null;
}
