import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGenerateRouter } from "./server/routes/generate.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    message: "Vlog Spark Lab backend is ready.",
    generatedAt: new Date().toISOString()
  });
});

app.use("/api", createGenerateRouter());

app.get("*", (_request, response) => {
  response.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Vlog Spark Lab server running at http://localhost:${port}`);
});
