import { Router } from "express";
import { pool } from "../db";

const router = Router();

// GET GROUP FOR A TRIP
router.get("/trip/:tripId", async (req, res) => {
  try {
    const { tripId } = req.params;

    const groupResult = await pool.query(
      `
      SELECT
        tg.id,
        tg.trip_id,
        tg.created_at
      FROM trip_groups tg
      WHERE tg.trip_id = $1
      `,
      [tripId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groupResult.rows[0];

    const membersResult = await pool.query(
      `
      SELECT
        tgm.id,
        tgm.user_id,
        tgm.role,
        tgm.joined_at,
        p.name,
        p.company,
        p.job_role,
        p.city
      FROM trip_group_members tgm
      JOIN profiles p
        ON tgm.user_id = p.id
      WHERE tgm.group_id = $1
      ORDER BY
        CASE
          WHEN tgm.role = 'admin' THEN 0
          ELSE 1
        END,
        tgm.joined_at ASC
      `,
      [group.id]
    );

    return res.status(200).json({
      success: true,
      group,
      members: membersResult.rows,
    });
  } catch (error) {
    console.error("Get group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group",
    });
  }
});

// CREATE GROUP FOR A TRIP
router.post("/", async (req, res) => {
  try {
    const { trip_id, creator_id } = req.body;

    if (!trip_id || !creator_id) {
      return res.status(400).json({
        success: false,
        message: "Trip ID and creator ID are required",
      });
    }

    // Verify trip exists and get creator
    const tripResult = await pool.query(
      `
      SELECT
        id,
        creator_id
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

    // Only trip creator can create the group
    if (trip.creator_id !== creator_id) {
      return res.status(403).json({
        success: false,
        message: "Only the trip creator can create the group",
      });
    }

    // Check whether group already exists
    const existingGroup = await pool.query(
      `
      SELECT id
      FROM trip_groups
      WHERE trip_id = $1
      `,
      [trip_id]
    );

    if (existingGroup.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Group already exists",
        group: existingGroup.rows[0],
      });
    }

    const groupResult = await pool.query(
      `
      INSERT INTO trip_groups (trip_id)
      VALUES ($1)
      RETURNING *
      `,
      [trip_id]
    );

    const group = groupResult.rows[0];

    // Add creator as group admin
    await pool.query(
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
      [group.id, creator_id]
    );

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    console.error("Create group error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create group",
    });
  }
});

// ADD MEMBER TO GROUP
router.post("/:groupId/members", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const groupResult = await pool.query(
      `
      SELECT
        id,
        trip_id
      FROM trip_groups
      WHERE id = $1
      `,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const group = groupResult.rows[0];

    // Only users whose request was accepted can join the group
    const requestResult = await pool.query(
      `
      SELECT id
      FROM trip_requests
      WHERE trip_id = $1
        AND requester_id = $2
        AND status = 'accepted'
      `,
      [group.trip_id, user_id]
    );

    if (requestResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "User does not have an accepted request for this trip",
      });
    }

    const memberResult = await pool.query(
      `
      INSERT INTO trip_group_members (
        group_id,
        user_id,
        role
      )
      VALUES ($1, $2, 'member')
      ON CONFLICT (group_id, user_id)
      DO NOTHING
      RETURNING *
      `,
      [groupId, user_id]
    );

    return res.status(201).json({
      success: true,
      message: "Member added successfully",
      member: memberResult.rows[0] || null,
    });
  } catch (error) {
    console.error("Add group member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add group member",
    });
  }
});

export default router;