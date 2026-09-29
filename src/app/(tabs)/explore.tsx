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
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-4 text-base text-gray-500">
          Finding trips...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <View className="px-5 pb-10 pt-8">

        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900">
          Explore Trips
        </Text>

        <Text className="mt-2 text-base leading-6 text-gray-500">
          Discover journeys and find people travelling your way.
        </Text>

        {/* Error */}
        {error ? (
          <Card>
            <Text className="text-base font-semibold text-red-600">
              {error}
            </Text>

            <View className="mt-4">
              <Button
                title="Try Again"
                onPress={loadTrips}
              />
            </View>
          </Card>
        ) : null}

        {/* Empty state */}
        {!error && trips.length === 0 ? (
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              No trips yet
            </Text>

            <Text className="mt-2 text-base leading-6 text-gray-500">
              There are no active trips available right now.
              Create one and start your journey.
            </Text>

            <View className="mt-5">
              <Button
                title="Create a Trip"
                onPress={() => router.push("/create-trip")}
              />
            </View>
          </Card>
        ) : null}

        {/* Trip list */}
        <View className="mt-6">
          {trips.map((trip) => (
            <Card key={trip.id}>

              {/* Route */}
              <Text className="text-xl font-bold text-gray-900">
                {trip.from_location} → {trip.to_location}
              </Text>

              {/* Date + time */}
              <Text className="mt-3 text-base text-gray-600">
                📅 {trip.trip_date}  •  🕐 {trip.departure_time}
              </Text>

              {/* Trip information */}
              <View className="mt-4 flex-row flex-wrap gap-2">

                <View className="rounded-full bg-blue-50 px-3 py-2">
                  <Text className="text-sm font-semibold text-blue-700">
                    🚗 {trip.travel_type}
                  </Text>
                </View>

                <View className="rounded-full bg-green-50 px-3 py-2">
                  <Text className="text-sm font-semibold text-green-700">
                    {trip.available_seats} seats
                  </Text>
                </View>

                <View className="rounded-full bg-yellow-50 px-3 py-2">
                  <Text className="text-sm font-semibold text-yellow-700">
                    ₹{trip.trip_cost}
                  </Text>
                </View>

              </View>

              {/* Creator */}
              <View className="mt-5">
                <Text className="text-sm font-semibold text-gray-500">
                  TRAVELLING WITH
                </Text>

                <Text className="mt-1 text-base font-semibold text-gray-900">
                  {trip.creator_name}
                </Text>

                {trip.job_role || trip.company ? (
                  <Text className="mt-1 text-sm text-gray-500">
                    {trip.job_role}
                    {trip.job_role && trip.company ? " • " : ""}
                    {trip.company}
                  </Text>
                ) : null}
              </View>

              {/* Description */}
              {trip.description ? (
                <Text className="mt-4 text-base leading-6 text-gray-600">
                  {trip.description}
                </Text>
              ) : null}

              {/* View button */}
              <View className="mt-5">
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
          ))}
        </View>

      </View>
    </ScrollView>
  );
}