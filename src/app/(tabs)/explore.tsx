
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import Card from "@/components/Card";
import Button from "@/components/Button";
import { getTrips } from "@/lib/api";

type Trip = {
  id: string;
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  departure_time: string;
  available_seats: number;
  trip_cost: string | number;
  travel_type: string;
  description?: string;
  creator_name: string;
  company?: string;
  job_role?: string;
  city?: string;
};

// Extract a shorter, readable location from a full address
const shortLocation = (address: string) => {
  if (!address) return "Location unavailable";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).join(", ");
};

// Format date without changing the stored value
const formatDate = (dateString: string) => {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Format PostgreSQL time
const formatTime = (timeString: string) => {
  if (!timeString) return "Time unavailable";

  const [hours, minutes] = timeString.split(":");
  const date = new Date();

  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function ExploreScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTrips = async () => {
    try {
      setError("");

      const data = await getTrips();

      setTrips(data);
    } catch (error) {
      console.error("Failed to load trips:", error);
      setError("Unable to load trips. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-sm font-medium text-slate-500">
          Finding trips for you...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#2563EB"]}
        />
      }
    >
      <View className="px-5 pb-10 pt-7">

        {/* HEADER */}
        <View className="mb-6">
          <Text className="text-3xl font-extrabold text-slate-900">
            Explore Trips
          </Text>

          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Discover journeys, meet new people and travel together.
          </Text>

          <View className="mt-4 flex-row items-center">
            <View className="rounded-full bg-blue-100 px-3 py-2">
              <Text className="text-xs font-bold text-blue-700">
                {trips.length} {trips.length === 1 ? "TRIP" : "TRIPS"} AVAILABLE
              </Text>
            </View>
          </View>
        </View>

        {/* ERROR */}
        {error ? (
          <Card>
            <Text className="text-base font-semibold text-red-600">
              {error}
            </Text>

            <View className="mt-4">
              <Button title="Try Again" onPress={loadTrips} />
            </View>
          </Card>
        ) : null}

        {/* EMPTY STATE */}
        {!error && trips.length === 0 ? (
          <Card>
            <View className="items-center py-5">
              <Text className="text-4xl">🚗</Text>

              <Text className="mt-4 text-xl font-bold text-slate-900">
                No trips yet
              </Text>

              <Text className="mt-2 text-center text-sm leading-6 text-slate-500">
                There are no active trips available right now.
                Create one and start your journey.
              </Text>

              <View className="mt-5 w-full">
                <Button
                  title="Create a Trip"
                  onPress={() => router.push("/create-trip")}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {/* TRIP CARDS */}
        <View className="mt-1">
          {trips.map((trip) => (
            <View key={trip.id} className="mb-5">
              <Card>

                {/* CARD HEADER */}
                <View className="mb-5 flex-row items-center justify-between">
                  <Text className="text-xs font-bold tracking-wider text-slate-400">
                    YOUR NEXT JOURNEY
                  </Text>

                  <View className="rounded-full bg-green-50 px-3 py-1.5">
                    <Text className="text-xs font-bold text-green-700">
                      {trip.available_seats} seats left
                    </Text>
                  </View>
                </View>

                {/* ROUTE */}
                <View className="flex-row">
                  <View className="mr-3 items-center pt-1">
                    <View className="h-3 w-3 rounded-full border-2 border-green-600 bg-white" />

                    <View className="my-1 h-10 w-0.5 bg-slate-300" />

                    <View className="h-3 w-3 rounded-sm bg-blue-600" />
                  </View>

                  <View className="flex-1">
                    <View className="mb-4">
                      <Text className="text-xs font-semibold text-slate-400">
                        PICKUP
                      </Text>

                      <Text
                        numberOfLines={2}
                        className="mt-1 text-base font-bold text-slate-900"
                      >
                        {shortLocation(trip.from_location)}
                      </Text>
                    </View>

                    <View>
                      <Text className="text-xs font-semibold text-slate-400">
                        DROP-OFF
                      </Text>

                      <Text
                        numberOfLines={2}
                        className="mt-1 text-base font-bold text-slate-900"
                      >
                        {shortLocation(trip.to_location)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* DATE AND TIME */}
                <View className="mt-5 flex-row rounded-xl bg-slate-50 p-3">
                  <View className="flex-1">
                    <Text className="text-xs font-medium text-slate-400">
                      📅 DATE
                    </Text>

                    <Text className="mt-1 text-sm font-bold text-slate-800">
                      {formatDate(trip.trip_date)}
                    </Text>
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-xs font-medium text-slate-400">
                      🕐 DEPARTURE
                    </Text>

                    <Text className="mt-1 text-sm font-bold text-slate-800">
                      {formatTime(trip.departure_time)}
                    </Text>
                  </View>
                </View>

                {/* TRIP INFORMATION */}
                <View className="mt-4 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-blue-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-blue-700">
                      🚗 {trip.travel_type}
                    </Text>
                  </View>

                  <View className="rounded-full bg-green-50 px-3 py-2">
                    <Text className="text-xs font-semibold text-green-700">
                      👥 {trip.available_seats} seats
                    </Text>
                  </View>
                </View>

                {/* PRICE AND CREATOR */}
                <View className="mt-5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold text-slate-400">
                      TRIP COST
                    </Text>

                    <Text className="mt-1 text-2xl font-extrabold text-blue-700">
                      ₹{trip.trip_cost}
                    </Text>
                  </View>

                  <View className="max-w-[60%] items-end">
                    <Text className="text-xs font-semibold text-slate-400">
                      TRAVELLING WITH
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-1 text-sm font-bold text-slate-900"
                    >
                      {trip.creator_name}
                    </Text>

                    {trip.job_role || trip.company ? (
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-xs text-slate-500"
                      >
                        {trip.job_role}
                        {trip.job_role && trip.company ? " • " : ""}
                        {trip.company}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* DESCRIPTION */}
                {trip.description ? (
                  <Text
                    numberOfLines={2}
                    className="mt-4 text-sm leading-5 text-slate-500"
                  >
                    {trip.description}
                  </Text>
                ) : null}

                {/* VIEW TRIP */}
                <View className="mt-5 border-t border-slate-100 pt-4">
                  <Button
                    title="View Trip"
                    onPress={() =>
                      router.push({
                        pathname: "/trip-details",
                        params: {
                          id: trip.id,
                        },
                      })
                    }
                  />
                </View>

              </Card>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
