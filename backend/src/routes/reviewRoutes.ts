
import { Router } from "express";
import { pool } from "../db";
import { authenticateUser } from "../middleware/authMiddleware";

const router = Router();

// All review endpoints require Supabase authentication.
router.use(authenticateUser);

// GET MEMBERS WHO THE CURRENT USER MUST REVIEW
// GET /api/reviews/trip/:tripId
router.get("/trip/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const tripResult = await pool.query(
      `SELECT id, trip_name, status, creator_id
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

    if (trip.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "Reviews are available only after trip completion",
      });
    }

    // Creator and accepted requesters are the trip participants.
    const membershipResult = await pool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM trips
        WHERE id = $1 AND creator_id = $2

        UNION ALL

        SELECT 1
        FROM trip_requests
        WHERE trip_id = $1
          AND requester_id = $2
          AND status = 'accepted'
      ) AS is_participant
      `,
      [tripId, userId]
    );

    if (!membershipResult.rows[0].is_participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this trip",
      });
    }

    const membersResult = await pool.query(
      `
      WITH participants AS (
        SELECT creator_id AS user_id
        FROM trips
        WHERE id = $1

        UNION

        SELECT requester_id AS user_id
        FROM trip_requests
        WHERE trip_id = $1
          AND status = 'accepted'
      )
      SELECT
        p.id,
        p.name,
        (r.id IS NOT NULL) AS has_reviewed,
        r.rating,
        r.review_text,
        r.created_at AS reviewed_at
      FROM participants pt
      JOIN profiles p
        ON p.id = pt.user_id
      LEFT JOIN trip_reviews r
        ON r.trip_id = $1
        AND r.reviewer_id = $2
        AND r.reviewee_id = p.id
      WHERE pt.user_id <> $2
      ORDER BY p.name ASC
      `,
      [tripId, userId]
    );

    const progressResult = await pool.query(
      `
      WITH participants AS (
        SELECT creator_id AS user_id
        FROM trips
        WHERE id = $1

        UNION

        SELECT requester_id AS user_id
        FROM trip_requests
        WHERE trip_id = $1
          AND status = 'accepted'
      )
      SELECT
        (
          SELECT COUNT(*)::INTEGER
          FROM participants
          WHERE user_id <> $2
        ) AS required_reviews,
        (
          SELECT COUNT(*)::INTEGER
          FROM trip_reviews
          WHERE trip_id = $1
            AND reviewer_id = $2
        ) AS submitted_reviews
      `,
      [tripId, userId]
    );

    const required = progressResult.rows[0].required_reviews;
    const submitted = progressResult.rows[0].submitted_reviews;

    return res.status(200).json({
      success: true,
      trip,
      members: membersResult.rows,
      progress: {
        required,
        submitted,
        remaining: Math.max(required - submitted, 0),
        completed: submitted >= required,
      },
    });
  } catch (error) {
    console.error("Get review members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch review members",
    });
  }
});

// SUBMIT A REVIEW
// POST /api/reviews/trip/:tripId
router.post("/trip/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.userId;
    const { reviewee_id, rating, review_text } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5",
      });
    }

    if (
      typeof review_text !== "string" ||
      !review_text.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Written feedback is required",
      });
    }

    if (typeof reviewee_id !== "string" || !reviewee_id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reviewee ID is required",
      });
    }

    if (reviewee_id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot review yourself",
      });
    }

    const tripResult = await pool.query(
      `SELECT id, status
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

    if (tripResult.rows[0].status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "You can review members only after trip completion",
      });
    }

    // Verify that the reviewer participated in this trip.
    const reviewerResult = await pool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM trips
        WHERE id = $1 AND creator_id = $2

        UNION ALL

        SELECT 1
        FROM trip_requests
        WHERE trip_id = $1
          AND requester_id = $2
          AND status = 'accepted'
      ) AS is_participant
      `,
      [tripId, userId]
    );

    if (!reviewerResult.rows[0].is_participant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant of this trip",
      });
    }

    // Verify that the person being reviewed also participated.
    const revieweeResult = await pool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM trips
        WHERE id = $1 AND creator_id = $2

        UNION ALL

        SELECT 1
        FROM trip_requests
        WHERE trip_id = $1
          AND requester_id = $2
          AND status = 'accepted'
      ) AS is_participant
      `,
      [tripId, reviewee_id]
    );

    if (!revieweeResult.rows[0].is_participant) {
      return res.status(403).json({
        success: false,
        message: "You can only review members of this trip",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO trip_reviews (
        trip_id,
        reviewer_id,
        reviewee_id,
        rating,
        review_text
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        tripId,
        userId,
        reviewee_id,
        numericRating,
        review_text.trim(),
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this member for this trip",
      });
    }

    console.error("Submit review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
    });
  }
});

// GET REVIEWS RECEIVED BY A PROFILE
// GET /api/reviews/profile/:profileId
router.get("/profile/:profileId", async (req, res) => {
  try {
    const { profileId } = req.params;

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.trip_id,
        r.rating,
        r.review_text,
        r.created_at,
        reviewer.name AS reviewer_name,
        t.trip_name
      FROM trip_reviews r
      JOIN profiles reviewer
        ON reviewer.id = r.reviewer_id
      JOIN trips t
        ON t.id = r.trip_id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
      `,
      [profileId]
    );

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
        COUNT(*)::INTEGER AS total_reviews
      FROM trip_reviews
      WHERE reviewee_id = $1
      `,
      [profileId]
    );

    return res.status(200).json({
      success: true,
      summary: summaryResult.rows[0],
      reviews: result.rows,
    });
  } catch (error) {
    console.error("Get profile reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile reviews",
    });
  }
});

export default router;
