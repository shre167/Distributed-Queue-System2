import express from "express";
import { apiRouter } from "../server/api";

const app = express();

app.use(express.json());
app.use("/api", apiRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

export default app;
