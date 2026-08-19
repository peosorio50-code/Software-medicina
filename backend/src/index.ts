import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { patientsRouter } from "./routes/patients";
import { appointmentsRouter } from "./routes/appointments";
import { availabilityRouter } from "./routes/availability";
import { requestsRouter } from "./routes/requests";
import { publicRouter } from "./routes/public";
import { clinicRouter } from "./routes/clinic";
import { usersRouter } from "./routes/users";
import { invoicesRouter } from "./routes/invoices";
import { documentTemplatesRouter } from "./routes/documentTemplates";
import { documentsRouter } from "./routes/documents";
import { financeRouter } from "./routes/finance";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRouter);
app.use("/patients", patientsRouter);
app.use("/appointments", appointmentsRouter);
app.use("/availability", availabilityRouter);
app.use("/requests", requestsRouter);
app.use("/public", publicRouter);
app.use("/clinic", clinicRouter);
app.use("/users", usersRouter);
app.use("/invoices", invoicesRouter);
app.use("/document-templates", documentTemplatesRouter);
app.use("/documents", documentsRouter);
app.use("/finance", financeRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 3333;
app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
