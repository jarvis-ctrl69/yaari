import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import Button from "@/components/Button";

export default function EditProfileScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Edit Profile
      </Text>

      <Text className="mt-3 text-base text-gray-600">
        Update your Yaari profile information.
      </Text>

      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Name
        </Text>

        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      <View className="mt-6">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Username
        </Text>

        <TextInput
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      <View className="mt-6">
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

      <View className="mt-8">
        <Button
  title="Save Changes"
  onPress={() => {
    console.log("Name:", name);
    console.log("Username:", username);
    console.log("Bio:", bio);
  }}
/>
      </View>
    </View>
  );
}