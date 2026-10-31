
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
  const client = await pool.connect();
  let transactionStarted = false;

  try {
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

    // Start transaction
    await client.query("BEGIN");
    transactionStarted = true;

    // Find request and lock it while processing
    const requestResult = await client.query(
      `
      SELECT
        trip_requests.id,
        trip_requests.trip_id,
        trip_requests.requester_id,
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
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Trip request not found",
      });
    }

    const request = requestResult.rows[0];

    // Only the trip creator can accept/reject
    if (request.creator_id !== user_id) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: "Only the trip creator can manage this request",
      });
    }

    // Update request status
    const result = await client.query(
      `
      UPDATE trip_requests
      SET status = $1
      WHERE id = $2
      RETURNING *
      `,
      [status, requestId]
    );

    // If accepted, create group and add both members
    if (status === "accepted") {
      // Create group if it does not already exist
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

      // Add trip creator as admin
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

      // Add accepted requester as member
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

    // Commit all changes together
    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Update trip request error:", error);

    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update trip request",
    });
  } finally {
    client.release();
  }
});

export default router;
