import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function ResetCodeScreen() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (code.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError("");
    router.push("/reset-password");
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Verification Code
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Enter the 6-digit code sent to your company email.
      </Text>

      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Code
        </Text>

        <TextInput
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={(text) => {
            setCode(text);
            setError("");
          }}
          keyboardType="number-pad"
          maxLength={6}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-center text-xl font-semibold tracking-widest text-gray-900"
        />

        {error ? (
          <Text className="mt-2 text-sm font-semibold text-red-600">
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-8">
        <Button
          title="Verify Code"
          onPress={handleContinue}
        />
      </View>

      <Text className="mt-5 text-center text-sm text-gray-500">
        Didn't receive the code? Request a new one.
      </Text>
    </View>
  );
}