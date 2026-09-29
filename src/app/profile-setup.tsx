import { router } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Button from "@/components/Button";

import { supabase } from "@/lib/supabase";
import { createProfile } from "@/lib/api";

export default function ProfileSetupScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
  setError("");
  setLoading(true);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("You must be logged in to create your profile.");
      setLoading(false);
      return;
    }

    const profile = await createProfile({
      id: user.id,

      // Information collected during signup
      name: user.user_metadata?.name ?? "",
      age: Number(user.user_metadata?.age ?? 0),
      gender: user.user_metadata?.gender ?? "",
      company_email: user.email ?? "",
      phone: user.user_metadata?.phone ?? "",

      // Information collected during profile setup
      company,
      job_role: jobRole,
      city,
      interests,
      bio,
    });

    console.log("Profile created successfully:", profile);

    setLoading(false);
    
    router.replace("/home");

  } catch (error) {
    console.error("Profile creation failed:", error);

    setLoading(false);
    setError("Unable to save your profile. Please try again.");
  }
};

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-6 pb-10 pt-16"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-3xl font-bold text-gray-900">
        Set Up Your Profile
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Tell the Yaari community a little more about yourself.
      </Text>

      {/* Profile Photo */}
      <View className="mt-8 items-center">
        <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-100">
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              className="h-full w-full"
            />
          ) : (
            <Text className="text-3xl font-bold text-blue-600">
              Y
            </Text>
          )}
        </View>

        <View className="mt-4">
          <Button
            title="Choose Profile Photo"
            onPress={pickImage}
          />
        </View>
      </View>

      {/* Company */}
      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Company / Organization
        </Text>

        <TextInput
          placeholder="Enter your company"
          value={company}
          onChangeText={(text) => {
            setCompany(text);
            setError("");
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Job Role */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Job Role
        </Text>

        <TextInput
          placeholder="e.g. Software Engineer"
          value={jobRole}
          onChangeText={(text) => {
            setJobRole(text);
            setError("");
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* City */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          City
        </Text>

        <TextInput
          placeholder="Enter your city"
          value={city}
          onChangeText={(text) => {
            setCity(text);
            setError("");
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Interests */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Interests
        </Text>

        <TextInput
          placeholder="e.g. Music, Sports, Technology"
          value={interests}
          onChangeText={(text) => {
            setInterests(text);
            setError("");
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Bio */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Bio
        </Text>

        <TextInput
          placeholder="Tell us about yourself"
          value={bio}
          onChangeText={(text) => {
            setBio(text);
            setError("");
          }}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Error */}
      {error ? (
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
      ) : null}

      {/* Continue */}
      <View className="mt-8">
        <Button
          title={loading ? "Saving Profile..." : "Continue"}
          onPress={handleContinue}
        />
      </View>
    </ScrollView>
  );
}