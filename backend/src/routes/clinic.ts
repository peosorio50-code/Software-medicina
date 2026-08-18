import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const clinicRouter = Router();
clinicRouter.use(requireAuth);

const clinicSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

clinicRouter.get("/", async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { id: req.auth!.clinicId } });
  if (!clinic) return res.status(404).json({ error: "Clínica não encontrada" });
  res.json(clinic);
});

clinicRouter.put("/", async (req, res) => {
  if (req.auth!.role !== "ADMIN") {
    return res.status(403).json({ error: "Apenas administradores podem editar o consultório" });
  }

  const parsed = clinicSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, phone, logoUrl } = parsed.data;

  const clinic = await prisma.clinic.update({
    where: { id: req.auth!.clinicId },
    data: {
      name,
      email: email || null,
      phone: phone || null,
      logoUrl: logoUrl || null,
    },
  });
  res.json(clinic);
});

// Exporta todos os dados da clínica (LGPD: portabilidade de dados).
clinicRouter.get("/export", async (req, res) => {
  const clinicId = req.auth!.clinicId;

  const [clinic, users, patients, appointments, invoices] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    prisma.user.findMany({
      where: { clinicId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        cpf: true,
        crm: true,
        specialties: true,
        createdAt: true,
      },
    }),
    prisma.patient.findMany({ where: { clinicId } }),
    prisma.appointment.findMany({ where: { clinicId } }),
    prisma.invoice.findMany({ where: { clinicId } }),
  ]);

  res.setHeader("Content-Disposition", `attachment; filename="dados-consultorio-${clinicId}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    clinic,
    users,
    patients,
    appointments,
    invoices,
  });
});
