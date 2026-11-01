
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { authenticateUser } from "../middleware/authMiddleware";
import { getIO } from "../socket";

const router = Router();

// GET: Load the latest 100 messages in a group
router.get(
  "/group/:groupId",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.userId;

      // Verify that the user belongs to this group
      const membership = await pool.query(
        `SELECT 1
         FROM trip_group_members
         WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );

      if (membership.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this group",
        });
      }

      // Fetch the latest 100 messages in chronological order
      const result = await pool.query(
        `SELECT *
         FROM (
           SELECT
             gm.id,
             gm.group_id,
             gm.sender_id,
             gm.message,
             gm.created_at,
             p.name AS sender_name,
             p.profile_image_url
           FROM group_messages gm
           JOIN profiles p ON p.id = gm.sender_id
           WHERE gm.group_id = $1
           ORDER BY gm.created_at DESC
           LIMIT 100
         ) AS recent_messages
         ORDER BY created_at ASC`,
        [groupId]
      );

      return res.json({
        success: true,
        messages: result.rows,
      });
    } catch (error) {
      console.error("Fetch messages error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to load messages",
      });
    }
  }
);

// POST: Send a message to a group
router.post(
  "/group/:groupId",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const userId = req.userId;

      const message =
        typeof req.body.message === "string"
          ? req.body.message.trim()
          : "";

      // Validate message
      if (!message || message.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Message must contain between 1 and 2000 characters",
        });
      }

      // Verify group membership
      const membership = await pool.query(
        `SELECT 1
         FROM trip_group_members
         WHERE group_id = $1 AND user_id = $2`,
        [groupId, userId]
      );

      if (membership.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this group",
        });
      }

      // Save message in PostgreSQL
      const result = await pool.query(
        `INSERT INTO group_messages (group_id, sender_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, group_id, sender_id, message, created_at`,
        [groupId, userId, message]
      );

      // Fetch sender details
      const messageResult = await pool.query(
        `SELECT
           gm.id,
           gm.group_id,
           gm.sender_id,
           gm.message,
           gm.created_at,
           p.name AS sender_name,
           p.profile_image_url
         FROM group_messages gm
         JOIN profiles p ON p.id = gm.sender_id
         WHERE gm.id = $1`,
        [result.rows[0].id]
      );

      const savedMessage = messageResult.rows[0];

      // Broadcast the saved message to connected group members
      getIO()?.to(`group:${groupId}`).emit(
        "new_message",
        savedMessage
      );

      return res.status(201).json({
        success: true,
        message: savedMessage,
      });
    } catch (error) {
      console.error("Send message error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to send message",
      });
    }
  }
);

export default router;
