import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { patientsRouter } from "./routes/patients";
import { appointmentsRouter } from "./routes/appointments";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/patients", patientsRouter);
app.use("/appointments", appointmentsRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3333;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
