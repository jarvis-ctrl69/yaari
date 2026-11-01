const API_URL = "http://192.168.31.159:3000";
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

type CreateTripData = {
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  trip_end_date: string; // NEW: Trip end date
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
