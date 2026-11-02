
import { Router } from "express";
import { pool } from "../db";

const router = Router();

// CREATE TRIP
router.post("/", async (req, res) => {
  try {
    const {
      creator_id,
      from_location,
      to_location,
      pickup_latitude,
      pickup_longitude,
      trip_date,
      trip_end_date,
      departure_time,
      available_seats,
      trip_cost,
      travel_type,
      description,
    } = req.body;

    if (
      !creator_id ||
      !from_location ||
      !to_location ||
      !trip_date ||
      !trip_end_date ||
      !departure_time ||
      available_seats === undefined ||
      trip_cost === undefined ||
      !travel_type
    ) {
      return res.status(400).json({
        success: false,
        message: "Required trip fields are missing",
      });
    }

    // Validate pickup coordinates
    const latitude = Number(pickup_latitude);
    const longitude = Number(pickup_longitude);

    if (
      pickup_latitude === undefined ||
      pickup_longitude === undefined ||
      pickup_latitude === null ||
      pickup_longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup coordinates are required",
      });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (
      !datePattern.test(trip_date) ||
      !datePattern.test(trip_end_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Dates must use YYYY-MM-DD format",
      });
    }

    if (trip_end_date < trip_date) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(departure_time)) {
      return res.status(400).json({
        success: false,
        message: "Invalid departure time",
      });
    }

    const seats = Number(available_seats);
    const cost = Number(trip_cost);

    if (!Number.isInteger(seats) || seats <= 0) {
      return res.status(400).json({
        success: false,
        message: "Available seats must be positive",
      });
    }

    if (!Number.isFinite(cost) || cost < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip cost",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO trips (
        creator_id,
        from_location,
        to_location,
        pickup_latitude,
        pickup_longitude,
        trip_date,
        trip_end_date,
        departure_time,
        available_seats,
        trip_cost,
        travel_type,
        description
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING *
      `,
      [
        creator_id,
        from_location,
        to_location,
        latitude,
        longitude,
        trip_date,
        trip_end_date,
        departure_time,
        seats,
        cost,
        travel_type,
        description || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      trip: result.rows[0],
    });
  } catch (error) {
    console.error("Create trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create trip",
    });
  }
});

// GET ALL ACTIVE TRIPS
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        trips.*,
        profiles.name AS creator_name,
        profiles.company,
        profiles.job_role,
        profiles.city
      FROM trips
      JOIN profiles
        ON trips.creator_id = profiles.id
      WHERE trips.status = 'active'
      ORDER BY trips.trip_date ASC, trips.departure_time ASC
      `
    );

    return res.status(200).json({
      success: true,
      trips: result.rows,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
    });
  }
});

// START TRIP
router.patch("/:id/start", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_id } = req.body;

    if (!creator_id) {
      return res.status(400).json({
        success: false,
        message: "Creator ID is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE trips
      SET status = 'in_progress'
      WHERE id = $1
        AND creator_id = $2
        AND status = 'active'
      RETURNING *
      `,
      [id, creator_id]
    );

    if (result.rows.length === 0) {
      const existing = await pool.query(
        `SELECT creator_id, status FROM trips WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (existing.rows[0].creator_id !== creator_id) {
        return res.status(403).json({
          success: false,
          message: "Only the trip creator can start this trip",
        });
      }

      return res.status(409).json({
        success: false,
        message: `Trip cannot be started. Current status: ${existing.rows[0].status}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip started successfully",
      trip: result.rows[0],
    });
  } catch (error) {
    console.error("Start trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to start trip",
    });
  }
});

// END TRIP
router.patch("/:id/end", async (req, res) => {
  try {
    const { id } = req.params;
    const { creator_id } = req.body;

    if (!creator_id) {
      return res.status(400).json({
        success: false,
        message: "Creator ID is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE trips
      SET status = 'completed'
      WHERE id = $1
        AND creator_id = $2
        AND status = 'in_progress'
      RETURNING *
      `,
      [id, creator_id]
    );

    if (result.rows.length === 0) {
      const existing = await pool.query(
        `SELECT creator_id, status FROM trips WHERE id = $1`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      if (existing.rows[0].creator_id !== creator_id) {
        return res.status(403).json({
          success: false,
          message: "Only the trip creator can end this trip",
        });
      }

      return res.status(409).json({
        success: false,
        message: `Trip cannot be ended. Current status: ${existing.rows[0].status}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip completed successfully",
      trip: result.rows[0],
    });
  } catch (error) {
    console.error("End trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to end trip",
    });
  }
});

// GET SINGLE TRIP
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        trips.*,
        profiles.name AS creator_name,
        profiles.company,
        profiles.job_role,
        profiles.city,
        (
          trips.available_seats -
          (
            SELECT COUNT(*)
            FROM trip_requests
            WHERE trip_requests.trip_id = trips.id
              AND trip_requests.status = 'accepted'
          )
        ) AS seats_left
      FROM trips
      JOIN profiles
        ON trips.creator_id = profiles.id
      WHERE trips.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      trip: result.rows[0],
    });
  } catch (error) {
    console.error("Get trip error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
    });
  }
});

// GET MY TRIPS
router.get("/my/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const createdTripsResult = await pool.query(
      `
      SELECT
        trips.*,
        profiles.name AS creator_name,
        profiles.company,
        profiles.job_role,
        profiles.city
      FROM trips
      JOIN profiles
        ON trips.creator_id = profiles.id
      WHERE trips.creator_id = $1
      ORDER BY trips.trip_date ASC, trips.departure_time ASC
      `,
      [userId]
    );

    const joinedTripsResult = await pool.query(
      `
      SELECT
        trips.*,
        profiles.name AS creator_name,
        profiles.company,
        profiles.job_role,
        profiles.city
      FROM trip_requests
      JOIN trips
        ON trip_requests.trip_id = trips.id
      JOIN profiles
        ON trips.creator_id = profiles.id
      WHERE trip_requests.requester_id = $1
        AND trip_requests.status = 'accepted'
      ORDER BY trips.trip_date ASC, trips.departure_time ASC
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      createdTrips: createdTripsResult.rows,
      joinedTrips: joinedTripsResult.rows,
    });
  } catch (error) {
    console.error("Get my trips error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch my trips",
    });
  }
});

export default router;
