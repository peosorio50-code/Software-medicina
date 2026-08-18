import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const appointmentsRouter = Router();
appointmentsRouter.use(requireAuth);

const appointmentSchema = z.object({
  patientId: z.string(),
  doctorId: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  notes: z.string().optional(),
});

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
});

// Lista consultas em um período (default: hoje). Ex: ?from=2026-08-18&to=2026-08-19
appointmentsRouter.get("/", async (req, res) => {
  const { from, to, doctorId } = req.query;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const rangeStart = typeof from === "string" ? new Date(from) : startOfToday;
  const rangeEnd = typeof to === "string" ? new Date(to) : endOfToday;

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      startsAt: { gte: rangeStart, lt: rangeEnd },
      ...(typeof doctorId === "string" ? { doctorId } : {}),
    },
    include: { patient: true, doctor: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });
  res.json(appointments);
});

appointmentsRouter.post("/", async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { patientId, doctorId, startsAt, endsAt, notes } = parsed.data;

  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "endsAt deve ser depois de startsAt" });
  }

  const [patient, doctor] = await Promise.all([
    prisma.patient.findFirst({ where: { id: patientId, clinicId: req.auth!.clinicId } }),
    prisma.user.findFirst({ where: { id: doctorId, clinicId: req.auth!.clinicId } }),
  ]);
  if (!patient) return res.status(404).json({ error: "Paciente não encontrado" });
  if (!doctor) return res.status(404).json({ error: "Médico não encontrado" });

  const conflict = await prisma.appointment.findFirst({
    where: {
      clinicId: req.auth!.clinicId,
      doctorId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict) {
    return res.status(409).json({ error: "Horário conflita com outra consulta do médico" });
  }

  const appointment = await prisma.appointment.create({
    data: { clinicId: req.auth!.clinicId, patientId, doctorId, startsAt, endsAt, notes },
    include: { patient: true, doctor: { select: { id: true, name: true } } },
  });
  res.status(201).json(appointment);
});

appointmentsRouter.patch("/:id/status", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.appointment.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Consulta não encontrada" });

  const appointment = await prisma.appointment.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });
  res.json(appointment);
});

appointmentsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.appointment.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Consulta não encontrada" });

  await prisma.appointment.delete({ where: { id: existing.id } });
  res.status(204).send();
});
