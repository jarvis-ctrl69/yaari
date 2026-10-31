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
  trip_end_date?: string | null;
  departure_time: string;
  available_seats: number;
  seats_left: number;
  trip_cost: string | number;
  travel_type: string;
  description?: string;
  status?: string;
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
  const [requestSent, setRequestSent] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadTrip = async () => {
      if (!id) {
        setLoading(false);
        Alert.alert("Error", "Trip ID is missing.");
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        setCurrentUserId(user?.id ?? null);

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

  const isCreator =
    !!currentUserId && trip?.creator_id === currentUserId;

  const seatsLeft = Math.max(
    0,
    Number(trip?.seats_left ?? trip?.available_seats ?? 0)
  );

  // Parse dates as local dates to avoid timezone shifting.
  const parseDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Not specified";

    const date = parseDate(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Inclusive duration: start date and end date both count.
  const getDuration = () => {
    if (!trip) return 0;

    const start = parseDate(trip.trip_date);
    const end = parseDate(trip.trip_end_date || trip.trip_date);

    const difference = Math.round(
      (end.getTime() - start.getTime()) / 86400000
    );

    return difference >= 0 ? difference + 1 : 0;
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

  const formatCost = (cost: string | number) => {
    const amount = Number(cost);

    if (!Number.isFinite(amount)) return `₹${cost}`;

    return `₹${amount.toLocaleString("en-IN")}`;
  };

if (requesting || requestSent) return;
  const handleRequestToJoin = async () => {
    if (!trip || !currentUserId) {
      Alert.alert("Login required", "Please log in first.");
      return;
    }

    if (isCreator) {
      Alert.alert("Your trip", "You cannot join your own trip.");
      return;
    }

    if (seatsLeft <= 0) {
      Alert.alert("No seats available", "This trip is full.");
      return;
    }

    try {
      setRequesting(true);

      await requestToJoinTrip(trip.id, currentUserId);

      setRequestSent(true);

      Alert.alert(
        "Request sent",
        "Your request to join this trip has been sent."
      );
    } catch (error) {
      console.error("Request failed:", error);

      Alert.alert(
        "Unable to send request",
        error instanceof Error
          ? error.message
          : "Something went wrong."
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

        <View className="mt-5 w-full">
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-5 pb-8 pt-8">

        {/* HEADER */}

        <Text className="text-3xl font-bold text-gray-900">
          Trip Details
        </Text>

        <Text className="mt-2 text-sm text-gray-500">
          Review the journey before requesting to join.
        </Text>

        {/* ROUTE */}

        <View className="mt-6">
          <Card>
            <Text className="text-xs font-bold text-gray-500">
              JOURNEY ROUTE
            </Text>

            <View className="mt-5 flex-row">
              <View className="mr-4 items-center">
                <View className="h-3 w-3 rounded-full bg-green-600" />

                <View className="my-1 h-12 w-0.5 bg-gray-300" />

                <View className="h-3 w-3 rounded-full bg-red-500" />
              </View>

              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">
                  {trip.from_location}
                </Text>

                <View className="h-12 justify-center">
                  <Text className="text-xs text-gray-400">
                    DESTINATION
                  </Text>
                </View>

                <Text className="text-base font-bold text-gray-900">
                  {trip.to_location}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* TRIP DATES */}

        <View className="mt-5">
          <Card>
            <Text className="text-xs font-bold text-gray-500">
              TRIP SCHEDULE
            </Text>

            <View className="mt-4 flex-row">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-gray-500">
                  START DATE
                </Text>

                <Text className="mt-2 text-base font-bold text-gray-900">
                  {formatDate(trip.trip_date)}
                </Text>
              </View>

              <View className="flex-1 pl-2">
                <Text className="text-xs text-gray-500">
                  END DATE
                </Text>

                <Text className="mt-2 text-base font-bold text-gray-900">
                  {formatDate(trip.trip_end_date || trip.trip_date)}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row flex-wrap gap-3">
              <View className="min-w-[120px] flex-1 rounded-xl bg-blue-50 p-3">
                <Text className="text-xs text-blue-700">
                  DURATION
                </Text>

                <Text className="mt-1 text-lg font-bold text-blue-800">
                  {getDuration()} {getDuration() === 1 ? "day" : "days"}
                </Text>
              </View>

              <View className="min-w-[120px] flex-1 rounded-xl bg-gray-100 p-3">
                <Text className="text-xs text-gray-600">
                  DEPARTURE TIME
                </Text>

                <Text className="mt-1 text-lg font-bold text-gray-900">
                  {formatTime(trip.departure_time)}
                </Text>
              </View>
            </View>

            <Text className="mt-3 text-xs text-gray-400">
              Both the start and end dates count towards trip duration.
            </Text>
          </Card>
        </View>

        {/* TRIP INFORMATION */}

        <View className="mt-5">
          <Card>
            <Text className="text-xs font-bold text-gray-500">
              TRIP INFORMATION
            </Text>

            <View className="mt-4 flex-row flex-wrap">
              <View className="w-1/2 py-3 pr-2">
                <Text className="text-sm text-gray-500">
                  Travel type
                </Text>

                <Text className="mt-1 text-base font-bold text-gray-900">
                  {trip.travel_type}
                </Text>
              </View>

              <View className="w-1/2 py-3 pl-2">
                <Text className="text-sm text-gray-500">
                  Cost per person
                </Text>

                <Text className="mt-1 text-base font-bold text-gray-900">
                  {formatCost(trip.trip_cost)}
                </Text>
              </View>

              <View className="w-1/2 py-3 pr-2">
                <Text className="text-sm text-gray-500">
                  Seats offered
                </Text>

                <Text className="mt-1 text-base font-bold text-gray-900">
                  {trip.available_seats}
                </Text>
              </View>

              <View className="w-1/2 py-3 pl-2">
                <Text className="text-sm text-gray-500">
                  Seats remaining
                </Text>

                <Text className="mt-1 text-base font-bold text-gray-900">
                  {seatsLeft}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* CREATOR DETAILS */}

        <View className="mt-5">
          <Card>
            <Text className="text-xs font-bold text-gray-500">
              TRIP CREATOR
            </Text>

            <Text className="mt-3 text-xl font-bold text-gray-900">
              {trip.creator_name || "YAARI Member"}
            </Text>

            {trip.job_role ? (
              <Text className="mt-2 text-sm text-gray-600">
                {trip.job_role}
              </Text>
            ) : null}

            {trip.company ? (
              <Text className="mt-1 text-sm font-semibold text-blue-600">
                {trip.company}
              </Text>
            ) : null}

            {trip.city ? (
              <Text className="mt-2 text-sm text-gray-500">
                📍 {trip.city}
              </Text>
            ) : null}
          </Card>
        </View>

        {/* DESCRIPTION */}

        {trip.description ? (
          <View className="mt-5">
            <Card>
              <Text className="text-xs font-bold text-gray-500">
                ABOUT THIS TRIP
              </Text>

              <Text className="mt-3 text-base leading-6 text-gray-700">
                {trip.description}
              </Text>
            </Card>
          </View>
        ) : null}

        {/* JOIN REQUEST */}

        <View className="mt-6">
          {isCreator ? (
            <View className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <Text className="font-semibold text-blue-800">
                You created this trip.
              </Text>

              <Text className="mt-1 text-sm text-blue-700">
                You can manage incoming join requests below.
              </Text>
            </View>
          ) : (
            <Button
              title={
                requesting
                  ? "Sending Request..."
                  : requestSent
                  ? "Request Sent"
                  : seatsLeft <= 0
                  ? "No Seats Available"
                  : "Request to Join"
              }
              onPress={handleRequestToJoin}
              // disabled={requesting || requestSent || seatsLeft <= 0}
            />
          )}
        </View>

        {/* CREATOR-ONLY REQUEST MANAGEMENT */}

        {isCreator ? (
          <View className="mt-4">
            <Button
              title="View Join Requests"
              onPress={() =>
                router.push({
                  pathname: "/trip-requests",
                  params: { tripId: trip.id },
                })
              }
            />
          </View>
        ) : null}

        {/* GROUP */}

        <View className="mt-4">
          <Button
            title="View Trip Group"
            onPress={() =>
              router.push({
                pathname: "/groups",
                params: { tripId: trip.id },
              })
            }
          />
        </View>

      </View>
    </ScrollView>
  );
}