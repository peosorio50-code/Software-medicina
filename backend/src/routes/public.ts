import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

export const publicRouter = Router();

async function findClinicBySlug(slug: string) {
  return prisma.clinic.findUnique({ where: { slug }, select: { id: true, name: true, slug: true } });
}

// Dados públicos da clínica + médicos com horários abertos
publicRouter.get("/:slug", async (req, res) => {
  const clinic = await findClinicBySlug(req.params.slug);
  if (!clinic) return res.status(404).json({ error: "Agenda não encontrada" });

  const now = new Date();
  const doctors = await prisma.availabilitySlot.findMany({
    where: { clinicId: clinic.id, status: "OPEN", startsAt: { gt: now } },
    distinct: ["doctorId"],
    select: { doctor: { select: { id: true, name: true } } },
    orderBy: { doctorId: "asc" },
  });

  res.json({
    clinic,
    doctors: doctors.map((d) => d.doctor),
  });
});

// Lista horários livres para um médico dessa clínica
publicRouter.get("/:slug/availability", async (req, res) => {
  const clinic = await findClinicBySlug(req.params.slug);
  if (!clinic) return res.status(404).json({ error: "Agenda não encontrada" });

  const { doctorId, from, to } = req.query;
  if (typeof doctorId !== "string") {
    return res.status(400).json({ error: "doctorId é obrigatório" });
  }

  const now = new Date();
  const defaultEnd = new Date(now);
  defaultEnd.setDate(defaultEnd.getDate() + 30);

  const rangeStart = typeof from === "string" && new Date(from) > now ? new Date(from) : now;
  const rangeEnd = typeof to === "string" ? new Date(to) : defaultEnd;

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      clinicId: clinic.id,
      doctorId,
      status: "OPEN",
      startsAt: { gte: rangeStart, lt: rangeEnd },
    },
    select: { id: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });
  res.json(slots);
});

const requestSchema = z.object({
  doctorId: z.string(),
  slotIds: z.array(z.string()).min(1).max(5),
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

// Paciente "levanta a mão" para um ou mais horários
publicRouter.post("/:slug/requests", async (req, res) => {
  const clinic = await findClinicBySlug(req.params.slug);
  if (!clinic) return res.status(404).json({ error: "Agenda não encontrada" });

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { doctorId, slotIds, name, phone, email, notes } = parsed.data;

  const uniqueSlotIds = [...new Set(slotIds)];
  const slots = await prisma.availabilitySlot.findMany({
    where: {
      id: { in: uniqueSlotIds },
      clinicId: clinic.id,
      doctorId,
      status: "OPEN",
      startsAt: { gt: new Date() },
    },
  });
  if (slots.length !== uniqueSlotIds.length) {
    return res.status(409).json({
      error: "Um ou mais horários selecionados não estão mais disponíveis. Atualize a página e tente novamente.",
    });
  }

  const patient = await prisma.patient.findFirst({
    where: { clinicId: clinic.id, phone },
  });
  const patientRecord = patient
    ? await prisma.patient.update({
        where: { id: patient.id },
        data: { name, email: email || patient.email },
      })
    : await prisma.patient.create({
        data: { clinicId: clinic.id, name, phone, email: email || undefined },
      });

  const groupId = randomUUID();
  await prisma.slotRequest.createMany({
    data: slots.map((slot) => ({
      clinicId: clinic.id,
      slotId: slot.id,
      patientId: patientRecord.id,
      groupId,
      note: notes,
    })),
  });

  res.status(201).json({
    groupId,
    slots: slots
      .map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt }))
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
  });
});
