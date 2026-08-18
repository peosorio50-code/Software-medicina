import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);

const statusEnum = z.enum(["PENDING", "ISSUED", "CANCELLED"]);

const invoiceSchema = z.object({
  patientId: z.string().optional(),
  number: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  status: statusEnum.optional(),
  issueDate: z.coerce.date(),
});

invoicesRouter.get("/", async (req, res) => {
  const { status, patientId } = req.query;
  const invoices = await prisma.invoice.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      ...(typeof status === "string" ? { status: status as any } : {}),
      ...(typeof patientId === "string" ? { patientId } : {}),
    },
    include: { patient: { select: { id: true, name: true } } },
    orderBy: { issueDate: "desc" },
  });
  res.json(invoices);
});

invoicesRouter.post("/", async (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { patientId, status, ...rest } = parsed.data;

  const invoice = await prisma.invoice.create({
    data: { ...rest, patientId: patientId || null, status: status ?? "PENDING", clinicId: req.auth!.clinicId },
    include: { patient: { select: { id: true, name: true } } },
  });
  res.status(201).json(invoice);
});

invoicesRouter.patch("/:id/status", async (req, res) => {
  const parsed = z.object({ status: statusEnum }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Nota fiscal não encontrada" });

  const invoice = await prisma.invoice.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
    include: { patient: { select: { id: true, name: true } } },
  });
  res.json(invoice);
});

invoicesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.invoice.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Nota fiscal não encontrada" });

  await prisma.invoice.delete({ where: { id: existing.id } });
  res.status(204).send();
});
