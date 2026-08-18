import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const patientsRouter = Router();
patientsRouter.use(requireAuth);

const patientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  birthDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

patientsRouter.get("/", async (req, res) => {
  const { search } = req.query;
  const patients = await prisma.patient.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      ...(typeof search === "string" && search.length > 0
        ? { name: { contains: search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(patients);
});

patientsRouter.get("/:id", async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!patient) return res.status(404).json({ error: "Paciente não encontrado" });
  res.json(patient);
});

// Resumo do paciente: consultas realizadas/canceladas, documentos e valores pagos.
patientsRouter.get("/:id/summary", async (req, res) => {
  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!patient) return res.status(404).json({ error: "Paciente não encontrado" });

  const [completedAppointments, cancelledAppointments, documents, paidAgg] = await Promise.all([
    prisma.appointment.count({ where: { patientId: patient.id, status: "COMPLETED" } }),
    prisma.appointment.count({
      where: { patientId: patient.id, status: { in: ["CANCELLED", "NO_SHOW"] } },
    }),
    prisma.patientDocument.findMany({
      where: { patientId: patient.id },
      select: { id: true, kind: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financeTransaction.aggregate({
      where: { patientId: patient.id, type: "INCOME", status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    patient,
    completedAppointments,
    cancelledAppointments,
    totalPaid: paidAgg._sum.amount ?? 0,
    documents,
  });
});

patientsRouter.post("/", async (req, res) => {
  const parsed = patientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const patient = await prisma.patient.create({
    data: { ...parsed.data, clinicId: req.auth!.clinicId },
  });
  res.status(201).json(patient);
});

patientsRouter.put("/:id", async (req, res) => {
  const parsed = patientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.patient.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Paciente não encontrado" });

  const patient = await prisma.patient.update({
    where: { id: existing.id },
    data: parsed.data,
  });
  res.json(patient);
});

patientsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.patient.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Paciente não encontrado" });

  await prisma.patient.delete({ where: { id: existing.id } });
  res.status(204).send();
});
