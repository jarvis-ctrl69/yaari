
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";

import { supabase } from "@/lib/supabase";
import Card from "@/components/Card";
import Button from "@/components/Button";

import {
  getTripRequests,
  updateTripRequest,
} from "@/lib/api";

type TripRequest = {
  id: string;
  trip_id: string;
  requester_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  requester_name: string;
  company?: string;
  job_role?: string;
  city?: string;
  intro_message?: string | null;
  route_confirmed?: boolean;
  schedule_confirmed?: boolean;
  travel_type_confirmed?: boolean;
  cost_confirmed?: boolean;
};

export default function TripRequestsScreen() {
  const { tripId } = useLocalSearchParams<{
    tripId: string;
  }>();

  const [requests, setRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    try {
      const data = await getTripRequests(tripId);
      setRequests(data);
    } catch (error) {
      console.error("Failed to load requests:", error);

      Alert.alert(
        "Unable to load requests",
        "Something went wrong while loading trip requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [tripId])
  );

  const handleUpdateRequest = async (
    requestId: string,
    status: "accepted" | "rejected"
  ) => {
    try {
      setUpdatingId(requestId);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert("Login required", "Please log in again.");
        return;
      }

      await updateTripRequest(requestId, status, user.id);

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? { ...request, status }
            : request
        )
      );

      Alert.alert(
        status === "accepted"
          ? "Request accepted"
          : "Request rejected",
        status === "accepted"
          ? "The person has been accepted for your trip."
          : "The join request has been rejected."
      );
    } catch (error: any) {
      console.error("Update request failed:", error);

      Alert.alert(
        "Unable to update request",
        error?.message || "Something went wrong."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const CompatibilityItem = ({
    label,
    confirmed,
  }: {
    label: string;
    confirmed?: boolean;
  }) => (
    <View className="mt-3 flex-row items-center justify-between">
      <Text className="flex-1 text-sm text-gray-700">{label}</Text>
      <View
        className={`rounded-full px-3 py-1 ${
          confirmed
            ? "bg-green-50"
            : "bg-gray-100"
        }`}
      >
        <Text
          className={`text-xs font-semibold ${
            confirmed
              ? "text-green-700"
              : "text-gray-500"
          }`}
        >
          {confirmed ? "Confirmed" : "Not confirmed"}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-base text-gray-500">
          Loading requests...
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
        <Text className="text-3xl font-bold text-gray-900">
          Trip Requests
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          Review traveller introductions and trip compatibility before deciding.
        </Text>

        {requests.length === 0 ? (
          <View className="mt-8">
            <Card>
              <Text className="text-xl font-bold text-gray-900">
                No requests yet
              </Text>
              <Text className="mt-2 text-base leading-6 text-gray-500">
                When someone requests to join your trip, their request will appear here.
              </Text>
            </Card>
          </View>
        ) : (
          <View className="mt-6">
            {requests.map((request) => (
              <View key={request.id} className="mb-4">
                <Card>
                  <Text className="text-xl font-bold text-gray-900">
                    {request.requester_name}
                  </Text>

                  {request.job_role || request.company ? (
                    <Text className="mt-1 text-sm text-gray-500">
                      {request.job_role}
                      {request.job_role && request.company ? " • " : ""}
                      {request.company}
                    </Text>
                  ) : null}

                  {request.city ? (
                    <Text className="mt-2 text-sm text-gray-500">
                      📍 {request.city}
                    </Text>
                  ) : null}

                  <View className="mt-4">
                    <Text
                      className={`font-bold ${
                        request.status === "pending"
                          ? "text-yellow-600"
                          : request.status === "accepted"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {request.status.toUpperCase()}
                    </Text>
                  </View>

                  {/* Traveller introduction */}
                  <View className="mt-5 rounded-xl bg-blue-50 p-3">
                    <Text className="text-xs font-bold text-blue-700">
                      TRAVELLER INTRODUCTION
                    </Text>
                    <Text className="mt-2 text-sm leading-5 text-gray-700">
                      {request.intro_message?.trim() ||
                        "No introduction provided."}
                    </Text>
                  </View>

                  {/* Compatibility */}
                  <View className="mt-5">
                    <Text className="text-base font-bold text-gray-900">
                      Trip compatibility
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      Based on the traveller's explicit confirmations.
                    </Text>

                    <CompatibilityItem
                      label="Pickup and drop-off locations"
                      confirmed={request.route_confirmed}
                    />

                    <CompatibilityItem
                      label="Travel date and departure time"
                      confirmed={request.schedule_confirmed}
                    />

                    <CompatibilityItem
                      label="Travel type"
                      confirmed={request.travel_type_confirmed}
                    />

                    <CompatibilityItem
                      label="Trip cost"
                      confirmed={request.cost_confirmed}
                    />

                    <View className="mt-4 rounded-lg bg-gray-50 p-3">
                      <Text className="text-sm font-semibold text-gray-700">
                        {
                          [
                            request.route_confirmed,
                            request.schedule_confirmed,
                            request.travel_type_confirmed,
                            request.cost_confirmed,
                          ].filter(Boolean).length
                        } of 4 requirements confirmed
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500">
                        This is a compatibility checklist, not an automatic acceptance score.
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  {request.status === "pending" ? (
                    <View className="mt-5 gap-3">
                      <Button
                        title={
                          updatingId === request.id
                            ? "Updating..."
                            : "Accept"
                        }
                        onPress={() =>
                          handleUpdateRequest(request.id, "accepted")
                        }
                      />

                      <Button
                        title="Reject"
                        onPress={() =>
                          handleUpdateRequest(request.id, "rejected")
                        }
                      />
                    </View>
                  ) : null}
                </Card>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
