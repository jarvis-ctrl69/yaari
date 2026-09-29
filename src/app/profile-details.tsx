import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import Card from "@/components/Card";

export default function ProfileDetailsScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    age: string;
    gender: string;
    company: string;
    job_role: string;
    city: string;
    interests: string;
    bio: string;
  }>();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-5 pb-10 pt-8">
        <Card>
          <Text className="text-3xl font-bold text-gray-900">
            {params.name}
          </Text>

          <Text className="mt-2 text-base text-gray-600">
            {params.age} • {params.gender}
          </Text>

          {params.job_role && (
            <Text className="mt-6 text-lg font-semibold text-gray-900">
              {params.job_role}
            </Text>
          )}

          {params.company && (
            <Text className="mt-1 text-base text-gray-600">
              {params.company}
            </Text>
          )}

          {params.city && (
            <Text className="mt-5 text-base text-gray-600">
              📍 {params.city}
            </Text>
          )}

          {params.interests && (
            <View className="mt-6">
              <Text className="text-sm font-semibold text-gray-500">
                INTERESTS
              </Text>

              <Text className="mt-2 text-base text-gray-700">
                {params.interests}
              </Text>
            </View>
          )}

          {params.bio && (
            <View className="mt-6">
              <Text className="text-sm font-semibold text-gray-500">
                ABOUT
              </Text>

              <Text className="mt-2 text-base leading-6 text-gray-700">
                {params.bio}
              </Text>
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}