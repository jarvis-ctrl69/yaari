const API_URL = "http://192.168.31.159:3000";

export async function checkBackend() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

type CreateProfileData = {
  id: string;
  name: string;
  age: number;
  gender: string;
  company_email: string;
  phone: string;
  company?: string;
  job_role?: string;
  city?: string;
  interests?: string;
  bio?: string;
};

export async function createProfile(data: CreateProfileData) {
  const response = await fetch(`${API_URL}/api/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create profile");
  }

  return result.profile;
}

export async function getProfiles() {
  const response = await fetch(`${API_URL}/api/profiles`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch profiles");
  }

  return result.profiles;
}

// trip creation function

type CreateTripData = {
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  departure_time: string;
  available_seats: number;
  trip_cost: number;
  travel_type: string;
  description?: string;
};

export async function createTrip(data: CreateTripData) {
  const response = await fetch(`${API_URL}/api/trips`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to create trip");
  }

  return result.trip;
}
// lookup
export async function getProfile(id: string) {
  const response = await fetch(`${API_URL}/api/profiles/${id}`);

  if (response.status === 404) {
    return null;
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch profile");
  }

  return result.profile;
}

//explore trips

export async function getTrips() {
  const response = await fetch(`${API_URL}/api/trips`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch trips");
  }

  return result.trips;
}

//with id 
export async function getTrip(id: string) {
  const response = await fetch(`${API_URL}/api/trips/${id}`);

  if (response.status === 404) {
    return null;
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch trip");
  }

  return result.trip;
}

// request trip
export async function requestToJoinTrip(
  trip_id: string,
  requester_id: string
) {
  const response = await fetch(`${API_URL}/api/trip-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      trip_id,
      requester_id,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to send join request"
    );
  }

  return result.request;
}