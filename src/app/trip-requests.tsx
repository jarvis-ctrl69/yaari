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

      // Get the currently logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          "Login required",
          "Please log in again."
        );
        return;
      }

      // Send the logged-in user's ID to the backend.
      // Backend will verify that this user is the trip creator.
      await updateTripRequest(
        requestId,
        status,
        user.id
      );

      // Update the UI after successful response
      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === requestId
            ? {
                ...request,
                status,
              }
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
        error?.message ||
          "Something went wrong."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text className="mt-4 text-base text-gray-500">
          Loading requests...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pb-10 pt-8">

        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900">
          Trip Requests
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          People who want to join your trip.
        </Text>

        {/* No requests */}
        {requests.length === 0 ? (
          <View className="mt-8">
            <Card>
              <Text className="text-xl font-bold text-gray-900">
                No requests yet
              </Text>

              <Text className="mt-2 text-base leading-6 text-gray-500">
                When someone requests to join your trip,
                their request will appear here.
              </Text>
            </Card>
          </View>
        ) : (
          /* Requests */
          <View className="mt-6">
            {requests.map((request) => (
              <View
                key={request.id}
                className="mb-4"
              >
                <Card>

                  {/* Requester name */}
                  <Text className="text-xl font-bold text-gray-900">
                    {request.requester_name}
                  </Text>

                  {/* Job + company */}
                  {request.job_role ||
                  request.company ? (
                    <Text className="mt-1 text-sm text-gray-500">
                      {request.job_role}

                      {request.job_role &&
                      request.company
                        ? " • "
                        : ""}

                      {request.company}
                    </Text>
                  ) : null}

                  {/* City */}
                  {request.city ? (
                    <Text className="mt-2 text-sm text-gray-500">
                      📍 {request.city}
                    </Text>
                  ) : null}

                  {/* Status */}
                  <View className="mt-4">
                    <Text
                      className={`font-semibold ${
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

                  {/* Actions */}
                  {request.status === "pending" ? (
                    <View className="mt-5 gap-3">

                      {/* Accept */}
                      <Button
                        title={
                          updatingId === request.id
                            ? "Updating..."
                            : "Accept"
                        }
                        onPress={() =>
                          handleUpdateRequest(
                            request.id,
                            "accepted"
                          )
                        }
                      />

                      {/* Reject */}
                      <Button
                        title="Reject"
                        onPress={() =>
                          handleUpdateRequest(
                            request.id,
                            "rejected"
                          )
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