import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  photoUrl: true,
  cpf: true,
  crm: true,
  specialties: true,
  signatureUrl: true,
  createdAt: true,
} as const;

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DOCTOR", "STAFF"]).default("DOCTOR"),
  photoUrl: z.string().url().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  crm: z.string().optional().or(z.literal("")),
  specialties: z.string().optional().or(z.literal("")),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(["ADMIN", "DOCTOR", "STAFF"]).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  crm: z.string().optional().or(z.literal("")),
  specialties: z.string().optional().or(z.literal("")),
  signatureUrl: z.string().optional().or(z.literal("")),
});

usersRouter.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { clinicId: req.auth!.clinicId },
    select: userSelect,
    orderBy: { name: "asc" },
  });
  res.json(users);
});

usersRouter.post("/", async (req, res) => {
  if (req.auth!.role !== "ADMIN") {
    return res.status(403).json({ error: "Apenas administradores podem cadastrar médicos" });
  }

  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, email, password, role, photoUrl, cpf, crm, specialties } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "E-mail já cadastrado" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      clinicId: req.auth!.clinicId,
      name,
      email,
      passwordHash,
      role,
      photoUrl: photoUrl || null,
      cpf: cpf || null,
      crm: crm || null,
      specialties: specialties || null,
    },
    select: userSelect,
  });
  res.status(201).json(user);
});

usersRouter.put("/:id", async (req, res) => {
  const isSelf = req.params.id === req.auth!.userId;
  if (!isSelf && req.auth!.role !== "ADMIN") {
    return res.status(403).json({ error: "Sem permissão para editar este usuário" });
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Usuário não encontrado" });

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, role, photoUrl, cpf, crm, specialties, signatureUrl } = parsed.data;

  if (role && role !== existing.role && req.auth!.role !== "ADMIN") {
    return res.status(403).json({ error: "Apenas administradores podem alterar o cargo" });
  }

  const user = await prisma.user.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(photoUrl !== undefined ? { photoUrl: photoUrl || null } : {}),
      ...(cpf !== undefined ? { cpf: cpf || null } : {}),
      ...(crm !== undefined ? { crm: crm || null } : {}),
      ...(specialties !== undefined ? { specialties: specialties || null } : {}),
      ...(signatureUrl !== undefined ? { signatureUrl: signatureUrl || null } : {}),
    },
    select: userSelect,
  });
  res.json(user);
});

usersRouter.delete("/:id", async (req, res) => {
  if (req.auth!.role !== "ADMIN") {
    return res.status(403).json({ error: "Apenas administradores podem remover usuários" });
  }
  if (req.params.id === req.auth!.userId) {
    return res.status(400).json({ error: "Você não pode remover a si mesmo" });
  }

  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Usuário não encontrado" });

  await prisma.user.delete({ where: { id: existing.id } });
  res.status(204).send();
});
