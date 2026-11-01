import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { setIO } from "./socket";

import profileRoutes from "./routes/profileRoutes";
import tripRoutes from "./routes/tripRoutes";
import tripRequestRoutes from "./routes/tripRequestRoutes";
import groupRoutes from "./routes/groupRoutes";
import messageRoutes from "./routes/messageRoutes";
  
dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = Number(process.env.PORT) || 3000;

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.use("/api/profiles", profileRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trip-requests", tripRequestRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);


app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Yaari backend is running",
  });
});

// Verify every Socket.IO connection using the Supabase access token
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication token required"));
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      return next(new Error("Authentication service is not configured"));
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return next(new Error("Invalid or expired authentication token"));
    }

    const user = await response.json();

    if (!user?.id) {
      return next(new Error("Unable to identify user"));
    }

    socket.data.userId = user.id;
    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Socket authentication failed"));
  }
});

// Allow authenticated users to join only groups they belong to
io.on("connection", (socket) => {
  console.log("Authenticated client connected:", socket.id);

  socket.on("join_group", async (groupId: string, callback?: (result: any) => void) => {
    try {
      if (typeof groupId !== "string" || !groupId.trim()) {
        callback?.({ success: false, message: "Invalid group ID" });
        return;
      }

      const membership = await pool.query(
        `SELECT 1
         FROM trip_group_members
         WHERE group_id = $1 AND user_id = $2`,
        [groupId, socket.data.userId]
      );

      if (membership.rows.length === 0) {
        callback?.({ success: false, message: "You are not a member of this group" });
        return;
      }

      socket.join(`group:${groupId}`);
      callback?.({ success: true });
    } catch (error) {
      console.error("Join group socket error:", error);
      callback?.({ success: false, message: "Could not join group" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// PostgreSQL connection check
pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected successfully");
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error);
  });

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Yaari backend running on port ${PORT}`);
});