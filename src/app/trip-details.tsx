
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import Card from "@/components/Card";
import Button from "@/components/Button";
import { getTrip, requestToJoinTrip } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type TripDestination = {
  id?: string;
  destination_name: string;
  latitude?: number;
  longitude?: number;
  sequence_order?: number;
  segment_distance_km?: number | string | null;
};

type Trip = {
  id: string;
  creator_id: string;
  trip_name?: string | null;
  from_location: string;
  to_location: string;
  destinations?: TripDestination[] | null;
  total_distance_km?: number | string | null;
  vehicle_name?: string | null;
  vehicle_number?: string | null;
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
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [introMessage, setIntroMessage] = useState("");
  const [confirmations, setConfirmations] = useState({
    route: false,
    schedule: false,
    travelType: false,
    cost: false,
  });

  useEffect(() => {
    const loadTrip = async () => {
      if (!id) {
        setLoading(false);
        Alert.alert("Error", "Trip ID is missing.");
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

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

  const allConfirmed = Object.values(confirmations).every(Boolean);

  const updateConfirmation = (
    key: keyof typeof confirmations,
    value: boolean
  ) => {
    setConfirmations((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleRequestToJoin = async () => {
    if (requesting || requestSent) return;

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

    if (!allConfirmed) {
      Alert.alert(
        "Confirm trip requirements",
        "Please confirm all four trip requirements."
      );
      return;
    }

    if (!introMessage.trim() || introMessage.trim().length > 300) {
      Alert.alert(
        "Introduction required",
        "Please write an introduction between 1 and 300 characters."
      );
      return;
    }

    try {
      setRequesting(true);

      await requestToJoinTrip({
        trip_id: trip.id,
        requester_id: currentUserId,
        intro_message: introMessage.trim(),
        route_confirmed: confirmations.route,
        schedule_confirmed: confirmations.schedule,
        travel_type_confirmed: confirmations.travelType,
        cost_confirmed: confirmations.cost,
      });

      setRequestSent(true);
      setShowRequestForm(false);

      Alert.alert(
        "Request sent!",
        "Your introduction and trip confirmations have been shared with the trip creator."
      );
    } catch (error) {
      console.error("Request failed:", error);

      Alert.alert(
        "Unable to send request",
        error instanceof Error ? error.message : "Something went wrong."
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

  const confirmationItems: {
    key: keyof typeof confirmations;
    title: string;
    description: string;
  }[] = [
    {
      key: "route",
      title: "Route confirmation",
      description: "I agree with the pickup and drop-off locations.",
    },
    {
      key: "schedule",
      title: "Schedule confirmation",
      description: "The travel dates and departure time work for me.",
    },
    {
      key: "travelType",
      title: "Travel preference",
      description: `I am comfortable travelling by ${trip.travel_type}.`,
    },
    {
      key: "cost",
      title: "Cost agreement",
      description: `I agree to the displayed trip cost of ${formatCost(trip.trip_cost)}.`,
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="px-5 pb-8 pt-8">
        <Text className="text-3xl font-bold text-gray-900">
          Trip Details
        </Text>

        <Text className="mt-2 text-sm text-gray-500">
          Review the journey before requesting to join.
        </Text>

        {/* ROUTE AND COMPLETE ITINERARY */}
        <View className="mt-6">
          <Card>
            {trip.trip_name ? (
              <Text className="mb-2 text-xl font-extrabold text-gray-900">
                {trip.trip_name}
              </Text>
            ) : null}

            <Text className="text-xs font-bold text-gray-500">
              COMPLETE ITINERARY
            </Text>

            <View className="mt-4">
              <Text className="text-xs font-semibold text-gray-400">
                STARTING POINT
              </Text>
              <Text className="mt-1 text-base font-bold text-gray-900">
                {trip.from_location}
              </Text>
            </View>

            {trip.destinations && trip.destinations.length > 0 ? (
              <View className="mt-3">
                {trip.destinations
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
                  )
                  .map((destination, index) => (
                    <View
                      key={destination.id || `${trip.id}-destination-${index}`}
                      className="mt-3 border-l-2 border-blue-400 pl-3"
                    >
                      <Text className="text-xs font-semibold text-gray-400">
                        DESTINATION {index + 1}
                      </Text>
                      <Text className="mt-1 text-base font-bold text-gray-900">
                        {destination.destination_name}
                      </Text>
                      {destination.segment_distance_km !== null &&
                      destination.segment_distance_km !== undefined ? (
                        <Text className="mt-1 text-xs font-medium text-blue-700">
                          {Number(destination.segment_distance_km).toFixed(2)} km from previous stop
                        </Text>
                      ) : null}
                    </View>
                  ))}
              </View>
            ) : (
              <View className="mt-3">
                <Text className="text-xs font-semibold text-gray-400">
                  DESTINATION
                </Text>
                <Text className="mt-1 text-base font-bold text-gray-900">
                  {trip.to_location}
                </Text>
              </View>
            )}

            {trip.total_distance_km !== null &&
            trip.total_distance_km !== undefined ? (
              <View className="mt-4 border-t border-gray-100 pt-3">
                <Text className="text-xs font-semibold text-gray-500">
                  TOTAL ROAD DISTANCE
                </Text>
                <Text className="mt-1 text-xl font-extrabold text-blue-700">
                  {Number(trip.total_distance_km).toFixed(2)} km
                </Text>
              </View>
            ) : null}
          </Card>
        </View>

        {/* DATES */}
        <View className="mt-5">
          <Card>
            <Text className="text-xs font-bold text-gray-500">
              TRIP SCHEDULE
            </Text>

            <View className="mt-4 flex-row">
              <View className="flex-1 pr-2">
                <Text className="text-xs text-gray-500">START DATE</Text>
                <Text className="mt-2 text-base font-bold text-gray-900">
                  {formatDate(trip.trip_date)}
                </Text>
              </View>

              <View className="flex-1 pl-2">
                <Text className="text-xs text-gray-500">END DATE</Text>
                <Text className="mt-2 text-base font-bold text-gray-900">
                  {formatDate(trip.trip_end_date || trip.trip_date)}
                </Text>
              </View>
            </View>

            <View className="mt-5 flex-row flex-wrap gap-3">
              <View className="min-w-[120px] flex-1 rounded-xl bg-blue-50 p-3">
                <Text className="text-xs text-blue-700">DURATION</Text>
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
              {[
                ["Travel type", trip.travel_type],
                ["Cost per person", formatCost(trip.trip_cost)],
                ["Seats offered", String(trip.available_seats)],
                ["Seats remaining", String(seatsLeft)],
                ...(trip.vehicle_name ? [["Vehicle", trip.vehicle_name]] : []),
                ...(trip.vehicle_number ? [["Vehicle number", trip.vehicle_number]] : []),
              ].map(([label, value]) => (
                <View key={label} className="w-1/2 py-3">
                  <Text className="text-sm text-gray-500">{label}</Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* CREATOR */}
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

        {/* REQUEST AREA */}
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
          ) : requestSent ? (
            <View className="rounded-xl border border-green-200 bg-green-50 p-4">
              <Text className="font-bold text-green-800">
                Request sent successfully!
              </Text>
              <Text className="mt-1 text-sm text-green-700">
                The creator can now review your introduction and confirmations.
              </Text>
            </View>
          ) : seatsLeft <= 0 ? (
            <View className="rounded-xl bg-gray-100 p-4">
              <Text className="font-semibold text-gray-600">
                No seats available
              </Text>
            </View>
          ) : (
            <>
              {!showRequestForm ? (
                <Button
                  title="Request to Join"
                  onPress={() => setShowRequestForm(true)}
                />
              ) : (
                <Card>
                  <Text className="text-xl font-bold text-gray-900">
                    Ready to travel together?
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-gray-500">
                    Confirm the trip requirements and introduce yourself to the creator.
                  </Text>

                  <View className="mt-5">
                    <Text className="text-base font-bold text-gray-900">
                      Confirm your travel preferences
                    </Text>

                    {confirmationItems.map((item) => (
                      <View
                        key={item.key}
                        className="mt-3 flex-row items-start"
                      >
                        <View className="mr-3 mt-1">
                          <View
                            className={`h-6 w-6 items-center justify-center rounded-md border ${
                              confirmations[item.key]
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {confirmations[item.key] ? (
                              <Text className="font-bold text-white">✓</Text>
                            ) : null}
                          </View>
                        </View>

                        <View className="flex-1">
                          <Text className="font-semibold text-gray-900">
                            {item.title}
                          </Text>
                          <Text className="mt-1 text-sm leading-5 text-gray-500">
                            {item.description}
                          </Text>

                          <Text
                            onPress={() =>
                              updateConfirmation(
                                item.key,
                                !confirmations[item.key]
                              )
                            }
                            className="mt-2 font-semibold text-blue-600"
                          >
                            {confirmations[item.key]
                              ? "Confirmed ✓"
                              : "Tap to confirm"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <View className="mt-6">
                    <Text className="text-base font-bold text-gray-900">
                      Introduce yourself
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      Tell the creator why you want to join.
                    </Text>

                    <TextInput
                      value={introMessage}
                      onChangeText={setIntroMessage}
                      placeholder="Hi! I'm travelling to the same destination for..."
                      multiline
                      maxLength={300}
                      textAlignVertical="top"
                      className="mt-3 min-h-[110px] rounded-xl border border-gray-200 bg-white p-3 text-base text-gray-900"
                    />

                    <Text className="mt-1 text-right text-xs text-gray-400">
                      {introMessage.length}/300 characters
                    </Text>
                  </View>

                  <View className="mt-5">
                    <Button
                      title={
                        requesting
                          ? "Sending Request..."
                          : "Send Join Request"
                      }
                      onPress={handleRequestToJoin}
                    />
                  </View>

                  <View className="mt-3">
                    <Button
                      title="Cancel"
                      onPress={() => setShowRequestForm(false)}
                    />
                  </View>
                </Card>
              )}
            </>
          )}
        </View>

        {/* CREATOR REQUEST MANAGEMENT */}
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
