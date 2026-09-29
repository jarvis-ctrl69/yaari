import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import Card from "@/components/Card";
import { getProfiles } from "@/lib/api";

type Profile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  company_email: string;
  phone: string;
  company?: string;
  job_role?: string;
  city?: string;
  interests?: string;
  bio?: string;
};

export default function ExploreScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProfiles();

      setProfiles(data);
    } catch (error) {
      console.error("Failed to load profiles:", error);
      setError("Unable to load profiles.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pb-10 pt-16">
        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900">
          Explore
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          Discover people on Yaari
        </Text>

        {/* Loading */}
        {loading && (
          <View className="mt-10 items-center">
            <ActivityIndicator size="large" />

            <Text className="mt-3 text-gray-500">
              Loading profiles...
            </Text>
          </View>
        )}

        {/* Error */}
        {!loading && error !== "" && (
          <View className="mt-8 rounded-2xl bg-red-50 p-5">
            <Text className="text-center text-red-600">
              {error}
            </Text>
          </View>
        )}

        {/* No profiles */}
        {!loading &&
          error === "" &&
          profiles.length === 0 && (
            <View className="mt-10 items-center">
              <Text className="text-base text-gray-500">
                No profiles found.
              </Text>
            </View>
          )}

        {/* Profiles */}
        {!loading &&
          error === "" &&
          profiles.map((profile) => (
            <Pressable
              key={profile.id}
              onPress={() =>
                router.push({
                  pathname: "/profile-details",
                  params: {
                    id: profile.id,
                    name: profile.name,
                    age: String(profile.age),
                    gender: profile.gender,
                    company: profile.company ?? "",
                    job_role: profile.job_role ?? "",
                    city: profile.city ?? "",
                    interests: profile.interests ?? "",
                    bio: profile.bio ?? "",
                  },
                })
              }
              className="mt-5"
            >
              <Card>
                {/* Name */}
                <Text className="text-xl font-bold text-gray-900">
                  {profile.name}
                </Text>

                {/* Age + Gender */}
                <Text className="mt-1 text-base text-gray-600">
                  {profile.age} • {profile.gender}
                </Text>

                {/* Job */}
                {profile.job_role && (
                  <Text className="mt-3 text-base font-medium text-gray-800">
                    {profile.job_role}
                  </Text>
                )}

                {/* Company */}
                {profile.company && (
                  <Text className="mt-1 text-sm text-gray-600">
                    {profile.company}
                  </Text>
                )}

                {/* City */}
                {profile.city && (
                  <Text className="mt-3 text-sm text-gray-500">
                    📍 {profile.city}
                  </Text>
                )}

                {/* Interests */}
                {profile.interests && (
                  <Text className="mt-3 text-sm text-gray-600">
                    Interests: {profile.interests}
                  </Text>
                )}

                {/* Bio */}
                {profile.bio && (
                  <Text className="mt-3 text-sm leading-5 text-gray-600">
                    {profile.bio}
                  </Text>
                )}

                {/* View Profile */}
                <Text className="mt-4 text-sm font-semibold text-blue-600">
                  View Profile →
                </Text>
              </Card>
            </Pressable>
          ))}
      </View>
    </ScrollView>
  );
}