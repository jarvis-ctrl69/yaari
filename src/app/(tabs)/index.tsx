import { View, Text } from "react-native";
import { router } from "expo-router";

import Button from "@/components/Button";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      {/* Header */}
      <Text className="text-4xl font-bold text-blue-600">
        Yaari
      </Text>

      <Text className="mt-3 text-2xl font-bold text-gray-900">
        Where are you going?
      </Text>

      <Text className="mt-2 text-base leading-6 text-gray-500">
        Create a trip, discover journeys, and connect with people
        travelling your way.
      </Text>

      {/* Create Trip */}
      <View className="mt-10">
        <Button
          title="Create a Trip"
          onPress={() => router.push("/create-trip")}
        />
      </View>

      {/* Explore Trips */}
      <View className="mt-4">
        <Button
          title="Explore Trips"
          onPress={() => router.push("/(tabs)/explore")}
        />
      </View>

      {/* My Trips */}
      <View className="mt-4">
        <Button
          title="My Trips"
          onPress={() => {}}
        />
      </View>

      {/* Safety */}
      <View className="mt-10 rounded-2xl bg-red-50 p-5">
        <Text className="text-lg font-bold text-red-700">
          🆘 Safety
        </Text>

        <Text className="mt-2 text-sm leading-5 text-red-600">
          Your safety matters. Emergency and trusted-contact features
          will be available here.
        </Text>
      </View>
    </View>
  );
}