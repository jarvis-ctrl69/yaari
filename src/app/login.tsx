import { View, Text } from "react-native";

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <Text className="text-3xl font-bold text-gray-900">
        Welcome Back
      </Text>

      <Text className="mt-3 text-base text-gray-600">
        Login to continue using Yaari.
      </Text>
    </View>
  );
}