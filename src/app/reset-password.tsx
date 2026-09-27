import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleReset = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Reset Password
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Create a new password for your Yaari account.
      </Text>

      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          New Password
        </Text>

        <TextInput
          placeholder="Enter new password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          secureTextEntry
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Confirm Password
        </Text>

        <TextInput
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {error ? (
        <Text className="mt-3 text-sm font-semibold text-red-600">
          {error}
        </Text>
      ) : null}

      <Text className="mt-3 text-sm text-gray-500">
        Password must contain at least 8 characters.
      </Text>

      <View className="mt-8">
        <Button
          title="Reset Password"
          onPress={handleReset}
        />
      </View>
    </View>
  );
}