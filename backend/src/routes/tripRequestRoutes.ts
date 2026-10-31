
import { Router } from "express";
import { pool } from "../db";

const router = Router();

// REQUEST TO JOIN A TRIP
router.post("/", async (req, res) => {
  try {
    const {
      trip_id,
      requester_id,
      intro_message,
      route_confirmed,
      schedule_confirmed,
      travel_type_confirmed,
      cost_confirmed,
    } = req.body;

    if (!trip_id || !requester_id) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and requester ID are required",
      });
    }

    if (
      typeof intro_message !== "string" ||
      !intro_message.trim() ||
      intro_message.trim().length > 300
    ) {
      return res.status(400).json({
        success: false,
        message: "Introduction must contain 1 to 300 characters",
      });
    }

    const confirmations = [
      route_confirmed,
      schedule_confirmed,
      travel_type_confirmed,
      cost_confirmed,
    ];

    if (!confirmations.every((value) => value === true)) {
      return res.status(400).json({
        success: false,
        message: "Please confirm all four trip requirements",
      });
    }

    // Check that the trip exists
    const tripResult = await pool.query(
      `SELECT * FROM trips WHERE id = $1`,
      [trip_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const trip = tripResult.rows[0];

    if (trip.creator_id === requester_id) {
      return res.status(400).json({
        success: false,
        message: "You cannot request to join your own trip",
      });
    }

    if (trip.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This trip is no longer active",
      });
    }

    // Check available seats
    const seatsResult = await pool.query(
      `
      SELECT
        trips.available_seats -
        (
          SELECT COUNT(*)
          FROM trip_requests
          WHERE trip_requests.trip_id = trips.id
          AND trip_requests.status = 'accepted'
        ) AS seats_left
      FROM trips
      WHERE trips.id = $1
      `,
      [trip_id]
    );

    if (Number(seatsResult.rows[0].seats_left) <= 0) {
      return res.status(400).json({
        success: false,
        message: "This trip has no available seats",
      });
    }

    // Create request with compatibility information
    const result = await pool.query(
      `
      INSERT INTO trip_requests (
        trip_id,
        requester_id,
        intro_message,
        route_confirmed,
        schedule_confirmed,
        travel_type_confirmed,
        cost_confirmed
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        trip_id,
        requester_id,
        intro_message.trim(),
        route_confirmed,
        schedule_confirmed,
        travel_type_confirmed,
        cost_confirmed,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Join request sent successfully",
      request: result.rows[0],
    });
  } catch (error: any) {
    console.error("Create trip request error:", error);

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

// GET REQUESTS FOR A TRIP
router.get("/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;

    const result = await pool.query(
      `
      SELECT
        trip_requests.*,
        profiles.name AS requester_name,
        profiles.company,
        profiles.job_role,
        profiles.city
      FROM trip_requests
      JOIN profiles
        ON trip_requests.requester_id = profiles.id
      WHERE trip_requests.trip_id = $1
      ORDER BY trip_requests.created_at DESC
      `,
      [tripId]
    );

    return res.status(200).json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Get trip requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip requests",
    });
  }
});

// ACCEPT OR REJECT A TRIP REQUEST
router.patch("/:requestId", async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { requestId } = req.params;
    const { status, user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected",
      });
    }

    await client.query("BEGIN");

    const requestResult = await client.query(
      `
      SELECT
        trip_requests.id,
        trip_requests.trip_id,
        trip_requests.requester_id,
        trip_requests.status,
        trips.creator_id
      FROM trip_requests
      JOIN trips
        ON trip_requests.trip_id = trips.id
      WHERE trip_requests.id = $1
      FOR UPDATE OF trip_requests
      `,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Trip request not found",
      });
    }

    const request = requestResult.rows[0];

    if (request.creator_id !== user_id) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Only the trip creator can manage this request",
      });
    }

    if (request.status !== "pending") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "This request has already been processed",
      });
    }

    if (status === "accepted") {
      // Lock trip row and verify available seats
      const tripResult = await client.query(
        `
        SELECT available_seats
        FROM trips
        WHERE id = $1
        FOR UPDATE
        `,
        [request.trip_id]
      );

      const acceptedResult = await client.query(
        `
        SELECT COUNT(*)::int AS accepted_count
        FROM trip_requests
        WHERE trip_id = $1
          AND status = 'accepted'
        `,
        [request.trip_id]
      );

      if (
        acceptedResult.rows[0].accepted_count >=
        tripResult.rows[0].available_seats
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "No available seats remain for this trip",
        });
      }
    }

    const result = await client.query(
      `
      UPDATE trip_requests
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, requestId]
    );

    if (status === "accepted") {
      const groupResult = await client.query(
        `
        INSERT INTO trip_groups (trip_id)
        VALUES ($1)
        ON CONFLICT (trip_id)
        DO UPDATE SET trip_id = EXCLUDED.trip_id
        RETURNING *
        `,
        [request.trip_id]
      );

      const group = groupResult.rows[0];

      // Add creator as admin
      await client.query(
        `
        INSERT INTO trip_group_members (
          group_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'admin')
        ON CONFLICT (group_id, user_id)
        DO NOTHING
        `,
        [group.id, request.creator_id]
      );

      // Add accepted traveller as member
      await client.query(
        `
        INSERT INTO trip_group_members (
          group_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'member')
        ON CONFLICT (group_id, user_id)
        DO NOTHING
        `,
        [group.id, request.requester_id]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request: result.rows[0],
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Update trip request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update trip request",
    });
  } finally {
    client?.release();
  }
});

export default router;
