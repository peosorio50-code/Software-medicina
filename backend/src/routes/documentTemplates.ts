import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const documentTemplatesRouter = Router();
documentTemplatesRouter.use(requireAuth);

const kindEnum = z.enum(["ATESTADO", "RECEITA", "DIAGNOSTICO", "RECIBO", "OUTRO"]);

const templateSchema = z.object({
  kind: kindEnum,
  name: z.string().min(2),
  content: z.string().optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

// Lista os templates padrão do sistema (clinicId nulo) + os personalizados da clínica.
documentTemplatesRouter.get("/", async (req, res) => {
  const { kind } = req.query;
  const templates = await prisma.documentTemplate.findMany({
    where: {
      OR: [{ clinicId: null }, { clinicId: req.auth!.clinicId }],
      ...(typeof kind === "string" ? { kind: kind as any } : {}),
    },
    orderBy: [{ clinicId: "asc" }, { name: "asc" }],
  });
  res.json(templates);
});

documentTemplatesRouter.post("/", async (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { kind, name, content, fileUrl } = parsed.data;

  const template = await prisma.documentTemplate.create({
    data: {
      clinicId: req.auth!.clinicId,
      kind,
      name,
      content: content || null,
      fileUrl: fileUrl || null,
    },
  });
  res.status(201).json(template);
});

documentTemplatesRouter.put("/:id", async (req, res) => {
  const existing = await prisma.documentTemplate.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.clinicId !== req.auth!.clinicId) {
    return res.status(404).json({ error: "Template não encontrado" });
  }

  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { kind, name, content, fileUrl } = parsed.data;

  const template = await prisma.documentTemplate.update({
    where: { id: existing.id },
    data: {
      ...(kind !== undefined ? { kind } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(content !== undefined ? { content: content || null } : {}),
      ...(fileUrl !== undefined ? { fileUrl: fileUrl || null } : {}),
    },
  });
  res.json(template);
});

documentTemplatesRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.documentTemplate.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.clinicId !== req.auth!.clinicId) {
    return res.status(404).json({ error: "Template não encontrado" });
  }

  await prisma.documentTemplate.delete({ where: { id: existing.id } });
  res.status(204).send();
});
