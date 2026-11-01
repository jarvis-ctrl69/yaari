
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useLocalSearchParams, router } from "expo-router";

import { verifyCheckin } from "@/lib/api";

export default function QRScannerScreen() {
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = params.tripId;

  const [permission, requestPermission] = useCameraPermissions();

  const [scanned, setScanned] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [message, setMessage] = useState("");

  const handleBarcodeScanned = async ({
    data,
  }: {
    data: string;
  }) => {
    if (scanned || checkingIn) return;

    setScanned(true);
    setCheckingIn(true);
    setMessage("Verifying QR and GPS location...");

    try {
      if (!tripId) {
        throw new Error("Trip ID is missing.");
      }

      let payload: { tripId: string; token: string };

      try {
        payload = JSON.parse(data);
      } catch {
        throw new Error("Invalid YAARI QR code.");
      }

      if (
        payload.tripId !== tripId ||
        typeof payload.token !== "string" ||
        !payload.token
      ) {
        throw new Error("This QR code does not belong to this trip.");
      }

      const locationPermission =
        await Location.requestForegroundPermissionsAsync();

      if (locationPermission.status !== "granted") {
        throw new Error(
          "Location permission is required for GPS check-in."
        );
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result = await verifyCheckin(
        tripId,
        payload.token,
        location.coords.latitude,
        location.coords.longitude
      );

      setMessage(
        `Check-in successful! You are ${result.distanceMeters} metres from the pickup point.`
      );

      Alert.alert(
        "Check-in Successful",
        `Your attendance has been recorded.\nDistance from pickup: ${result.distanceMeters} metres.`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message
          : "Unable to complete check-in.";

      setMessage(errorText);

      Alert.alert("Check-in Failed", errorText, [
        {
          text: "Try Again",
          onPress: () => {
            setScanned(false);
            setMessage("");
          },
        },
        {
          text: "Go Back",
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setCheckingIn(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />
        <Text className="mt-3 text-gray-600">
          Checking camera permission...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Camera Permission
        </Text>

        <Text className="mt-3 text-center text-gray-500">
          YAARI needs camera access to scan the trip check-in QR code.
        </Text>

        <Pressable
          onPress={requestPermission}
          className="mt-6 rounded-xl bg-blue-600 px-6 py-4"
        >
          <Text className="font-bold text-white">
            Allow Camera Access
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="mt-4"
        >
          <Text className="font-semibold text-gray-500">
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View className="px-6 pb-5 pt-14">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base font-semibold text-white">
            ← Back
          </Text>
        </Pressable>

        <Text className="mt-5 text-2xl font-bold text-white">
          Scan Trip QR
        </Text>

        <Text className="mt-2 text-sm text-gray-300">
          Scan the QR code displayed by your trip creator.
        </Text>
      </View>

      <View className="flex-1 overflow-hidden">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={
            scanned || checkingIn
              ? undefined
              : handleBarcodeScanned
          }
        />
      </View>

      <View className="items-center px-6 py-8">
        {checkingIn ? (
          <ActivityIndicator color="#FFFFFF" size="large" />
        ) : null}

        <Text className="mt-3 text-center text-base font-semibold text-white">
          {message ||
            "Position the trip QR code inside the camera view."}
        </Text>

        <Text className="mt-3 text-center text-xs text-gray-400">
          GPS check-in is allowed within 100 metres of the pickup point.
        </Text>
      </View>
    </View>
  );
}
