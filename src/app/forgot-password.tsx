import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your company email.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    router.push("/reset-code");
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Forgot Password?
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Enter your company email and we'll help you reset your password.
      </Text>

      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Company Email
        </Text>

        <TextInput
          placeholder="name@company.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />

        {error ? (
          <Text className="mt-2 text-sm font-semibold text-red-600">
            {error}
          </Text>
        ) : null}
      </View>

      <View className="mt-8">
        <Button
          title="Continue"
          onPress={handleContinue}
        />
      </View>
    </View>
  );
}