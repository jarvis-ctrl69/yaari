import { Router } from "express";
import { pool } from "../db";

const router = Router();

type Coordinates = {
  latitude: number;
  longitude: number;
};

type DestinationInput = Coordinates & {
  destination_name: string;
};

type RouteLeg = {
  distance: number;
};

const isValidCoordinates = (latitude: unknown, longitude: unknown) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
};

/**
 * Ask OSRM for one route containing all itinerary waypoints.
 * OSRM returns one leg for every consecutive pair of waypoints.
 * Distances are returned in metres.
 */
async function calculateRoadDistanceLegs(
  start: Coordinates,
  destinations: DestinationInput[]
): Promise<number[]> {
  const allPoints = [start, ...destinations];
  const coordinateString = allPoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordinateString}` +
    "?overview=false&steps=false";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`OSRM returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (
      data.code !== "Ok" ||
      !Array.isArray(data.routes) ||
      data.routes.length === 0
    ) {
      throw new Error(data.message || "OSRM could not find a route");
    }

    const legs: RouteLeg[] = data.routes[0].legs;

    if (
      !Array.isArray(legs) ||
      legs.length !== destinations.length ||
      legs.some(
        (leg) => !Number.isFinite(Number(leg.distance)) || Number(leg.distance) <= 0
      )
    ) {
      throw new Error("OSRM did not return a valid distance for every route segment");
    }

    return legs.map((leg) => Number(leg.distance));
  } finally {
    clearTimeout(timeout);
  }
}

// CREATE TRIP
router.post("/", async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    const {
      creator_id,
      trip_name,
      from_location,
      to_location,
      pickup_latitude,
      pickup_longitude,
      destinations,
      trip_date,
      trip_end_date,
      departure_time,
      available_seats,
      trip_cost,
      travel_type,
      vehicle_name,
      vehicle_number,
      description,
    } = req.body;

    const isNewItinerary = Array.isArray(destinations);

    if (
      !creator_id ||
      !from_location ||
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

    if (!isValidCoordinates(pickup_latitude, pickup_longitude)) {
      return res.status(400).json({
        success: false,
        message: "Valid pickup coordinates are required",
      });
    }

    const latitude = Number(pickup_latitude);
    const longitude = Number(pickup_longitude);

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(trip_date) || !datePattern.test(trip_end_date)) {
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

    let normalizedDestinations: DestinationInput[] = [];
    let segmentDistancesMeters: number[] = [];
    let totalDistanceKm: number | null = null;
    let finalDestination = typeof to_location === "string" ? to_location.trim() : "";

    if (isNewItinerary) {
      if (!trip_name || typeof trip_name !== "string" || !trip_name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Trip name is required",
        });
      }

      if (destinations.length < 1 || destinations.length > 20) {
        return res.status(400).json({
          success: false,
          message: "Add between 1 and 20 destinations",
        });
      }

      normalizedDestinations = destinations.map((destination: any) => ({
        destination_name:
          typeof destination?.destination_name === "string"
            ? destination.destination_name.trim()
            : "",
        latitude: Number(destination?.latitude),
        longitude: Number(destination?.longitude),
      }));

      const invalidDestination = normalizedDestinations.some(
        (destination) =>
          !destination.destination_name ||
          !isValidCoordinates(destination.latitude, destination.longitude)
      );

      if (invalidDestination) {
        return res.status(400).json({
          success: false,
          message: "Every destination needs a name and valid coordinates",
        });
      }

      finalDestination =
        normalizedDestinations[normalizedDestinations.length - 1].destination_name;

      

const personalVehicleTypes = ["car", "bike", "other", "other personal vehicle"];

if (personalVehicleTypes.includes(String(travel_type).trim().toLowerCase())) {
  if (
    typeof vehicle_name !== "string" ||
    !vehicle_name.trim() ||
    typeof vehicle_number !== "string" ||
    !vehicle_number.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Vehicle name and registration number are required for personal vehicles",
    });
  }

  // Validate Indian vehicle registration format: KA 03 CA 2135
  const normalizedVehicleNumber = vehicle_number
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");

  const indianRegistrationPattern =
    /^[A-Z]{2} \d{2} [A-Z]{1,3} \d{1,4}$/;

  if (!indianRegistrationPattern.test(normalizedVehicleNumber)) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle registration number. Use the format: KA 03 CA 2135",
    });
  }
}


      // Calculate every consecutive road segment before opening the DB transaction.
      // If routing fails, no trip or destination records are written.
      segmentDistancesMeters = await calculateRoadDistanceLegs(
        { latitude, longitude },
        normalizedDestinations
      );

      
