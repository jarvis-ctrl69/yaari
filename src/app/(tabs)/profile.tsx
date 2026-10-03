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
import { getProfile } from "@/lib/api";

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
  preferred_travel_type?: string;
  profile_image_url?: string;

  // Yaari activity statistics
  trips_created: number;
  trips_joined: number;
};

export default function ProfileTabScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log("Unable to get logged-in user");
          return;
        }

        const data = await getProfile(user.id);

        if (data) {
          setProfile({
            ...data,
            trips_created: Number(data.trips_created ?? 0),
            trips_joined: Number(data.trips_joined ?? 0),
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-4 text-base text-gray-500">
          Loading profile...
        </Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-xl font-bold text-gray-900">
          Profile not found
        </Text>

        <Text className="mt-2 text-center text-base text-gray-500">
          We couldn't load your profile information.
        </Text>

        <View className="mt-6 w-full">
          <Button
            title="Set Up Profile"
            onPress={() => router.push("/profile-setup")}
          />
        </View>
      </View>
    );
  }

  const initial =
    profile.name?.charAt(0).toUpperCase() || "Y";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-6 pb-12 pt-14">

        {/* HEADER */}
        <Text className="text-3xl font-bold text-gray-900">
          Profile
        </Text>

        {/* PROFILE CARD */}
        <View className="mt-6">
          <Card>
            <View className="items-center">

              {/* PROFILE PHOTO / INITIAL */}
              <View className="h-28 w-28 items-center justify-center rounded-full bg-blue-100">
                <Text className="text-4xl font-bold text-blue-600">
                  {initial}
                </Text>
              </View>

              {/* NAME */}
              <Text className="mt-5 text-2xl font-bold text-gray-900">
                {profile.name}
              </Text>

              {/* JOB */}
              {profile.job_role ? (
                <Text className="mt-1 text-base text-gray-500">
                  {profile.job_role}
                </Text>
              ) : null}

              {/* COMPANY */}
              {profile.company ? (
                <Text className="mt-1 text-base font-semibold text-blue-600">
                  {profile.company}
                </Text>
              ) : null}

              {/* LOCATION */}
              {profile.city ? (
                <Text className="mt-2 text-sm text-gray-500">
                  📍 {profile.city}
                </Text>
              ) : null}

              {/* EDIT PROFILE */}
              <View className="mt-6 w-full">
                <Button
                  title="Edit Profile"
                  onPress={() => router.push("/edit-profile")}
                />
              </View>
            </View>
          </Card>
        </View>

        {/* ABOUT */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              About Me
            </Text>

            <Text className="mt-3 text-base leading-6 text-gray-600">
              {profile.bio || "No bio added yet."}
            </Text>
          </Card>
        </View>

        {/* PERSONAL INFORMATION */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Personal Information
            </Text>

            <View className="mt-5">

              <Text className="text-sm font-semibold text-gray-500">
                Age
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {profile.age}
              </Text>

              <Text className="mt-4 text-sm font-semibold text-gray-500">
                Gender
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {profile.gender}
              </Text>

              <Text className="mt-4 text-sm font-semibold text-gray-500">
                Company Email
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {profile.company_email}
              </Text>

              <Text className="mt-4 text-sm font-semibold text-gray-500">
                Phone
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {profile.phone}
              </Text>

            </View>
          </Card>
        </View>

        {/* TRAVEL INFORMATION */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Travel Information
            </Text>

            <View className="mt-5">

              <Text className="text-sm font-semibold text-gray-500">
                Preferred Travel Type
              </Text>

              <Text className="mt-1 text-base text-gray-900">
                {profile.preferred_travel_type || "Not specified"}
              </Text>

              <Text className="mt-4 text-sm font-semibold text-gray-500">
                Interests
              </Text>

              <Text className="mt-1 text-base leading-6 text-gray-900">
                {profile.interests || "No interests added yet."}
              </Text>

            </View>
          </Card>
        </View>

        {/* YAARI ACTIVITY */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Yaari Activity
            </Text>

            <View className="mt-5 flex-row justify-between">

              {/* TRIPS CREATED */}
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600">
                  {profile.trips_created}
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Trips Created
                </Text>
              </View>

              {/* TRIPS JOINED */}
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600">
                  {profile.trips_joined}
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Trips Joined
                </Text>
              </View>

              {/* COMPLETED */}
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-600">
                  —
                </Text>

                <Text className="mt-1 text-sm text-gray-500">
                  Completed
                </Text>
              </View>

            </View>

            <Text className="mt-5 text-center text-sm text-gray-500">
              Your Yaari activity will update automatically as you
              create and join trips.
            </Text>
          </Card>
        </View>

        {/* TRUST & COMMUNITY */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Trust & Community
            </Text>

            <Text className="mt-3 text-base leading-6 text-gray-600">
              Your Yaari activity and successful trips will help build
              your community profile over time.
            </Text>
          </Card>
        </View>

        {/* ACCOUNT */}
        <View className="mt-5">
          <Card>
            <Text className="text-xl font-bold text-gray-900">
              Account
            </Text>

            <View className="mt-5 gap-3">

              <Button
                title="Settings"
                onPress={() => {}}
              />

              <Button
                title="Notifications"
                onPress={() => {}}
              />

              <Button
                title="Safety"
                onPress={() => {}}
              />

            </View>
          </Card>
        </View>

      </View>
    </ScrollView>
  );
}