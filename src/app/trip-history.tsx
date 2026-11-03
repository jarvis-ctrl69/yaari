
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import { supabase } from "@/lib/supabase";
import { getMyTrips } from "@/lib/api";

type Destination = {
  id?: string;
  destination_name: string;
  sequence_order: number;
  segment_distance_km?: number | null;
};

type Trip = {
  id: string;
  isCreatedByMe?: boolean;
  creator_id: string;
  creator_name?: string;
  trip_name?: string | null;
  from_location: string;
  to_location: string;
  trip_date: string;
  trip_end_date: string;
  departure_time?: string;
  status: string;
  total_distance_km?: number | null;
  vehicle_name?: string | null;
  vehicle_number?: string | null;
  destinations?: Destination[];
};

type TripSectionProps = {
  title: string;
  trips: Trip[];
  emptyMessage: string;
};

function formatDate(date?: string) {
  if (!date) return "Date unavailable";

  const value = date.slice(0, 10);
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return value;

  return new Date(year, month - 1, day).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function TripSection({
  title,
  trips,
  emptyMessage,
}: TripSectionProps) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-gray-900">
          {title}
        </Text>

        <Text className="text-sm font-semibold text-blue-600">
          {trips.length} trips
        </Text>
      </View>

      {trips.length === 0 ? (
        <View className="rounded-2xl border border-gray-200 bg-white p-5">
          <Text className="text-center text-sm text-gray-500">
            {emptyMessage}
          </Text>
        </View>
      ) : (
        trips.map((trip) => (
          <View
            key={trip.id}
            className="mb-4 rounded-2xl border border-gray-200 bg-white p-4"
          >
            <Text className="text-lg font-bold text-gray-900">
              {trip.trip_name || "YAARI Trip"}
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              {formatDate(trip.trip_date)} -{" "}
              {formatDate(trip.trip_end_date)}
            </Text>

            <View className="mt-4">
              <Text className="text-sm font-semibold text-gray-500">
                Starting Point
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {trip.from_location}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="text-sm font-semibold text-gray-500">
                Itinerary
              </Text>

              {trip.destinations && trip.destinations.length > 0 ? (
                trip.destinations
                  .slice()
                  .sort(
                    (a, b) =>
                      a.sequence_order - b.sequence_order
                  )
                  .map((destination, index) => (
                    <Text
                      key={
                        destination.id ||
                        `${trip.id}-${index}`
                      }
                      className="mt-1 text-sm text-gray-800"
                    >
                      {index + 1}. {destination.destination_name}
                      {destination.segment_distance_km != null
                        ? ` • ${Number(
                            destination.segment_distance_km
                          ).toFixed(2)} km`
                        : ""}
                    </Text>
                  ))
              ) : (
                <Text className="mt-1 text-sm text-gray-800">
                  {trip.to_location}
                </Text>
              )}
            </View>

            <View className="mt-4 flex-row flex-wrap justify-between">
              <View>
                <Text className="text-xs text-gray-500">
                  Total Road Distance
                </Text>

                <Text className="mt-1 font-bold text-gray-900">
                  {trip.total_distance_km != null
                    ? `${Number(trip.total_distance_km).toFixed(2)} km`
                    : "Not available"}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-xs text-gray-500">
                  Trip Role
                </Text>

                <Text className="mt-1 font-semibold text-gray-900">
                  {trip.isCreatedByMe ? "Creator" : "Member"}
                </Text>
              </View>
            </View>

            {trip.vehicle_name ? (
              <Text className="mt-3 text-sm text-gray-600">
                Vehicle: {trip.vehicle_name}
              </Text>
            ) : null}

            <Text className="mt-3 text-xs font-semibold uppercase text-gray-500">
              {trip.status.replace("_", " ")}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Please log in to view your trips.");
      }

      const result = await getMyTrips(user.id);

      const createdTrips: Trip[] = (
        result.createdTrips || []
      ).map((trip: Trip) => ({
        ...trip,
        isCreatedByMe: true,
      }));

      const joinedTrips: Trip[] = (
        result.joinedTrips || []
      ).map((trip: Trip) => ({
        ...trip,
        isCreatedByMe: false,
      }));

      // Combine created and joined trips without duplicates.
      const uniqueTrips = new Map<string, Trip>();

      [...createdTrips, ...joinedTrips].forEach((trip) => {
        const existing = uniqueTrips.get(trip.id);

        if (!existing || trip.isCreatedByMe) {
          uniqueTrips.set(trip.id, trip);
        }
      });

      const sortedTrips = Array.from(uniqueTrips.values()).sort(
        (a, b) =>
          new Date(a.trip_date).getTime() -
          new Date(b.trip_date).getTime()
      );

      setTrips(sortedTrips);
    } catch (err) {
      console.error("Trip history error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load trip history."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-3 text-gray-500">
          Loading your trips...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-center text-base text-red-600">
          {error}
        </Text>

        <Pressable
          onPress={loadTrips}
          className="mt-5 rounded-xl bg-blue-600 px-6 py-3"
        >
          <Text className="font-semibold text-white">
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  const upcomingTrips = trips.filter(
    (trip) => trip.status === "active"
  );

  const ongoingTrips = trips.filter(
    (trip) => trip.status === "in_progress"
  );

  const completedTrips = trips.filter(
    (trip) => trip.status === "completed"
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-12 pt-14">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base font-semibold text-blue-600">
            ← Back
          </Text>
        </Pressable>

        <Text className="mt-5 text-3xl font-bold text-gray-900">
          My Trip History
        </Text>

        <Text className="mt-2 text-sm text-gray-500">
          All your YAARI journeys in one place.
        </Text>

        <View className="mt-6 flex-row justify-between rounded-2xl bg-blue-600 p-4">
          <View>
            <Text className="text-3xl font-bold text-white">
              {trips.length}
            </Text>

            <Text className="mt-1 text-sm text-blue-100">
              Total Trips
            </Text>
          </View>

          <View>
            <Text className="text-3xl font-bold text-white">
              {completedTrips.length}
            </Text>

            <Text className="mt-1 text-sm text-blue-100">
              Completed
            </Text>
          </View>
        </View>

        <TripSection
          title="Upcoming Trips"
          trips={upcomingTrips}
          emptyMessage="No upcoming trips yet."
        />

        <TripSection
          title="Ongoing Trips"
          trips={ongoingTrips}
          emptyMessage="You don't have any ongoing trips."
        />

        <TripSection
          title="Completed Trips"
          trips={completedTrips}
          emptyMessage="Your completed journeys will appear here."
        />
      </View>
    </ScrollView>
  );
}
