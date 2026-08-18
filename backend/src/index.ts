import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { patientsRouter } from "./routes/patients";
import { appointmentsRouter } from "./routes/appointments";
import { availabilityRouter } from "./routes/availability";
import { requestsRouter } from "./routes/requests";
import { publicRouter } from "./routes/public";
import { usersRouter } from "./routes/users";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/patients", patientsRouter);
app.use("/appointments", appointmentsRouter);
app.use("/availability", availabilityRouter);
app.use("/requests", requestsRouter);
app.use("/public", publicRouter);
app.use("/users", usersRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3333;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
