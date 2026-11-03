
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import { getProfileReviews } from "@/lib/api";

type Review = {
  id: string;
  trip_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  reviewer_name: string;
  trip_name: string | null;
};

export default function ProfileReviewsScreen() {
  const { profileId } = useLocalSearchParams<{
    profileId: string;
  }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!profileId) return;

    try {
      setLoading(true);

      const result = await getProfileReviews(profileId);

      setReviews(result.reviews || []);
      setAverageRating(
        Number(result.summary?.average_rating ?? 0)
      );
      setTotalReviews(
        Number(result.summary?.total_reviews ?? 0)
      );
    } catch (error) {
      console.error("Profile reviews error:", error);

      Alert.alert(
        "Unable to load reviews",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-3 text-gray-500">
          Loading reviews...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-5 pt-14">
          <Pressable onPress={() => router.back()}>
            <Text className="text-base font-semibold text-blue-600">
              ← Back
            </Text>
          </Pressable>

          <Text className="mt-5 text-3xl font-bold text-gray-900">
            Ratings & Reviews
          </Text>

          <Text className="mt-2 text-sm text-gray-500">
            Experiences shared by fellow YAARI travellers.
          </Text>

          {/* RATING SUMMARY */}
          <View className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
            <Text className="text-center text-sm font-semibold text-gray-500">
              Overall Member Rating
            </Text>

            <Text className="mt-3 text-center text-4xl font-bold text-gray-900">
              ⭐ {averageRating.toFixed(1)} / 5
            </Text>

            <Text className="mt-2 text-center text-sm text-gray-500">
              Based on {totalReviews}{" "}
              {totalReviews === 1 ? "review" : "reviews"}
            </Text>
          </View>

          {/* REVIEW LIST */}
          <View className="mt-7">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">
                Written Reviews
              </Text>

              <Text className="text-sm font-semibold text-blue-600">
                {reviews.length} total
              </Text>
            </View>

            {reviews.length === 0 ? (
              <View className="rounded-2xl border border-gray-200 bg-white p-6">
                <Text className="text-center text-lg font-bold text-gray-900">
                  No reviews yet
                </Text>

                <Text className="mt-2 text-center text-sm text-gray-500">
                  Reviews from completed YAARI trips will appear here.
                </Text>
              </View>
            ) : (
              reviews.map((review) => (
                <View
                  key={review.id}
                  className="mb-4 rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <View className="flex-row items-center">
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-100">
                      <Text className="text-lg font-bold text-blue-600">
                        {review.reviewer_name
                          ?.charAt(0)
                          ?.toUpperCase() || "Y"}
                      </Text>
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-base font-bold text-gray-900">
                        {review.reviewer_name}
                      </Text>

                      <Text className="mt-1 text-xs text-gray-500">
                        {formatDate(review.created_at)}
                      </Text>
                    </View>
                  </View>

                  <Text className="mt-4 text-2xl text-amber-500">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </Text>

                  <Text className="mt-3 text-sm leading-6 text-gray-700">
                    {review.review_text}
                  </Text>

                  <View className="mt-4 rounded-lg bg-gray-50 p-3">
                    <Text className="text-xs font-semibold text-gray-500">
                      TRIP
                    </Text>

                    <Text className="mt-1 text-sm font-semibold text-gray-800">
                      {review.trip_name || "YAARI Trip"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
