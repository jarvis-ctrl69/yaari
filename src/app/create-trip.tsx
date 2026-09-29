import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { supabase } from "@/lib/supabase";
import { createTrip } from "@/lib/api";

export default function CreateTripScreen() {
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");

  const [tripDate, setTripDate] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [tripCost, setTripCost] = useState("");
  const [travelType, setTravelType] = useState("Car");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);

  const handleCreateTrip = async () => {
    if (
      !fromLocation.trim() ||
      !toLocation.trim() ||
      !tripDate.trim() ||
      !departureTime.trim() ||
      !availableSeats.trim() ||
      !tripCost.trim() ||
      !travelType.trim()
    ) {
      Alert.alert(
        "Missing information",
        "Please fill in all required fields."
      );
      return;
    }

    const seats = Number(availableSeats);
    const cost = Number(tripCost);

    if (!Number.isInteger(seats) || seats <= 0) {
      Alert.alert(
        "Invalid seats",
        "Available seats must be a positive number."
      );
      return;
    }

    if (Number.isNaN(cost) || cost < 0) {
      Alert.alert(
        "Invalid cost",
        "Trip cost must be a valid amount."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          "Login required",
          "Please log in before creating a trip."
        );
        return;
      }

      await createTrip({
        creator_id: user.id,
        from_location: fromLocation.trim(),
        to_location: toLocation.trim(),
        trip_date: tripDate.trim(),
        departure_time: departureTime.trim(),
        available_seats: seats,
        trip_cost: cost,
        travel_type: travelType.trim(),
        description: description.trim(),
      });

      Alert.alert(
        "Trip created",
        "Your trip has been created successfully.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/home"),
          },
        ]
      );
    } catch (error) {
      console.error("Create trip failed:", error);

      Alert.alert(
        "Unable to create trip",
        "Something went wrong while creating your trip."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (
    event: any,
    date?: Date
  ) => {
    setShowDatePicker(false);

    if (date) {
      setSelectedDate(date);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      setTripDate(`${year}-${month}-${day}`);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      keyboardShouldPersistTaps="handled"
    >
      <View className="px-5 pb-12 pt-8">

        {/* Header */}
        <Text className="text-3xl font-bold text-gray-900">
          Create a Trip
        </Text>

        <Text className="mt-2 text-base text-gray-500">
          Share your journey with the Yaari community.
        </Text>

        {/* From */}
        <View className="mt-8">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            From *
          </Text>

          <TextInput
            value={fromLocation}
            onChangeText={setFromLocation}
            placeholder="Starting location"
            placeholderTextColor="#9CA3AF"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* To */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            To *
          </Text>

          <TextInput
            value={toLocation}
            onChangeText={setToLocation}
            placeholder="Destination"
            placeholderTextColor="#9CA3AF"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Trip Date */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Trip Date *
          </Text>

          <Pressable
            onPress={() => setShowDatePicker(true)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
          >
            <Text
              className={
                tripDate
                  ? "text-base text-gray-900"
                  : "text-base text-gray-400"
              }
            >
              {tripDate || "Select trip date"}
            </Text>
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Departure Time */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Departure Time *
          </Text>

          <TextInput
            value={departureTime}
            onChangeText={setDepartureTime}
            placeholder="HH:MM"
            placeholderTextColor="#9CA3AF"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Seats + Cost */}
        <View className="mt-5 flex-row gap-3">

          {/* Seats */}
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Seats *
            </Text>

            <TextInput
              value={availableSeats}
              onChangeText={setAvailableSeats}
              placeholder="3"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
            />
          </View>

          {/* Cost */}
          <View className="flex-1">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              Cost *
            </Text>

            <TextInput
              value={tripCost}
              onChangeText={setTripCost}
              placeholder="1500"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
            />
          </View>
        </View>

        {/* Travel Type */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Travel Type
          </Text>

          <View className="flex-row gap-3">
            {["Car", "Bike", "Other"].map((type) => (
              <Pressable
                key={type}
                onPress={() => setTravelType(type)}
                className={`rounded-full border border-gray-200 px-5 py-3 ${
                  travelType === type
                    ? "bg-blue-600"
                    : "bg-white"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    travelType === type
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {type}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        <View className="mt-5">
          <Text className="mb-2 text-sm font-semibold text-gray-700">
            Description
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Tell people something about your trip..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="min-h-28 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
          />
        </View>

        {/* Create Trip Button */}
        <Pressable
          onPress={handleCreateTrip}
          disabled={loading}
          className={`mt-8 items-center rounded-2xl px-6 py-4 ${
            loading
              ? "bg-blue-300"
              : "bg-blue-600"
          }`}
        >
          {loading ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="white" />

              <Text className="ml-3 text-base font-semibold text-white">
                Creating Trip...
              </Text>
            </View>
          ) : (
            <Text className="text-base font-bold text-white">
              Create Trip
            </Text>
          )}
        </Pressable>

      </View>
    </ScrollView>
  );
}