import { View, Text } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function VerifyEmailScreen() {
  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Verify Your Email
      </Text>

      <Text className="mt-4 text-base leading-6 text-gray-600">
        We've sent a confirmation email to your company email address.
      </Text>

      <Text className="mt-4 text-base leading-6 text-gray-600">
        Open the email and tap the "Confirm your email" button.
        After confirming your account, return to Yaari and log in.
      </Text>

      <View className="mt-8">
        <Button
          title="Go to Login"
          onPress={() => router.replace("/login")}
        />
      </View>
    </View>
  );
}