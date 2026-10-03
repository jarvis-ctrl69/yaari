import { Router } from "express";
import { pool } from "../db";

const router = Router();

// CREATE OR UPDATE PROFILE
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
      preferred_travel_type,
      profile_image_url,
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
          bio = $10,
          preferred_travel_type = $11,
          profile_image_url = $12
        WHERE id = $13
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
          preferred_travel_type,
          profile_image_url,
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
        bio,
        preferred_travel_type,
        profile_image_url
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13
      )
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
        preferred_travel_type,
        profile_image_url,
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

// GET ALL PROFILES
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
        preferred_travel_type,
        profile_image_url,
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

// GET PROFILE BY ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.name,
        p.age,
        p.gender,
        p.company_email,
        p.phone,
        p.company,
        p.job_role,
        p.city,
        p.interests,
        p.bio,
        p.preferred_travel_type,
        p.profile_image_url,
        p.created_at,

        (
          SELECT COUNT(*)
          FROM trips t
          WHERE t.creator_id = p.id
        ) AS trips_created,

        (
          SELECT COUNT(*)
          FROM trip_requests tr
          WHERE tr.requester_id = p.id
            AND tr.status = 'accepted'
        ) AS trips_joined

      FROM profiles p
      WHERE p.id = $1
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

export default router;