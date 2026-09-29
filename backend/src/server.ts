import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db";
import profileRoutes from "./routes/profileRoutes";
import tripRoutes from "./routes/tripRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/profiles", profileRoutes);
app.use("/api/trips", tripRoutes);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Yaari backend is running",
  });
});
// db postggrace

pool.query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected successfully");
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error);
  });

app.listen(PORT, () => {
  console.log(`Yaari backend running on port ${PORT}`);
});