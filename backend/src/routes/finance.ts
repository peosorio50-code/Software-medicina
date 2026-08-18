import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const financeRouter = Router();
financeRouter.use(requireAuth);

const typeEnum = z.enum(["INCOME", "EXPENSE"]);
const statusEnum = z.enum(["PENDING", "COMPLETED", "CANCELLED"]);
const periodEnum = z.enum(["WEEKLY", "MONTHLY", "YEARLY"]);

function addPeriod(date: Date, period: "WEEKLY" | "MONTHLY" | "YEARLY") {
  const next = new Date(date);
  if (period === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (period === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);
  return next;
}

// Materializa em FinanceTransaction as ocorrências de recorrências ativas
// já vencidas (até hoje) que ainda não foram geradas. Chamado sob demanda,
// já que não há um agendador/cron nesta aplicação.
async function generateDueTransactions(clinicId: string) {
  const now = new Date();
  const recurrences = await prisma.financeRecurrence.findMany({
    where: { clinicId, active: true, startDate: { lte: now } },
  });

  for (const rec of recurrences) {
    const lastTx = await prisma.financeTransaction.findFirst({
      where: { recurrenceId: rec.id },
      orderBy: { date: "desc" },
    });

    let nextDate = lastTx ? addPeriod(lastTx.date, rec.period) : rec.startDate;
    let guard = 0;
    while (nextDate <= now && (!rec.endDate || nextDate <= rec.endDate) && guard < 500) {
      await prisma.financeTransaction.create({
        data: {
          clinicId,
          type: rec.type,
          status: "PENDING",
          categoryId: rec.categoryId,
          recurrenceId: rec.id,
          description: rec.description,
          amount: rec.amount,
          date: nextDate,
        },
      });
      nextDate = addPeriod(nextDate, rec.period);
      guard++;
    }
  }
}

// ---------- Categorias ----------

const categorySchema = z.object({ type: typeEnum, name: z.string().min(1) });

financeRouter.get("/categories", async (req, res) => {
  const { type } = req.query;
  const categories = await prisma.financeCategory.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      ...(typeof type === "string" ? { type: type as any } : {}),
    },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

financeRouter.post("/categories", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const category = await prisma.financeCategory.create({
    data: { ...parsed.data, clinicId: req.auth!.clinicId },
  });
  res.status(201).json(category);
});

financeRouter.delete("/categories/:id", async (req, res) => {
  const existing = await prisma.financeCategory.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Categoria não encontrada" });

  await prisma.financeCategory.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// ---------- Recorrências ----------

const recurrenceSchema = z.object({
  categoryId: z.string().optional(),
  type: typeEnum,
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  period: periodEnum,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

financeRouter.get("/recurrences", async (req, res) => {
  const recurrences = await prisma.financeRecurrence.findMany({
    where: { clinicId: req.auth!.clinicId },
    include: { category: true },
    orderBy: { startDate: "desc" },
  });
  res.json(recurrences);
});

financeRouter.post("/recurrences", async (req, res) => {
  const parsed = recurrenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const recurrence = await prisma.financeRecurrence.create({
    data: { ...parsed.data, categoryId: parsed.data.categoryId || null, clinicId: req.auth!.clinicId },
    include: { category: true },
  });
  res.status(201).json(recurrence);
});

financeRouter.put("/recurrences/:id", async (req, res) => {
  const existing = await prisma.financeRecurrence.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Recorrência não encontrada" });

  const parsed = recurrenceSchema.partial().extend({ active: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { categoryId, ...rest } = parsed.data;

  const recurrence = await prisma.financeRecurrence.update({
    where: { id: existing.id },
    data: { ...rest, ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}) },
    include: { category: true },
  });
  res.json(recurrence);
});

financeRouter.delete("/recurrences/:id", async (req, res) => {
  const existing = await prisma.financeRecurrence.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Recorrência não encontrada" });

  await prisma.financeRecurrence.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// ---------- Transações ----------

const transactionInclude = {
  category: true,
  patient: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true } },
} as const;

const transactionSchema = z.object({
  type: typeEnum,
  status: statusEnum.optional(),
  categoryId: z.string().optional(),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  appointmentId: z.string().optional(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  date: z.coerce.date(),
});

function dateRangeFromQuery(req: import("express").Request) {
  const { from, to } = req.query;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const rangeStart = typeof from === "string" ? new Date(from) : startOfMonth;
  const rangeEnd = typeof to === "string" ? new Date(to) : endOfToday;
  return { rangeStart, rangeEnd };
}

financeRouter.get("/transactions", async (req, res) => {
  await generateDueTransactions(req.auth!.clinicId);

  const { doctorId, type, status, categoryId } = req.query;
  const { rangeStart, rangeEnd } = dateRangeFromQuery(req);

  const transactions = await prisma.financeTransaction.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      date: { gte: rangeStart, lte: rangeEnd },
      ...(typeof doctorId === "string" ? { doctorId } : {}),
      ...(typeof type === "string" ? { type: type as any } : {}),
      ...(typeof status === "string" ? { status: status as any } : {}),
      ...(typeof categoryId === "string" ? { categoryId } : {}),
    },
    include: transactionInclude,
    orderBy: { date: "desc" },
  });
  res.json(transactions);
});

financeRouter.post("/transactions", async (req, res) => {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { categoryId, patientId, doctorId, appointmentId, ...rest } = parsed.data;

  const transaction = await prisma.financeTransaction.create({
    data: {
      ...rest,
      clinicId: req.auth!.clinicId,
      categoryId: categoryId || null,
      patientId: patientId || null,
      doctorId: doctorId || null,
      appointmentId: appointmentId || null,
      status: parsed.data.status ?? "PENDING",
    },
    include: transactionInclude,
  });
  res.status(201).json(transaction);
});

financeRouter.patch("/transactions/:id/status", async (req, res) => {
  const parsed = z.object({ status: statusEnum }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.financeTransaction.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Transação não encontrada" });

  const transaction = await prisma.financeTransaction.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
    include: transactionInclude,
  });
  res.json(transaction);
});

financeRouter.delete("/transactions/:id", async (req, res) => {
  const existing = await prisma.financeTransaction.findFirst({
    where: { id: req.params.id, clinicId: req.auth!.clinicId },
  });
  if (!existing) return res.status(404).json({ error: "Transação não encontrada" });

  await prisma.financeTransaction.delete({ where: { id: existing.id } });
  res.status(204).send();
});

// ---------- Resumo (dashboard financeiro) ----------

financeRouter.get("/summary", async (req, res) => {
  await generateDueTransactions(req.auth!.clinicId);

  const { doctorId } = req.query;
  const { rangeStart, rangeEnd } = dateRangeFromQuery(req);

  const transactions = await prisma.financeTransaction.findMany({
    where: {
      clinicId: req.auth!.clinicId,
      date: { gte: rangeStart, lte: rangeEnd },
      ...(typeof doctorId === "string" ? { doctorId } : {}),
    },
  });

  const income = transactions.filter((t) => t.type === "INCOME");
  const expense = transactions.filter((t) => t.type === "EXPENSE");

  const sum = (list: typeof transactions) => list.reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = sum(income);
  const totalExpense = sum(expense);
  const received = sum(income.filter((t) => t.status === "COMPLETED"));
  const receivable = sum(income.filter((t) => t.status === "PENDING"));
  const cancelled = sum(income.filter((t) => t.status === "CANCELLED"));

  const completedIncome = income.filter((t) => t.status === "COMPLETED");
  const patientsAttended = new Set(completedIncome.map((t) => t.patientId).filter(Boolean)).size;
  const averageTicket = patientsAttended > 0 ? received / patientsAttended : 0;

  res.json({
    from: rangeStart,
    to: rangeEnd,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    received,
    receivable,
    cancelled,
    patientsAttended,
    averageTicket,
  });
});
