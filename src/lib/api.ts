const API_URL = "http://192.168.31.159:3000";// Home
// const API_URL = "http://10.84.190.96:3000"; //amogh 

// ===============================
// BACKEND CONNECTION CHECK
// ===============================

export async function checkBackend() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Backend unavailable");
    }

    return result;
  } catch (error) {
    console.error("Backend connection error:", error);
    throw error;
  }
}
import { supabase } from "./supabase";
// ===============================
// PROFILE
// ===============================

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

// ===============================
// TRIPS
// ===============================

export type TripDestinationInput = {
  destination_name: string;
  latitude: number;
  longitude: number;
};

export type CreateTripData = {
  creator_id: string;

  // Starting point and final destination are retained
  // for compatibility with existing trip screens and APIs.
  from_location: string;
  to_location: string;
  pickup_latitude: number;
  pickup_longitude: number;

  // Multi-destination fixed itinerary fields.
  // Optional until the Create Trip screen is upgraded in Step 4.
  trip_name?: string;
  destinations?: TripDestinationInput[];

  trip_date: string;
  trip_end_date: string;
  departure_time: string;
  available_seats: number;
  trip_cost: number;
  travel_type: string;

  // Required by the backend for personal vehicle types
  // when a new multi-destination itinerary is submitted.
  vehicle_name?: string;
  vehicle_number?: string;

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

// Get all active trips
export async function getTrips() {
  const response = await fetch(`${API_URL}/api/trips`);

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch trips");
  }

  return result.trips;
}

// Get single trip
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

// Get my trips
export async function getMyTrips(userId: string) {
  const response = await fetch(
    `${API_URL}/api/trips/my/${userId}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to fetch my trips"
    );
  }

  return result;
}

// ===============================
// TRIP REQUESTS
// ===============================

// Request to join a trip

export type JoinTripRequestData = {
  trip_id: string;
  requester_id: string;
  intro_message: string;
  route_confirmed: boolean;
  schedule_confirmed: boolean;
  travel_type_confirmed: boolean;
  cost_confirmed: boolean;
};

export async function requestToJoinTrip(
  data: JoinTripRequestData
) {
  const response = await fetch(`${API_URL}/api/trip-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to send join request"
    );
  }

  return result.request;
}


// Get requests for a trip
export async function getTripRequests(tripId: string) {
  const response = await fetch(
    `${API_URL}/api/trip-requests/${tripId}`
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to fetch trip requests"
    );
  }

  return result.requests;
}

// Accept / reject trip request
export async function updateTripRequest(
  requestId: string,
  status: "accepted" | "rejected",
  userId: string
) {
  const response = await fetch(
    `${API_URL}/api/trip-requests/${requestId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
        user_id: userId,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to update trip request"
    );
  }

  return result.request;
}

// ===============================
// TRIP GROUPS
// ===============================

export async function getTripGroup(tripId: string) {
  const response = await fetch(
    `${API_URL}/api/groups/trip/${tripId}`
  );

  const result = await response.json();

  // A group is created only after the first join request is accepted.
  // So 404 here means the group does not exist yet.
  if (response.status === 404) {
    return {
      success: true,
      group: null,
      members: [],
    };
  }

  if (!response.ok) {
    throw new Error(
      result.message || "Failed to fetch trip group"
    );
  }

  return result;
}

// ========================================
// GROUP MESSAGING
// ========================================

export type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name: string;
  profile_image_url?: string | null;
};

// Get authenticated user's Supabase access token
async function getMessagingToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Please log in again to use group messaging");
  }
  // console.log("SUPABASE TOKEN:", session.access_token); //veri
console.log("CURRENT USER ID:", session.user.id);
// console.log("CURRENT USER TOKEN:", session.access_token); //veri
  return session.access_token;
}

// Load group chat messages
export async function getGroupMessages(groupId: string) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/messages/group/${groupId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to load group messages");
  }

  return result as {
    success: boolean;
    messages: GroupMessage[];
  };
}

// Send a group chat message
export async function sendGroupMessage(
  groupId: string,
  message: string
) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/messages/group/${groupId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to send message");
  }

  return result as {
    success: boolean;
    message: GroupMessage;
  };

}

// ========================================
// NOTIFICATIONS
// ========================================

export type YaariNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_trip_id: string | null;
  related_request_id: string | null;
  is_read: boolean;
  created_at: string;
};

// Fetch notifications
export async function getNotifications() {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/notifications`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch notifications");
  }

  return result as {
    success: boolean;
    notifications: YaariNotification[];
  };
}

// Fetch unread notification count
export async function getUnreadNotificationCount() {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/notifications/unread-count`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch unread count");
  }

  return result as {
    success: boolean;
    unreadCount: number;
  };
}

// Mark one notification as read
export async function markNotificationAsRead(
  notificationId: string
) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update notification");
  }

  return result;
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/notifications/read-all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to update notifications");
  }

  return result;
}
//
// ======================================== stard end 1
export async function startTrip(tripId: string, creatorId: string) {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/start`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ creator_id: creatorId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to start trip");
  }

  return data;
}

export async function endTrip(tripId: string, creatorId: string) {
  const response = await fetch(`${API_URL}/api/trips/${tripId}/end`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ creator_id: creatorId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to end trip");
  }

  return data;
}
// ========================================
// QR + GPS CHECK-IN
// ========================================

export type CheckinQRPayload = {
  tripId: string;
  token: string;
};

export async function generateCheckinQR(tripId: string) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/checkin/${tripId}/generate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to generate QR code");
  }

  return result as {
    success: boolean;
    message: string;
    qrPayload: CheckinQRPayload;
    expiresAt: string;
  };
}

export async function verifyCheckin(
  tripId: string,
  qrToken: string,
  latitude: number,
  longitude: number
) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/checkin/verify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tripId,
        token: qrToken,
        latitude,
        longitude,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "GPS check-in failed");
  }

  return result;
}


export async function getTripAttendance(tripId: string) {
  const token = await getMessagingToken();

  const response = await fetch(
    `${API_URL}/api/checkin/${tripId}/attendance`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const responseText = await response.text();

  let result;

  try {
    result = JSON.parse(responseText);
  } catch {
    console.error("Attendance API returned non-JSON:", responseText);

    throw new Error(
      `Attendance API error (${response.status}). Check backend route registration.`
    );
  }

  if (!response.ok) {
    throw new Error(result.message || "Failed to fetch attendance");
  }

  return result;
}
