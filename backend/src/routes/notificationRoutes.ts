
import { Router, Request, Response } from "express";
import { pool } from "../db";
import { authenticateUser } from "../middleware/authMiddleware";

const router = Router();

// GET: Fetch notifications for the logged-in user
router.get(
  "/",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      const result = await pool.query(
        `SELECT
           id,
           user_id,
           title,
           message,
           type,
           related_trip_id,
           related_request_id,
           is_read,
           created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [userId]
      );

      return res.json({
        success: true,
        notifications: result.rows,
      });
    } catch (error) {
      console.error("Fetch notifications error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
      });
    }
  }
);

// GET: Fetch unread notification count
router.get(
  "/unread-count",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.userId]
      );

      return res.json({
        success: true,
        unreadCount: result.rows[0].unread_count,
      });
    } catch (error) {
      console.error("Unread count error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch unread count",
      });
    }
  }
);

// PATCH: Mark one notification as read
router.patch(
  "/:notificationId/read",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;

      const result = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      return res.json({
        success: true,
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Mark notification read error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update notification",
      });
    }
  }
);

// PATCH: Mark all notifications as read
router.patch(
  "/read-all",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE`,
        [req.userId]
      );

      return res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Mark all notifications read error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update notifications",
      });
    }
  }
);

export default router;
