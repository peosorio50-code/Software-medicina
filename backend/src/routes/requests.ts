import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const requestsRouter = Router();
requestsRouter.use(requireAuth);

// Lista solicitações de horário feitas por pacientes ("mãos levantadas")
requestsRouter.get("/", async (req, res) => {
  const { status } = req.query;

  const requests = await prisma.slotRequest.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      ...(typeof status === "string" ? { status: status as "PENDING" | "CONFIRMED" | "DECLINED" | "CANCELLED" } : {}),
    },
    include: {
      patient: true,
      slot: { include: { doctor: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

requestsRouter.patch("/:id/confirm", async (req, res) => {
  const existing = await prisma.slotRequest.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
    include: { slot: true },
  });
  if (!existing) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (existing.status !== "PENDING") {
    return res.status(409).json({ error: "Solicitação já foi respondida" });
  }
  if (existing.slot.status !== "OPEN") {
    return res.status(409).json({ error: "Esse horário não está mais disponível" });
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.create({
      data: {
        clinicId: req.auth!.clinicId,
        patientId: existing.patientId,
        doctorId: existing.slot.doctorId,
        startsAt: existing.slot.startsAt,
        endsAt: existing.slot.endsAt,
        status: "CONFIRMED",
      },
      include: { patient: true, doctor: { select: { id: true, name: true } } },
    });

    await tx.availabilitySlot.update({
      where: { id: existing.slotId },
      data: { status: "BOOKED" },
    });

    await tx.slotRequest.update({
      where: { id: existing.id },
      data: { status: "CONFIRMED" },
    });

    // outros pacientes que levantaram a mão para o mesmo horário perdem a vaga
    await tx.slotRequest.updateMany({
      where: { slotId: existing.slotId, status: "PENDING", id: { not: existing.id } },
      data: { status: "DECLINED" },
    });

    // outras opções de horário que esse mesmo paciente pediu na mesma leva ficam sem efeito
    await tx.slotRequest.updateMany({
      where: { groupId: existing.groupId, status: "PENDING", id: { not: existing.id } },
      data: { status: "CANCELLED" },
    });

    return appointment;
  });

  res.json(appointment);
});

requestsRouter.patch("/:id/decline", async (req, res) => {
  const existing = await prisma.slotRequest.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Solicitação não encontrada" });
  if (existing.status !== "PENDING") {
    return res.status(409).json({ error: "Solicitação já foi respondida" });
  }

  const request = await prisma.slotRequest.update({
    where: { id: existing.id },
    data: { status: "DECLINED" },
  });
  res.json(request);
});
