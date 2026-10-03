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
      trip_date,
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
      !departure_time ||
      !available_seats ||
      trip_cost === undefined ||
      !travel_type
    ) {
      return res.status(400).json({
        success: false,
        message: "Required trip fields are missing",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO trips (
        creator_id,
        from_location,
        to_location,
        trip_date,
        departure_time,
        available_seats,
        trip_cost,
        travel_type,
        description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        creator_id,
        from_location,
        to_location,
        trip_date,
        departure_time,
        available_seats,
        trip_cost,
        travel_type,
        description,
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

// id trip 

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

    // Trips created by the user
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

    // Trips joined by the user
    // Only accepted requests count as joined trips
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