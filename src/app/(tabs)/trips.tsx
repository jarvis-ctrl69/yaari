import { View, Text } from "react-native";

export default function TripsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-50">
      <Text className="text-3xl font-bold text-gray-900">
        My Trips
      </Text>

      <Text className="mt-3 text-base text-gray-500">
        Your trips will appear here.
      </Text>
    </View>
  );
}