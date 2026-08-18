import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { slugify } from "../lib/slug";

export const authRouter = Router();

const registerSchema = z.object({
  clinicName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

function signToken(payload: { userId: string; clinicId: string; role: string }) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { clinicName, name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "E-mail já cadastrado" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const baseSlug = slugify(clinicName) || "clinica";
  let slug = baseSlug;
  for (let attempt = 0; await prisma.clinic.findUnique({ where: { slug } }); attempt++) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) throw new Error("Não foi possível gerar slug único para a clínica");
  }

  const { clinic, user } = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({ data: { name: clinicName, slug } });
    const user = await tx.user.create({
      data: {
        clinicId: clinic.id,
        name,
        email,
        passwordHash,
        role: "ADMIN",
      },
    });
    return { clinic, user };
  });

  const token = signToken({ userId: user.id, clinicId: clinic.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    clinic: { id: clinic.id, name: clinic.name, slug: clinic.slug },
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { clinic: true } });
  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  const token = signToken({ userId: user.id, clinicId: user.clinicId, role: user.role });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    clinic: { id: user.clinic.id, name: user.clinic.name, slug: user.clinic.slug },
  });
});
