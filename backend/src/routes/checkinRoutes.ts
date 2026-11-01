
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { pool } from "../db";
import { authenticateUser } from "../middleware/authMiddleware";

const router = Router();

const CHECKIN_RADIUS_METERS = 100;
const QR_VALIDITY_HOURS = 12;

// Calculate distance between two GPS coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371000;

  const toRadians = (degrees: number) =>
    (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

// GENERATE QR CODE
router.post(
  "/:tripId/generate",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const userId = req.userId!;

      const tripResult = await pool.query(
        `SELECT id, creator_id, status
         FROM trips
         WHERE id = $1`,
        [tripId]
      );

      if (tripResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      const trip = tripResult.rows[0];

      if (trip.creator_id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the trip creator can generate the QR code",
        });
      }

      if (trip.status !== "in_progress") {
        return res.status(409).json({
          success: false,
          message: "Start the trip before generating its check-in QR",
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const expiresAt = new Date(
        Date.now() + QR_VALIDITY_HOURS * 60 * 60 * 1000
      );

      await pool.query(
        `INSERT INTO trip_checkin_qr (
           trip_id,
           token_hash,
           created_by,
           expires_at,
           revoked_at
         )
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (trip_id)
         DO UPDATE SET
           token_hash = EXCLUDED.token_hash,
           created_by = EXCLUDED.created_by,
           expires_at = EXCLUDED.expires_at,
           created_at = NOW(),
           revoked_at = NULL`,
        [tripId, tokenHash, userId, expiresAt]
      );

      return res.status(201).json({
        success: true,
        message: "Check-in QR generated successfully",
        qrPayload: {
          tripId,
          token,
        },
        expiresAt,
      });
    } catch (error) {
      console.error("QR generation error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to generate check-in QR",
      });
    }
  }
);

// VERIFY QR AND RECORD GPS CHECK-IN
router.post(
  "/verify",
  authenticateUser,
  async (req: Request, res: Response) => {
    const client = await pool.connect();

    try {
      const userId = req.userId!;
      const { tripId, token, latitude, longitude } = req.body;

      if (
        typeof tripId !== "string" ||
        typeof token !== "string" ||
        !token.trim() ||
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid QR data and GPS coordinates are required",
        });
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      await client.query("BEGIN");

      const tripResult = await client.query(
        `SELECT
           t.id,
           t.status,
           t.pickup_latitude,
           t.pickup_longitude,
           q.expires_at,
           q.revoked_at
         FROM trips t
         JOIN trip_checkin_qr q ON q.trip_id = t.id
         WHERE t.id = $1
           AND q.token_hash = $2
         FOR UPDATE OF q`,
        [tripId, tokenHash]
      );

      if (tripResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Invalid QR code",
        });
      }

      const trip = tripResult.rows[0];

      if (
        trip.revoked_at ||
        new Date(trip.expires_at).getTime() <= Date.now()
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "QR code has expired or been revoked",
        });
      }

      if (trip.status !== "in_progress") {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Trip is not currently in progress",
        });
      }

      if (
        trip.pickup_latitude === null ||
        trip.pickup_longitude === null
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Pickup coordinates are unavailable for this trip",
        });
      }

      const membership = await client.query(
        `SELECT 1
         FROM trip_groups g
         JOIN trip_group_members gm ON gm.group_id = g.id
         WHERE g.trip_id = $1
           AND gm.user_id = $2`,
        [tripId, userId]
      );

      if (membership.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          message: "You are not an accepted member of this trip group",
        });
      }

      const distance = calculateDistance(
        Number(trip.pickup_latitude),
        Number(trip.pickup_longitude),
        latitude,
        longitude
      );

      if (distance > CHECKIN_RADIUS_METERS) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          success: false,
          message: `You are ${Math.round(distance)} metres away. Please move within ${CHECKIN_RADIUS_METERS} metres of the pickup point.`,
          distanceMeters: Math.round(distance),
        });
      }

      const existing = await client.query(
        `SELECT id
         FROM trip_checkins
         WHERE trip_id = $1 AND user_id = $2`,
        [tripId, userId]
      );

      if (existing.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "You have already checked in for this trip",
        });
      }

      const attendance = await client.query(
        `INSERT INTO trip_checkins (
           trip_id,
           user_id,
           latitude,
           longitude,
           distance_meters
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tripId, userId, latitude, longitude, distance]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "GPS check-in successful",
        checkin: attendance.rows[0],
        distanceMeters: Math.round(distance),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("GPS check-in error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to complete check-in",
      });
    } finally {
      client.release();
    }
  }
);

// GET TRIP ATTENDANCE
router.get(
  "/:tripId/attendance",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { tripId } = req.params;
      const userId = req.userId!;

      const access = await pool.query(
        `SELECT 1
         FROM trips t
         LEFT JOIN trip_groups g ON g.trip_id = t.id
         LEFT JOIN trip_group_members gm ON gm.group_id = g.id
         WHERE t.id = $1
           AND (t.creator_id = $2 OR gm.user_id = $2)
         LIMIT 1`,
        [tripId, userId]
      );

      if (access.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "You cannot view this trip's attendance",
        });
      }

      const result = await pool.query(
        `SELECT
           c.id,
           c.user_id,
           p.name AS member_name,
           c.latitude,
           c.longitude,
           c.distance_meters,
           c.checked_in_at
         FROM trip_checkins c
         JOIN profiles p ON p.id = c.user_id
         WHERE c.trip_id = $1
         ORDER BY c.checked_in_at ASC`,
        [tripId]
      );

      return res.status(200).json({
        success: true,
        attendance: result.rows,
      });
    } catch (error) {
      console.error("Attendance fetch error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch attendance",
      });
    }
  }
);

export default router;
