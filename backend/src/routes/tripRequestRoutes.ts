import { Router } from "express";
import { pool } from "../db";

const router = Router();

// REQUEST TO JOIN A TRIP
router.post("/", async (req, res) => {
  try {
    const { trip_id, requester_id } = req.body;

    if (!trip_id || !requester_id) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and requester ID are required",
      });
    }

    // Check that the trip exists
    const tripResult = await pool.query(
      `
      SELECT *
      FROM trips
      WHERE id = $1
      `,
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const trip = tripResult.rows[0];

    // Prevent the trip creator from requesting their own trip
    if (trip.creator_id === requester_id) {
      return res.status(400).json({
        success: false,
        message: "You cannot request to join your own trip",
      });
    }

    // Create request
    const result = await pool.query(
      `
      INSERT INTO trip_requests (
        trip_id,
        requester_id
      )
      VALUES ($1, $2)
      RETURNING *
      `,
      [trip_id, requester_id]
    );

    return res.status(201).json({
      success: true,
      message: "Join request sent successfully",
      request: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create trip request error:", error);

    // Duplicate request
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "You have already requested to join this trip",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send join request",
    });
  }
});

export default router;