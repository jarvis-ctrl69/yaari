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

export default function ProfileSetupScreen() {
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState("");
  const [bio, setBio] = useState("");

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

  const handleContinue = () => {
    console.log("Profile setup submitted");
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
          onChangeText={setCompany}
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
          onChangeText={setJobRole}
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
          onChangeText={setCity}
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
          onChangeText={setInterests}
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
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Continue */}
      <View className="mt-8">
        <Button
          title="Continue"
          onPress={handleContinue}
        />
      </View>
    </ScrollView>
  );
}