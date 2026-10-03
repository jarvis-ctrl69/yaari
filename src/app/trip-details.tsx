import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import Card from "@/components/Card";
import Button from "@/components/Button";
import { getTrip, requestToJoinTrip } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  creator_id: string;
  from_location: string;
  to_location: string;
  trip_date: string;
  departure_time: string;
  available_seats: number;
  seats_left: number;
  trip_cost: string | number;
  travel_type: string;
  description?: string;
  creator_name: string;
  company?: string;
  job_role?: string;
  city?: string;
};

export default function TripDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      if (!id) {
        Alert.alert("Error", "Trip ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const data = await getTrip(id);
        setTrip(data);
      } catch (error) {
        console.error("Failed to load trip:", error);

        Alert.alert(
          "Unable to load trip",
          "Something went wrong while loading this trip."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  const handleRequestToJoin = async () => {
    if (!trip) {
      return;
    }

    try {
      setRequesting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          "Login required",
          "Please log in before requesting to join a trip."
        );
        return;
      }

      await requestToJoinTrip(trip.id, user.id);

      Alert.alert(
        "Request sent",
        "Your request to join this trip has been sent."
      );
    } catch (error: any) {
      console.error("Request to join failed:", error);

      Alert.alert(
        "Unable to send request",
        error?.message ||
          "Something went wrong while sending your request."
      );
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />

        <Text className="mt-4 text-base text-gray-500">
          Loading trip...
        </Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Trip not found
        </Text>

        <Text className="mt-2 text-center text-base text-gray-500">
          This trip may no longer be available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-10 pt-8">

        {/* Route */}
        <Card>
          <Text className="text-3xl font-bold text-gray-900">
            {trip.from_location} → {trip.to_location}
          </Text>

          <Text className="mt-4 text-base text-gray-600">
            📅 {trip.trip_date}
          </Text>

          <Text className="mt-2 text-base text-gray-600">
            🕐 {trip.departure_time}
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">

            <View className="rounded-full bg-blue-50 px-4 py-2">
              <Text className="font-semibold text-blue-700">
                🚗 {trip.travel_type}
              </Text>
            </View>

            <View className="rounded-full bg-green-50 px-4 py-2">
              <Text className="font-semibold text-green-700">
                {trip.available_seats} seats
              </Text>
            </View>
            <View className="rounded-full bg-red-50 px-4 py-2">
          <Text className="text-base text-gray-600">
               {trip.travel_type} · {trip.available_seats} seats ·{" "}
                 {trip.seats_left} seats left · ₹{trip.trip_cost}
                </Text>
            </View>

            <View className="rounded-full bg-yellow-50 px-4 py-2">
              <Text className="font-semibold text-yellow-700">
                ₹{trip.trip_cost} PER PERSON
              </Text>
            </View>

          </View>
        </Card>

        {/* Creator */}
        <View className="mt-5">
          <Card>
            <Text className="text-sm font-semibold text-gray-500">
              TRIP CREATOR
            </Text>

            <Text className="mt-2 text-2xl font-bold text-gray-900">
              {trip.creator_name}
            </Text>

            {trip.job_role ? (
              <Text className="mt-2 text-base text-gray-600">
                {trip.job_role}
              </Text>
            ) : null}

            {trip.company ? (
              <Text className="mt-1 text-base text-gray-600">
                {trip.company}
              </Text>
            ) : null}

            {trip.city ? (
              <Text className="mt-2 text-base text-gray-600">
                📍 {trip.city}
              </Text>
            ) : null}
          </Card>
        </View>

        {/* Description */}
        {trip.description ? (
          <View className="mt-5">
            <Card>
              <Text className="text-sm font-semibold text-gray-500">
                ABOUT THIS TRIP
              </Text>

              <Text className="mt-3 text-base leading-6 text-gray-700">
                {trip.description}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* Request to Join */}
        <View className="mt-6">
          <Button
            title={
              requesting
                ? "Sending Request..."
                : "Request to Join"
            }
            onPress={handleRequestToJoin}
          />
        </View>

        {/* Join Requests */}
        <View className="mt-4">
          <Button
            title="View Join Requests"
            onPress={() =>
              router.push({
                pathname: "/trip-requests",
                params: {
                  tripId: trip.id,
                },
              })
            }
          />
        </View>

        {/* Trip Group */}
        <View className="mt-4">
          <Button
            title="View Trip Group"
            onPress={() =>
              router.push({
                pathname: "/groups",
                params: {
                  tripId: trip.id,
                },
              })
            }
          />
        </View>

      </View>
    </ScrollView>
  );
}