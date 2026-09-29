import { Router } from "express";
import { pool } from "../db";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const {
      id,
      name,
      age,
      gender,
      company_email,
      phone,
      company,
      job_role,
      city,
      interests,
      bio,
    } = req.body;

    if (!id || !name || !age || !gender || !company_email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Required profile fields are missing",
      });
    }

    const existingProfile = await pool.query(
      "SELECT id FROM profiles WHERE id = $1",
      [id]
    );

    if (existingProfile.rows.length > 0) {
      const result = await pool.query(
        `
        UPDATE profiles
        SET
          name = $1,
          age = $2,
          gender = $3,
          company_email = $4,
          phone = $5,
          company = $6,
          job_role = $7,
          city = $8,
          interests = $9,
          bio = $10
        WHERE id = $11
        RETURNING *
        `,
        [
          name,
          age,
          gender,
          company_email,
          phone,
          company,
          job_role,
          city,
          interests,
          bio,
          id,
        ]
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        profile: result.rows[0],
      });
    }

    const result = await pool.query(
      `
      INSERT INTO profiles (
        id,
        name,
        age,
        gender,
        company_email,
        phone,
        company,
        job_role,
        city,
        interests,
        bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        id,
        name,
        age,
        gender,
        company_email,
        phone,
        company,
        job_role,
        city,
        interests,
        bio,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Create/update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save profile",
    });
  }
});
router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        age,
        gender,
        company_email,
        phone,
        company,
        job_role,
        city,
        interests,
        bio,
        created_at
      FROM profiles
      ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      profiles: result.rows,
    });
  } catch (error) {
    console.error("Get profiles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
    });
  }
});

// conditional routing 
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM profiles
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile: result.rows[0],
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
});

//explore trips
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

export default router;