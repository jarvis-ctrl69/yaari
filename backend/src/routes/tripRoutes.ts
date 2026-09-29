import { Router } from "express";
import { pool } from "../db";

const router = Router();

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

export default router;