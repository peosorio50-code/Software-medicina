import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

const kindEnum = z.enum(["ATESTADO", "RECEITA", "DIAGNOSTICO", "RECIBO", "OUTRO"]);
const statusEnum = z.enum(["PENDING", "DONE"]);

const documentInclude = {
  patient: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true, signatureUrl: true, crm: true } },
  appointment: { select: { id: true, startsAt: true } },
  template: { select: { id: true, name: true } },
} as const;

const documentSchema = z.object({
  templateId: z.string().optional(),
  kind: kindEnum,
  patientId: z.string(),
  appointmentId: z.string().optional(),
  doctorId: z.string(),
  title: z.string().min(2),
  content: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  status: statusEnum.optional(),
});

// Lista documentos/recibos da clínica. Filtros: ?kind=RECIBO&status=PENDING&patientId=...
documentsRouter.get("/", async (req, res) => {
  const { kind, status, patientId } = req.query;
  const documents = await prisma.patientDocument.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      ...(typeof kind === "string" ? { kind: kind as any } : {}),
      ...(typeof status === "string" ? { status: status as any } : {}),
      ...(typeof patientId === "string" ? { patientId } : {}),
    },
    include: documentInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json(documents);
});

documentsRouter.post("/", async (req, res) => {
  const parsed = documentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { templateId, kind, patientId, appointmentId, doctorId, title, content, amount, status } =
    parsed.data;

  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, clinicId: req.auth!.clinicId } }),
    prisma.user.findFirst({ where: { id: doctorId, clinicId: req.auth!.clinicId } }),
  ]);
  if (!patient) return res.status(404).json({ error: "Paciente não encontrado" });
  if (!doctor) return res.status(404).json({ error: "Médico não encontrado" });

  if (appointmentId) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId: req.auth!.clinicId },
    });
    if (!appointment) return res.status(404).json({ error: "Consulta não encontrada" });
  }

  const document = await prisma.patientDocument.create({
    data: {
      clinicId: req.auth!.clinicId,
      templateId: templateId || null,
      kind,
      patientId,
      appointmentId: appointmentId || null,
      doctorId,
      title,
      content,
      amount: amount ?? null,
      status: status ?? (kind === "RECIBO" ? "PENDING" : "DONE"),
    },
    include: documentInclude,
  });
  res.status(201).json(document);
});

documentsRouter.patch("/:id/status", async (req, res) => {
  const parsed = z.object({ status: statusEnum }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.patientDocument.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

  const document = await prisma.patientDocument.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
    include: documentInclude,
  });
  res.json(document);
});

documentsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.patientDocument.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Documento não encontrado" });

  await prisma.patientDocument.delete({ where: { id: existing.id } });
  res.status(204).send();
});
