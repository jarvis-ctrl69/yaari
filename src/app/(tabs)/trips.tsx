import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import Card from "@/components/Card";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";
import { getMyTrips } from "@/lib/api";

type Trip = {
  id: string;
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  departure_time: string;
  available_seats: number;
  trip_cost: number;
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

  useEffect(() => {
    const loadMyTrips = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          console.log("Unable to get logged-in user");
          return;
        }

        const data = await getMyTrips(user.id);

        setCreatedTrips(data.createdTrips || []);
        setJoinedTrips(data.joinedTrips || []);
      } catch (error) {
        console.error("Failed to load my trips:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMyTrips();
  }, []);

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";

    const [hours, minutes] = time.split(":");
    const hour = Number(hours);

    if (Number.isNaN(hour)) {
      return time;
    }

    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;

    return `${formattedHour}:${minutes} ${period}`;
  };

  const renderTripCard = (trip: Trip, type: "created" | "joined") => {
    return (
      <View key={trip.id} className="mb-4">
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900">
              {trip.from_location}
            </Text>

            <Text className="text-lg font-bold text-blue-600">
              →
            </Text>

            <Text className="text-lg font-bold text-gray-900">
              {trip.to_location}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="text-sm text-gray-500">
              📅 {formatDate(trip.trip_date)}
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              🕐 {formatTime(trip.departure_time)}
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              🚗 {trip.travel_type}
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              👥 {trip.available_seats} seats available
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              💰 ₹{trip.trip_cost}
            </Text>
          </View>

          {type === "joined" && trip.creator_name ? (
            <View className="mt-4 rounded-xl bg-gray-50 p-3">
              <Text className="text-sm font-semibold text-gray-700">
                Trip created by
              </Text>

              <Text className="mt-1 text-base font-bold text-gray-900">
                {trip.creator_name}
              </Text>

              {trip.job_role ? (
                <Text className="mt-1 text-sm text-gray-500">
                  {trip.job_role}
                </Text>
              ) : null}

              {trip.company ? (
                <Text className="mt-1 text-sm text-blue-600">
                  {trip.company}
                </Text>
              ) : null}
            </View>
          ) : null}

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
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

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
    >
      <View className="px-6 pb-12 pt-14">
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