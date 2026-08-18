import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const availabilityRouter = Router();
availabilityRouter.use(requireAuth);

const slotSchema = z.object({
  doctorId: z.string(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

const bulkSchema = z.object({
  doctorId: z.string(),
  from: z.coerce.date(),
  to: z.coerce.date(),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().min(5).max(240),
});

async function hasConflict(clinicId: string, doctorId: string, startsAt: Date, endsAt: Date) {
  const [slotConflict, appointmentConflict] = await Promise.all([
    prisma.availabilitySlot.findFirst({
      where: {
        clinicId,
        doctorId,
        status: { not: "CLOSED" },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    }),
    prisma.appointment.findFirst({
      where: {
        clinicId,
        doctorId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    }),
  ]);
  return Boolean(slotConflict || appointmentConflict);
}

// Lista horários de disponibilidade (default: próximos 14 dias)
availabilityRouter.get("/", async (req, res) => {
  const { doctorId, from, to, status } = req.query;

  const now = new Date();
  const twoWeeksAhead = new Date(now);
  twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14);

  const rangeStart = typeof from === "string" ? new Date(from) : now;
  const rangeEnd = typeof to === "string" ? new Date(to) : twoWeeksAhead;

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      startsAt: { gte: rangeStart, lt: rangeEnd },
      ...(typeof doctorId === "string" ? { doctorId } : {}),
      ...(typeof status === "string" ? { status: status as "OPEN" | "BOOKED" | "CLOSED" } : {}),
    },
    include: {
      doctor: { select: { id: true, name: true } },
      requests: {
        where: { status: "PENDING" },
        select: { id: true },
      },
    },
    orderBy: { startsAt: "asc" },
  });
  res.json(slots);
});

availabilityRouter.post("/", async (req, res) => {
  const parsed = slotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { doctorId, startsAt, endsAt } = parsed.data;

  if (endsAt <= startsAt) {
    return res.status(400).json({ error: "endsAt deve ser depois de startsAt" });
  }

  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, clinicId: req.auth!.clinicId },
  });
  if (!doctor) return res.status(404).json({ error: "Médico não encontrado" });

  if (await hasConflict(req.auth!.clinicId, doctorId, startsAt, endsAt)) {
    return res.status(409).json({ error: "Horário conflita com outra disponibilidade ou consulta" });
  }

  const slot = await prisma.availabilitySlot.create({
    data: { clinicId: req.auth!.clinicId, doctorId, startsAt, endsAt },
    include: { doctor: { select: { id: true, name: true } } },
  });
  res.status(201).json(slot);
});

// Gera vários horários livres de uma vez a partir de uma janela recorrente
// (ex: seg/qua/sex das 08:00 às 12:00, a cada 30min, pelas próximas 3 semanas)
availabilityRouter.post("/bulk", async (req, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { doctorId, from, to, weekdays, startTime, endTime, slotMinutes } = parsed.data;

  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, clinicId: req.auth!.clinicId },
  });
  if (!doctor) return res.status(404).json({ error: "Médico não encontrado" });

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const dailyStartMinutes = startH * 60 + startM;
  const dailyEndMinutes = endH * 60 + endM;
  if (dailyEndMinutes <= dailyStartMinutes) {
    return res.status(400).json({ error: "endTime deve ser depois de startTime" });
  }

  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setHours(0, 0, 0, 0);
  if (toDay < fromDay) {
    return res.status(400).json({ error: "to deve ser depois de from" });
  }
  const spanDays = (toDay.getTime() - fromDay.getTime()) / 86_400_000;
  if (spanDays > 90) {
    return res.status(400).json({ error: "Intervalo máximo de 90 dias por geração" });
  }

  const candidates: { startsAt: Date; endsAt: Date }[] = [];
  for (let dayOffset = 0; dayOffset <= spanDays; dayOffset++) {
    const day = new Date(fromDay);
    day.setDate(day.getDate() + dayOffset);
    if (weekdays && weekdays.length > 0 && !weekdays.includes(day.getDay())) continue;

    for (
      let minutes = dailyStartMinutes;
      minutes + slotMinutes <= dailyEndMinutes;
      minutes += slotMinutes
    ) {
      const startsAt = new Date(day);
      startsAt.setMinutes(minutes);
      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + slotMinutes);
      candidates.push({ startsAt, endsAt });
    }
  }

  if (candidates.length === 0) {
    return res.status(400).json({ error: "Nenhum horário gerado com esses parâmetros" });
  }
  if (candidates.length > 500) {
    return res.status(400).json({ error: "Geraria mais de 500 horários; reduza o intervalo" });
  }

  const existing = await prisma.availabilitySlot.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      doctorId,
      status: { not: "CLOSED" },
      startsAt: { gte: fromDay, lt: new Date(toDay.getTime() + 86_400_000) },
    },
    select: { startsAt: true, endsAt: true },
  });
  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      doctorId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { gte: fromDay, lt: new Date(toDay.getTime() + 86_400_000) },
    },
    select: { startsAt: true, endsAt: true },
  });
  const taken = [...existing, ...appointments];

  const toCreate = candidates.filter(
    (c) => !taken.some((t) => c.startsAt < t.endsAt && c.endsAt > t.startsAt),
  );
  const skipped = candidates.length - toCreate.length;

  const created = await prisma.availabilitySlot.createMany({
    data: toCreate.map((c) => ({
      clinicId: req.auth!.clinicId,
      doctorId,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
    })),
  });

  res.status(201).json({ created: created.count, skipped });
});

// "Remove" um horário livre da agenda pública (soft close, preserva histórico
// de solicitações já feitas para ele).
availabilityRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.availabilitySlot.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Horário não encontrado" });
  if (existing.status === "BOOKED") {
    return res.status(409).json({ error: "Horário já agendado, cancele a consulta em vez disso" });
  }

  await prisma.$transaction([
    prisma.availabilitySlot.update({ where: { id: existing.id }, data: { status: "CLOSED" } }),
    prisma.slotRequest.updateMany({
      where: { slotId: existing.id, status: "PENDING" },
      data: { status: "DECLINED" },
    }),
  ]);
  res.status(204).send();
});
