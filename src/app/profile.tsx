import { View, Text } from "react-native";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { router } from "expo-router";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Profile
      </Text>

      <View className="mt-6">
        <Card>
          <View className="items-center">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-blue-100">
              <Text className="text-3xl font-bold text-blue-600">
                Y
              </Text>
            </View>

            <Text className="mt-4 text-2xl font-bold text-gray-900">
              Yaari User
            </Text>

            <Text className="mt-1 text-base text-gray-500">
              @yaariuser
            </Text>

            <Text className="mt-4 text-center text-base leading-6 text-gray-600">
              Welcome to Yaari! Your profile information will appear here.
            </Text>

            <View className="mt-6 w-full">
              <Button
  title="Edit Profile"
  onPress={() => router.push("/edit-profile")}
/>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}