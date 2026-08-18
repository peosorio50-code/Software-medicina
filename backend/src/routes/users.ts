import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get("/", async (req, res) => {
  const users = await prisma.user.findMany({
    where: { clinicId: req.auth!.clinicId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});
