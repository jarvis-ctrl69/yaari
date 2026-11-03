
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import {
  getTripReviewMembers,
  submitTripReview,
  TripReviewMember,
  TripReviewProgress,
} from "../../lib/api";

export default function TripReviewsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [members, setMembers] = useState<TripReviewMember[]>([]);
  const [progress, setProgress] = useState<TripReviewProgress | null>(null);
  const [tripName, setTripName] = useState("Trip Reviews");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);

      const result = await getTripReviewMembers(tripId);

      setMembers(result.members);
      setProgress(result.progress);
      setTripName(result.trip.trip_name || "Trip Reviews");
    } catch (error) {
      Alert.alert(
        "Unable to load reviews",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews])
  );

  const handleRating = (memberId: string, rating: number) => {
    setRatings((previous) => ({
      ...previous,
      [memberId]: rating,
    }));
  };

  const handleReviewText = (memberId: string, text: string) => {
    setReviews((previous) => ({
      ...previous,
      [memberId]: text,
    }));
  };

  const handleSubmit = async (member: TripReviewMember) => {
    const rating = ratings[member.id];
    const reviewText = reviews[member.id]?.trim() || "";

    if (!rating) {
      Alert.alert("Rating required", "Please select a star rating.");
      return;
    }

    if (!reviewText) {
      Alert.alert("Written feedback required", "Please write your experience before submitting.");
      return;
    }

    if (submittingId) return;

    try {
      setSubmittingId(member.id);

      await submitTripReview(
        tripId,
        member.id,
        rating,
        reviewText
      );

      Alert.alert("Success", `Your review for ${member.name} has been submitted.`);

      await loadReviews();
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading trip reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Ratings & Reviews</Text>
        <Text style={styles.tripName}>{tripName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {progress && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Your Review Progress</Text>

            <Text style={styles.progressCount}>
              {progress.submitted} / {progress.required}
            </Text>

            <Text style={styles.progressSubtitle}>
              {progress.completed
                ? "You have reviewed all trip members!"
                : `${progress.remaining} review(s) remaining`}
            </Text>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      progress.required === 0
                        ? "100%"
                        : `${Math.min(
                            (progress.submitted / progress.required) * 100,
                            100
                          )}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No pending members</Text>
            <Text style={styles.emptyText}>
              There are no other eligible participants to review for this trip.
            </Text>
          </View>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>

                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberSubtitle}>Trip participant</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    member.has_reviewed
                      ? styles.completedBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      member.has_reviewed
                        ? styles.completedText
                        : styles.pendingText,
                    ]}
                  >
                    {member.has_reviewed ? "Submitted" : "Pending"}
                  </Text>
                </View>
              </View>

              {member.has_reviewed ? (
                <View style={styles.submittedReview}>
                  <Text style={styles.submittedRating}>
                    {"★".repeat(member.rating || 0)}
                    {"☆".repeat(5 - (member.rating || 0))}
                  </Text>

                  <Text style={styles.submittedText}>
                    {member.review_text}
                  </Text>

                  <Text style={styles.submittedNote}>
                    Your review has been submitted.
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewForm}>
                  <Text style={styles.fieldLabel}>
                    Your Rating (Required)
                  </Text>

                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => handleRating(member.id, star)}
                      >
                        <Text
                          style={[
                            styles.star,
                            star <= (ratings[member.id] || 0)
                              ? styles.selectedStar
                              : styles.unselectedStar,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>
                    Written Feedback (Required)
                  </Text>

                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Share your experience travelling with this person..."
                    placeholderTextColor="#9CA3AF"
                    value={reviews[member.id] || ""}
                    onChangeText={(text) =>
                      handleReviewText(member.id, text)
                    }
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                  />

                  <Text style={styles.characterCount}>
                    {(reviews[member.id] || "").length}/1000
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      submittingId === member.id && styles.disabledButton,
                    ]}
                    onPress={() => handleSubmit(member)}
                    disabled={submittingId !== null}
                  >
                    {submittingId === member.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>
                        Submit Review
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#0F172A",
  },
  tripName: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 5,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  progressCount: {
    fontSize: 30,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: 8,
  },
  progressSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    marginTop: 15,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
  },
  memberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  memberHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  memberSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedBadge: {
    backgroundColor: "#DCFCE7",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  completedText: {
    color: "#15803D",
  },
  pendingText: {
    color: "#92400E",
  },
  reviewForm: {
    marginTop: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  star: {
    fontSize: 36,
  },
  selectedStar: {
    color: "#F59E0B",
  },
  unselectedStar: {
    color: "#CBD5E1",
  },
  reviewInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  characterCount: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "right",
    marginTop: 5,
    marginBottom: 14,
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  submittedReview: {
    marginTop: 18,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 12,
  },
  submittedRating: {
    fontSize: 24,
    color: "#F59E0B",
  },
  submittedText: {
    fontSize: 14,
    color: "#334155",
    marginTop: 8,
    lineHeight: 21,
  },
  submittedNote: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 10,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
});
