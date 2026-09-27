import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-600">
      <Text className="text-4xl font-bold text-white">
        Yaari
      </Text>

      <Text className="mt-4 text-lg text-white">
        Tailwind is working! 🎉
      </Text>
    </View>
  );
}