import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function VerifyEmailScreen() {
  const [code, setCode] = useState("");

  const handleVerify = () => {
    console.log("Verification code entered:", code);
    
    if (code.length === 6) {
      router.push("/profile-setup");
    }
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Verify Your Email
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        We've sent a verification code to your company email.
      </Text>

      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Verification Code
        </Text>

        <TextInput
          placeholder="Enter 6-digit code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-center text-xl font-semibold tracking-widest text-gray-900"
        />
      </View>

      <View className="mt-8">
        <Button
          title="Verify Email"
        //   onPress={handleVerify}
          onPress={() => router.push("/profile-setup")}
        />
      </View>

      <Text className="mt-5 text-center text-sm text-gray-500">
        Didn't receive the code? You can request a new one.
      </Text>
    </View>
  );
}