const totalDistanceMeters = segmentDistancesMeters.reduce(
  (sum, distance) => sum + distance,
  0
);

// Minimum trip distance validation: 50 km
if (totalDistanceMeters < 50000) {
  return res.status(400).json({
    success: false,
    message: "Minimum trip distance must be 50 km",
    total_distance_km: Number(
      (totalDistanceMeters / 1000).toFixed(2)
    ),
  });
}

totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));

    } else if (!finalDestination) {
      // Backward compatibility for the currently installed app version.
      return res.status(400).json({
        success: false,
        message: "Destination is required",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const tripResult = await client.query(
      `
      INSERT INTO trips (
        creator_id,
        trip_name,
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
        vehicle_name,
        vehicle_number,
        total_distance_km,
        description
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING *
      `,
      [
        creator_id,
        typeof trip_name === "string" && trip_name.trim()
          ? trip_name.trim()
          : null,
        from_location.trim(),
        finalDestination,
        latitude,
        longitude,
        trip_date,
        trip_end_date,
        departure_time,
        seats,
        cost,
        travel_type,
        typeof vehicle_name === "string" && vehicle_name.trim()
          ? vehicle_name.trim()
          : null,
        typeof vehicle_number === "string" && vehicle_number.trim()
          ? vehicle_number.trim()
          : null,
        totalDistanceKm,
        description || null,
      ]
    );

    const trip = tripResult.rows[0];
    const savedDestinations = [];

    for (let index = 0; index < normalizedDestinations.length; index++) {
      const destination = normalizedDestinations[index];
      const segmentDistanceKm = Number(
        (segmentDistancesMeters[index] / 1000).toFixed(2)
      );

      const destinationResult = await client.query(
        `
        INSERT INTO trip_destinations (
          trip_id,
          destination_name,
          latitude,
          longitude,
          sequence_order,
          segment_distance_km
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [
          trip.id,
          destination.destination_name,
          destination.latitude,
          destination.longitude,
          index + 1,
          segmentDistanceKm,
        ]
      );

      savedDestinations.push(destinationResult.rows[0]);
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Trip created successfully",
      trip: {
        ...trip,
        destinations: savedDestinations,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Trip creation rollback error:", rollbackError);
      }
    }

    console.error("Create trip error:", error);

    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Road-distance service timed out. Please try again."
        : error instanceof Error &&
            (error.message.includes("OSRM") ||
              error.message.includes("route") ||
              error.message.includes("segment"))
          ? "Unable to calculate the complete road route. Check the selected locations and try again."
          : "Failed to create trip";

    return res.status(500).json({
      success: false,
      message,
    });
  } finally {
    client.release();
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
        profiles.city,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', td.id,
                'destination_name', td.destination_name,
                'latitude', td.latitude,
                'longitude', td.longitude,
                'sequence_order', td.sequence_order,
                'segment_distance_km', td.segment_distance_km
              )
              ORDER BY td.sequence_order ASC
            )
            FROM trip_destinations td
            WHERE td.trip_id = trips.id
          ),
          '[]'::json
        ) AS destinations
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

    const destinationsResult = await pool.query(
      `
      SELECT *
      FROM trip_destinations
      WHERE trip_id = $1
      ORDER BY sequence_order ASC
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      trip: {
        ...result.rows[0],
        destinations: destinationsResult.rows,
      },
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
        profiles.city,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', td.id,
                'destination_name', td.destination_name,
                'latitude', td.latitude,
                'longitude', td.longitude,
                'sequence_order', td.sequence_order,
                'segment_distance_km', td.segment_distance_km
              )
              ORDER BY td.sequence_order ASC
            )
            FROM trip_destinations td
            WHERE td.trip_id = trips.id
          ),
          '[]'::json
        ) AS destinations
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
        profiles.city,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', td.id,
                'destination_name', td.destination_name,
                'latitude', td.latitude,
                'longitude', td.longitude,
                'sequence_order', td.sequence_order,
                'segment_distance_km', td.segment_distance_km
              )
              ORDER BY td.sequence_order ASC
            )
            FROM trip_destinations td
            WHERE td.trip_id = trips.id
          ),
          '[]'::json
        ) AS destinations
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
