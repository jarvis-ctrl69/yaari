import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import Card from "@/components/Card";
import { getTripGroup } from "@/lib/api";

type GroupMember = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  company?: string;
  job_role?: string;
  city?: string;
};

type Group = {
  id: string;
  trip_id: string;
  created_at: string;
};

export default function GroupScreen() {
  const params = useLocalSearchParams<{
    tripId?: string | string[];
  }>();

  // Expo Router can return a parameter as a string or string[]
  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadGroup = async () => {
      if (!tripId) {
        setErrorMessage("Trip ID is missing.");
        setLoading(false);
        return;
      }

      console.log("Loading group for trip:", tripId);

      try {
        const data = await getTripGroup(tripId);

        console.log("Group response:", data);

        setGroup(data.group);
        setMembers(data.members || []);
      } catch (error) {
        console.error("Failed to load group:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load trip group."
        );
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [tripId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-4 text-base text-gray-500">
          Loading group...
        </Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Unable to load group
        </Text>

        <Text className="mt-3 text-center text-base text-red-600">
          {errorMessage}
        </Text>

        <Text className="mt-4 text-center text-sm text-gray-500">
          Trip ID: {tripId || "missing"}
        </Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Group not found
        </Text>

        <Text className="mt-2 text-center text-base text-gray-500">
          This trip does not have a group yet.
        </Text>

        <Text className="mt-4 text-center text-sm text-gray-400">
          Trip ID: {tripId || "missing"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pb-12 pt-10">

        {/* HEADER */}
        <Text className="text-3xl font-bold text-gray-900">
          Trip Group
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          Your Yaari travel group
        </Text>

        {/* GROUP INFORMATION */}
        <View className="mt-6">
          <Card>
            <Text className="text-sm font-semibold text-gray-500">
              GROUP
            </Text>

            <Text className="mt-2 text-xl font-bold text-gray-900">
              {members.length}{" "}
              {members.length === 1 ? "Member" : "Members"}
            </Text>

            <Text className="mt-2 text-sm text-gray-500">
              Group created successfully for this trip.
            </Text>
          </Card>
        </View>

        {/* MEMBERS */}
        <View className="mt-6">
          <Text className="mb-4 text-xl font-bold text-gray-900">
            Group Members
          </Text>

          {members.map((member) => (
            <View key={member.id} className="mb-4">
              <Card>
                <View className="flex-row items-center">

                  {/* INITIAL */}
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                    <Text className="text-xl font-bold text-blue-600">
                      {member.name?.charAt(0).toUpperCase() || "Y"}
                    </Text>
                  </View>

                  {/* MEMBER DETAILS */}
                  <View className="ml-4 flex-1">
                    <Text className="text-lg font-bold text-gray-900">
                      {member.name}
                    </Text>

                    <Text className="mt-1 text-sm font-semibold text-blue-600">
                      {member.role === "admin"
                        ? "Trip Creator • Admin"
                        : "Member"}
                    </Text>

                    {member.job_role ? (
                      <Text className="mt-1 text-sm text-gray-500">
                        {member.job_role}
                      </Text>
                    ) : null}

                    {member.company ? (
                      <Text className="mt-1 text-sm text-gray-500">
                        {member.company}
                      </Text>
                    ) : null}

                    {member.city ? (
                      <Text className="mt-1 text-sm text-gray-500">
                        📍 {member.city}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </View>
          ))}
        </View>

        {/* FUTURE GROUP FEATURES */}
        <View className="mt-2">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Group Features
            </Text>

            <Text className="mt-3 text-base leading-6 text-gray-600">
              Group chat, trip sharing, safety tools, and check-ins
              will be available here.
            </Text>
          </Card>
        </View>

      </View>
    </ScrollView>
  );
}