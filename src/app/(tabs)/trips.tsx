
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import Card from "@/components/Card";
import Button from "@/components/Button";
import SwipeAction from "@/components/SwipeAction";

import { supabase } from "@/lib/supabase";
import {
  getMyTrips,
  startTrip,
  endTrip,
} from "@/lib/api";

type Trip = {
  id: string;
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  trip_end_date?: string | null;
  departure_time: string;
  available_seats: number;
  trip_cost: number | string;
  travel_type: string;
  description?: string;
  status: string;
  creator_name?: string;
  company?: string;
  job_role?: string;
  city?: string;
};

export default function MyTripsScreen() {
  const [createdTrips, setCreatedTrips] = useState<Trip[]>([]);
  const [joinedTrips, setJoinedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [processingTripId, setProcessingTripId] = useState<string | null>(null);

  // LOAD TRIPS
  const loadMyTrips = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.log("Unable to get logged-in user");
        return;
      }

      setCurrentUserId(user.id);

      const data = await getMyTrips(user.id);

      setCreatedTrips(data.createdTrips || []);
      setJoinedTrips(data.joinedTrips || []);
    } catch (error) {
      console.error("Failed to load my trips:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTrips();
  }, [loadMyTrips]);

  // REFRESH WHEN USER RETURNS TO THIS TAB
  useFocusEffect(
    useCallback(() => {
      loadMyTrips();
    }, [loadMyTrips])
  );

  // START / END TRIP
  const handleTripAction = async (
    trip: Trip,
    action: "start" | "end"
  ) => {
    if (!currentUserId || processingTripId) return;

    try {
      setProcessingTripId(trip.id);

      if (action === "start") {
        await startTrip(trip.id, currentUserId);
      } else {
        await endTrip(trip.id, currentUserId);
      }

      const newStatus =
        action === "start" ? "in_progress" : "completed";

      setCreatedTrips((previous) =>
        previous.map((item) =>
          item.id === trip.id
            ? { ...item, status: newStatus }
            : item
        )
      );

      Alert.alert(
        "Success",
        action === "start"
          ? "Your trip has started!"
          : "Your trip has been completed!"
      );
    } catch (error: any) {
      Alert.alert(
        "Trip Update Failed",
        error?.message || "Please try again."
      );

      // Reload in case the server updated but response failed.
      await loadMyTrips();
    } finally {
      setProcessingTripId(null);
    }
  };

  // DATE HELPERS
  const parseDate = (value: string) => {
    const [year, month, day] = value
      .slice(0, 10)
      .split("-")
      .map(Number);

    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  const formatDate = (date: string) => {
    if (!date) return "Not specified";

    const parsedDate = parseDate(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getDuration = (start: string, end?: string | null) => {
    if (!start) return null;

    const startDate = parseDate(start);
    const endDate = parseDate(end || start);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return null;
    }

    const difference = Math.round(
      (endDate.getTime() - startDate.getTime()) / 86400000
    );

    return difference >= 0 ? difference + 1 : null;
  };

  const formatTime = (time: string) => {
    if (!time) return "Not specified";

    const [hours, minutes] = time.split(":").map(Number);

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours > 23 ||
      minutes > 59
    ) {
      return time;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCost = (cost: number | string) => {
    const amount = Number(cost);

    if (!Number.isFinite(amount)) return `₹${cost}`;

    return `₹${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  // STATUS LABEL
  const formatStatus = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status || "Active";
    }
  };

  // TRIP CARD
  const renderTripCard = (
    trip: Trip,
    type: "created" | "joined"
  ) => {
    const duration = getDuration(
      trip.trip_date,
      trip.trip_end_date
    );

    return (
      <View key={trip.id} className="mb-5">
        <Card>
          {/* ROUTE */}
          <Text className="mb-3 text-xs font-bold tracking-wider text-gray-500">
            JOURNEY ROUTE
          </Text>

          <View className="flex-row items-start">
            <View className="mr-3 items-center pt-1">
              <View className="h-3 w-3 rounded-full bg-green-600" />
              <View className="my-1 h-9 w-0.5 bg-gray-300" />
              <View className="h-3 w-3 rounded-full bg-red-500" />
            </View>

            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {trip.from_location}
              </Text>

              <View className="h-9 justify-center">
                <Text className="text-xs text-gray-400">
                  DESTINATION
                </Text>
              </View>

              <Text className="text-base font-bold text-gray-900">
                {trip.to_location}
              </Text>
            </View>
          </View>

          {/* DATES */}
          <View className="mt-5 border-t border-gray-100 pt-4">
            <Text className="text-xs font-bold tracking-wider text-gray-500">
              TRIP SCHEDULE
            </Text>

            <View className="mt-3 flex-row">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-gray-500">
                  START DATE
                </Text>

                <Text className="mt-1 text-sm font-bold text-gray-900">
                  {formatDate(trip.trip_date)}
                </Text>
              </View>

              <View className="flex-1 pl-2">
                <Text className="text-xs text-gray-500">
                  END DATE
                </Text>

                <Text className="mt-1 text-sm font-bold text-gray-900">
                  {formatDate(
                    trip.trip_end_date || trip.trip_date
                  )}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
              <View className="rounded-xl bg-blue-50 px-3 py-2">
                <Text className="text-xs text-blue-600">
                  DURATION
                </Text>

                <Text className="mt-1 font-bold text-blue-800">
                  {duration !== null
                    ? `${duration} ${duration === 1 ? "day" : "days"}`
                    : "N/A"}
                </Text>
              </View>

              <View className="rounded-xl bg-gray-100 px-3 py-2">
                <Text className="text-xs text-gray-500">
                  DEPARTURE
                </Text>

                <Text className="mt-1 font-bold text-gray-800">
                  {formatTime(trip.departure_time)}
                </Text>
              </View>
            </View>
          </View>

          {/* TRIP INFORMATION */}
          <View className="mt-4 flex-row flex-wrap border-t border-gray-100 pt-3">
            <View className="w-1/2 py-2 pr-2">
              <Text className="text-xs text-gray-500">
                TRAVEL TYPE
              </Text>

              <Text className="mt-1 font-bold text-gray-900">
                {trip.travel_type}
              </Text>
            </View>

            <View className="w-1/2 py-2 pl-2">
              <Text className="text-xs text-gray-500">
                AVAILABLE SEATS
              </Text>

              <Text className="mt-1 font-bold text-gray-900">
                {trip.available_seats}
              </Text>
            </View>

            <View className="w-1/2 py-2 pr-2">
              <Text className="text-xs text-gray-500">
                COST PER PERSON
              </Text>

              <Text className="mt-1 font-bold text-gray-900">
                {formatCost(trip.trip_cost)}
              </Text>
            </View>

            <View className="w-1/2 py-2 pl-2">
              <Text className="text-xs text-gray-500">
                STATUS
              </Text>

              <Text
                className={`mt-1 font-bold ${
                  trip.status === "completed"
                    ? "text-green-700"
                    : trip.status === "in_progress"
                    ? "text-blue-700"
                    : "text-gray-900"
                }`}
              >
                {formatStatus(trip.status)}
              </Text>
            </View>
          </View>

          {/* CREATOR DETAILS FOR JOINED TRIPS */}
          {type === "joined" && trip.creator_name ? (
            <View className="mt-4 rounded-xl bg-gray-50 p-3">
              <Text className="text-xs font-bold text-gray-500">
                TRIP CREATED BY
              </Text>

              <Text className="mt-2 text-base font-bold text-gray-900">
                {trip.creator_name}
              </Text>

              {trip.job_role ? (
                <Text className="mt-1 text-sm text-gray-500">
                  {trip.job_role}
                </Text>
              ) : null}

              {trip.company ? (
                <Text className="mt-1 text-sm font-semibold text-blue-600">
                  {trip.company}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* VIEW TRIP */}
          <View className="mt-5">
            <Button
              title="View Trip"
              onPress={() =>
                router.push({
                  pathname: "/trip-details",
                  params: { id: trip.id },
                })
              }
            />
          </View>

          {/* CREATOR TRIP CONTROLS */}
          {type === "created" && (
            <View className="mt-2">
              {trip.status === "active" && (
                <SwipeAction
                  title={
                    processingTripId === trip.id
                      ? "Starting..."
                      : "Swipe to Start Trip  →"
                  }
                  color="#16A34A"
                  disabled={processingTripId !== null}
                  onComplete={() =>
                    handleTripAction(trip, "start")
                  }
                />
              )}

              {trip.status === "in_progress" && (
                <SwipeAction
                  title={
                    processingTripId === trip.id
                      ? "Ending..."
                      : "Swipe to End Trip  →"
                  }
                  color="#DC2626"
                  disabled={processingTripId !== null}
                  onComplete={() =>
                    handleTripAction(trip, "end")
                  }
                />
              )}

              {trip.status === "completed" && (
                <View className="mt-4 rounded-xl bg-green-50 p-4">
                  <Text className="text-center font-bold text-green-700">
                    ✓ Trip Completed
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      </View>
    );
  };

  // LOADING
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-4 text-base text-gray-500">
          Loading your trips...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-5 pb-10 pt-8">
        {/* HEADER */}
        <Text className="text-3xl font-bold text-gray-900">
          My Trips
        </Text>

        <Text className="mt-2 text-base leading-6 text-gray-500">
          Manage the trips you created and the trips you've joined.
        </Text>

        {/* CREATED TRIPS */}
        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-gray-900">
            Created by Me
          </Text>

          {createdTrips.length === 0 ? (
            <Card>
              <Text className="text-base font-semibold text-gray-900">
                No trips created yet
              </Text>

              <Text className="mt-2 text-sm leading-5 text-gray-500">
                Create your first trip and start connecting with
                people travelling your way.
              </Text>

              <View className="mt-4">
                <Button
                  title="Create a Trip"
                  onPress={() => router.push("/create-trip")}
                />
              </View>
            </Card>
          ) : (
            createdTrips.map((trip) =>
              renderTripCard(trip, "created")
            )
          )}
        </View>

        {/* JOINED TRIPS */}
        <View className="mt-8">
          <Text className="mb-4 text-xl font-bold text-gray-900">
            Joined Trips
          </Text>

          {joinedTrips.length === 0 ? (
            <Card>
              <Text className="text-base font-semibold text-gray-900">
                No joined trips yet
              </Text>

              <Text className="mt-2 text-sm leading-5 text-gray-500">
                When a trip creator accepts your request, the trip
                will appear here.
              </Text>

              <View className="mt-4">
                <Button
                  title="Explore Trips"
                  onPress={() => router.push("/(tabs)/explore")}
                />
              </View>
            </Card>
          ) : (
            joinedTrips.map((trip) =>
              renderTripCard(trip, "joined")
            )
          )}
        </View>
      </View>
    </ScrollView>
  );
}
