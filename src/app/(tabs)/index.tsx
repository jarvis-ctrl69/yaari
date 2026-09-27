import { View, Text } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-20">
      <View className="flex-1 justify-center">
        <Text className="text-center text-5xl font-bold text-blue-600">
          Yaari
        </Text>

        <Text className="mt-4 text-center text-2xl font-bold text-gray-900">
          Connect. Share. Belong.
        </Text>

        <Text className="mt-4 text-center text-base leading-6 text-gray-600">
          Welcome to Yaari. Create your account and start connecting with
          people around you.
        </Text>

        <View className="mt-10">
          <Button
            title="Create Account"
            onPress={() => router.push("/signup")}
          />
        </View>

        <View className="mt-4">
          <Button
            title="Login"
            onPress={() => router.push("/login")}
          />
        </View>
      </View>
    </View>
  );
}