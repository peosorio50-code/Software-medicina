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
