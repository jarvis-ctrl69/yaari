
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import QRCode from "react-native-qrcode-svg";

import Card from "@/components/Card";
import {
  getTripGroup,
  getTrip,
  getGroupMessages,
  sendGroupMessage,
  generateCheckinQR,
  getTripAttendance,
  GroupMessage,
} from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";

// ========================================
// TYPES
// ========================================

type GroupMember = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  company?: string;
  job_role?: string;
  city?: string;
};

type Group = {
  id: string;
  trip_id: string;
  created_at: string;
  creator_id: string;
  trip_status: string;
};

type AttendanceItem = {
  id: string;
  user_id: string;
  member_name: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  checked_in_at: string;
};

type TripDestination = {
  id?: string;
  destination_name: string;
  latitude?: number;
  longitude?: number;
  sequence_order?: number;
  segment_distance_km?: number | string | null;
};

type TripDetails = {
  id: string;
  trip_name?: string | null;
  from_location: string;
  to_location: string;
  destinations?: TripDestination[] | null;
  total_distance_km?: number | string | null;
  vehicle_name?: string | null;
  vehicle_number?: string | null;
  travel_type?: string;
  trip_date?: string;
  trip_end_date?: string | null;
  departure_time?: string;
  trip_cost?: string | number;
  creator_name?: string;
};

// ========================================
// MAIN GROUP SCREEN
// ========================================

export default function GroupScreen() {
  const params = useLocalSearchParams<{
    tripId?: string | string[];
  }>();

  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const [group, setGroup] = useState<Group | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // ========================================
  // CHAT STATES
  // ========================================

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  // ========================================
  // QR CHECK-IN STATES
  // ========================================

  const [qrPayload, setQrPayload] = useState("");
  const [qrExpiry, setQrExpiry] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  // ========================================
  // ATTENDANCE STATES
  // ========================================

  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  const isCreator =
    !!currentUserId &&
    !!group?.creator_id &&
    currentUserId === group.creator_id;

  // ========================================
  // LOAD GROUP AND MEMBERS
  // ========================================

  useEffect(() => {
    let active = true;

    const loadGroup = async () => {
      if (!tripId) {
        setErrorMessage("Trip ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const data = await getTripGroup(tripId);

        if (!active) return;

        setGroup(data.group);
        setMembers(data.members || []);

        // Load the parent trip so the group can display its fixed itinerary.
        try {
          const tripData = await getTrip(tripId);
          if (active) {
            setTripDetails(tripData);
          }
        } catch (tripError) {
          console.error("Failed to load trip details for group:", tripError);
        }
      } catch (error) {
        console.error("Failed to load group:", error);

        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Failed to load trip group."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadGroup();

    return () => {
      active = false;
    };
  }, [tripId]);

  // ========================================
  // LOAD CURRENT LOGGED-IN USER
  // ========================================

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (active) {
          setCurrentUserId(session?.user.id || "");
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // LOAD GROUP CHAT AND SOCKET CONNECTION
  // ========================================

  useEffect(() => {
    if (!group?.id) return;

    let active = true;

    let connectedSocket:
      | Awaited<ReturnType<typeof connectSocket>>
      | null = null;

    const handleNewMessage = (newMessage: GroupMessage) => {
      if (!active || newMessage.group_id !== group.id) return;

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (item) => item.id === newMessage.id
        );

        if (alreadyExists) return previousMessages;

        return [...previousMessages, newMessage];
      });
    };

    const initializeChat = async () => {
      setChatLoading(true);
      setChatError("");

      try {
        // Load existing messages
        const data = await getGroupMessages(group.id);

        if (!active) return;

        setMessages(data.messages || []);

        // Connect to authenticated Socket.IO server
        const socket = await connectSocket();

        if (!active) return;

        connectedSocket = socket;

        // Listen for incoming group messages
        socket.on("new_message", handleNewMessage);

        // Join after server verifies group membership
        socket.emit(
          "join_group",
          group.id,
          (result: {
            success: boolean;
            message?: string;
          }) => {
            if (!active) return;

            if (!result.success) {
              setChatError(
                result.message || "Unable to join group chat."
              );
            } else {
              console.log("Joined group chat:", group.id);
            }
          }
        );
      } catch (error) {
        console.error("Chat initialization error:", error);

        if (active) {
          setChatError(
            error instanceof Error
              ? error.message
              : "Unable to connect to group chat."
          );
        }
      } finally {
        if (active) {
          setChatLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      active = false;

      if (connectedSocket) {
        connectedSocket.off("new_message", handleNewMessage);
      }

      disconnectSocket();
    };
  }, [group?.id]);

  // ========================================
  // LOAD ATTENDANCE
  // ========================================

  useEffect(() => {
    if (!tripId || !group) return;

    loadAttendance();
  }, [tripId, group?.id]);

  const loadAttendance = async () => {
    if (!tripId) return;

    try {
      setAttendanceLoading(true);
      setAttendanceError("");

      const result = await getTripAttendance(tripId);

      setAttendance(result.attendance || []);
    } catch (error) {
      console.error("Attendance loading error:", error);

      setAttendanceError(
        error instanceof Error
          ? error.message
          : "Unable to load attendance."
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ========================================
  // GENERATE QR CODE - CREATOR ONLY
  // ========================================

  const handleGenerateQR = async () => {
    if (!tripId || qrLoading) return;

    if (!isCreator) {
      Alert.alert(
        "Permission Denied",
        "Only the trip creator can generate the QR code."
      );
      return;
    }

    if (group?.trip_status !== "in_progress") {
      Alert.alert(
        "Trip Not Started",
        "Start the trip before generating the check-in QR."
      );
      return;
    }

    try {
      setQrLoading(true);

      const result = await generateCheckinQR(tripId);

      setQrPayload(JSON.stringify(result.qrPayload));
      // console.log("QR TEST DATA:", JSON.stringify(result.qrPayload));//veri
      setQrExpiry(result.expiresAt);

      Alert.alert(
        "QR Generated",
        "Your trip check-in QR code is ready. Ask your group members to scan it."
      );
    } catch (error) {
      console.error("QR generation error:", error);

      Alert.alert(
        "QR Generation Failed",
        error instanceof Error
          ? error.message
          : "Unable to generate QR code."
      );
    } finally {
      setQrLoading(false);
    }
  };

  // ========================================
  // OPEN QR SCANNER - MEMBERS
  // ========================================

  const handleOpenScanner = () => {
    if (!tripId) return;

    if (group?.trip_status !== "in_progress") {
      Alert.alert(
        "Trip Not Started",
        "Check-in becomes available after the creator starts the trip."
      );
      return;
    }

    router.push({
      pathname: "/checkin/qr",
      params: { tripId },
    });
  };

  // ========================================
  // SEND GROUP MESSAGE
  // ========================================

  const handleSendMessage = async () => {
    const trimmedMessage = messageInput.trim();

    if (!trimmedMessage || !group?.id || sending) {
      return;
    }

    if (trimmedMessage.length > 2000) {
      Alert.alert(
        "Message too long",
        "Messages cannot exceed 2000 characters."
      );
      return;
    }

    try {
      setSending(true);
      setChatError("");

      const result = await sendGroupMessage(
        group.id,
        trimmedMessage
      );

      if (result.success && result.message) {
        setMessages((previousMessages) => {
          const alreadyExists = previousMessages.some(
            (item) => item.id === result.message.id
          );

          if (alreadyExists) return previousMessages;

          return [...previousMessages, result.message];
        });

        setMessageInput("");
      }
    } catch (error) {
      console.error("Send message error:", error);

      Alert.alert(
        "Message not sent",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  // ========================================
  // FORMAT TIME
  // ========================================

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" />

        <Text className="mt-4 text-base text-gray-500">
          Loading group...
        </Text>
      </View>
    );
  }

  // ========================================
  // ERROR SCREEN
  // ========================================

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Unable to load group
        </Text>

        <Text className="mt-3 text-center text-base text-red-600">
          {errorMessage}
        </Text>

        <Text className="mt-4 text-center text-sm text-gray-500">
          Trip ID: {tripId || "missing"}
        </Text>
      </View>
    );
  }

  // ========================================
  // GROUP NOT FOUND
  // ========================================

  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900">
          Group not found
        </Text>

        <Text className="mt-2 text-center text-base text-gray-500">
          This trip does not have a group yet.
        </Text>

        <Text className="mt-4 text-center text-sm text-gray-400">
          Trip ID: {tripId || "missing"}
        </Text>
      </View>
    );
  }

  // ========================================
  // MAIN UI
  // ========================================

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        <View className="px-6 pb-4 pt-10">

          {/* HEADER */}
          <Text className="text-3xl font-bold text-gray-900">
            Trip Group
          </Text>

          <Text className="mt-2 text-base text-gray-500">
            Your Yaari travel group
          </Text>

          {/* GROUP INFORMATION */}
          <View className="mt-6">
            <Card>
              <Text className="text-sm font-semibold text-gray-500">
                GROUP
              </Text>

              <Text className="mt-2 text-xl font-bold text-gray-900">
                {members.length}{" "}
                {members.length === 1 ? "Member" : "Members"}
              </Text>

              <Text className="mt-2 text-sm text-gray-500">
                Group created successfully for this trip.
              </Text>

              <View className="mt-3 self-start rounded-full bg-blue-50 px-3 py-2">
                <Text className="text-xs font-bold capitalize text-blue-700">
                  Trip status: {group.trip_status?.replace("_", " ")}
                </Text>
              </View>
            </Card>
          </View>

          {/* TRIP ITINERARY AND VEHICLE DETAILS */}
          {tripDetails ? (
            <View className="mt-5">
              <Card>
                {tripDetails.trip_name ? (
                  <Text className="text-xl font-extrabold text-gray-900">
                    {tripDetails.trip_name}
                  </Text>
                ) : null}

                <Text className="mt-2 text-xs font-bold tracking-wider text-gray-500">
                  COMPLETE ITINERARY
                </Text>

                <View className="mt-4">
                  <Text className="text-xs font-semibold text-gray-400">
                    STARTING POINT
                  </Text>
                  <Text className="mt-1 text-base font-bold text-gray-900">
                    {tripDetails.from_location}
                  </Text>
                </View>

                {tripDetails.destinations &&
                tripDetails.destinations.length > 0 ? (
                  tripDetails.destinations
                    .slice()
                    .sort(
                      (a, b) =>
                        (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
                    )
                    .map((destination, index) => (
                      <View
                        key={
                          destination.id ||
                          `${tripDetails.id}-group-destination-${index}`
                        }
                        className="mt-3 border-l-2 border-blue-400 pl-3"
                      >
                        <Text className="text-xs font-semibold text-gray-400">
                          DESTINATION {index + 1}
                        </Text>
                        <Text className="mt-1 text-base font-bold text-gray-900">
                          {destination.destination_name}
                        </Text>
                        {destination.segment_distance_km !== null &&
                        destination.segment_distance_km !== undefined ? (
                          <Text className="mt-1 text-xs font-medium text-blue-700">
                            {Number(destination.segment_distance_km).toFixed(2)} km from previous stop
                          </Text>
                        ) : null}
                      </View>
                    ))
                ) : (
                  <View className="mt-3">
                    <Text className="text-xs font-semibold text-gray-400">
                      DESTINATION
                    </Text>
                    <Text className="mt-1 text-base font-bold text-gray-900">
                      {tripDetails.to_location}
                    </Text>
                  </View>
                )}

                {tripDetails.total_distance_km !== null &&
                tripDetails.total_distance_km !== undefined ? (
                  <View className="mt-4 border-t border-gray-100 pt-3">
                    <Text className="text-xs font-semibold text-gray-500">
                      TOTAL ROAD DISTANCE
                    </Text>
                    <Text className="mt-1 text-xl font-extrabold text-blue-700">
                      {Number(tripDetails.total_distance_km).toFixed(2)} km
                    </Text>
                  </View>
                ) : null}

                {(tripDetails.travel_type ||
                  tripDetails.vehicle_name ||
                  tripDetails.vehicle_number) ? (
                  <View className="mt-4 flex-row flex-wrap gap-2 border-t border-gray-100 pt-3">
                    {tripDetails.travel_type ? (
                      <View className="rounded-full bg-blue-50 px-3 py-2">
                        <Text className="text-xs font-semibold text-blue-700">
                          {tripDetails.travel_type}
                        </Text>
                      </View>
                    ) : null}
                    {tripDetails.vehicle_name ? (
                      <View className="rounded-full bg-gray-100 px-3 py-2">
                        <Text className="text-xs font-semibold text-gray-700">
                          {tripDetails.vehicle_name}
                        </Text>
                      </View>
                    ) : null}
                    {tripDetails.vehicle_number ? (
                      <View className="rounded-full bg-gray-100 px-3 py-2">
                        <Text className="text-xs font-semibold text-gray-700">
                          {tripDetails.vehicle_number}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            </View>
          ) : null}

          {/* GROUP MEMBERS */}
          <View className="mt-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              Group Members
            </Text>

            {members.map((member) => (
              <View key={member.id} className="mb-4">
                <Card>
                  <View className="flex-row items-center">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                      <Text className="text-xl font-bold text-blue-600">
                        {member.name?.charAt(0).toUpperCase() || "Y"}
                      </Text>
                    </View>

                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-bold text-gray-900">
                        {member.name}
                      </Text>

                      <Text className="mt-1 text-sm font-semibold text-blue-600">
                        {member.role === "admin"
                          ? "Trip Creator • Admin"
                          : "Member"}
                      </Text>

                      {member.job_role ? (
                        <Text className="mt-1 text-sm text-gray-500">
                          {member.job_role}
                        </Text>
                      ) : null}

                      {member.company ? (
                        <Text className="mt-1 text-sm text-gray-500">
                          {member.company}
                        </Text>
                      ) : null}

                      {member.city ? (
                        <Text className="mt-1 text-sm text-gray-500">
                          📍 {member.city}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </View>
            ))}
          </View>

          {/* ================================== */}
          {/* QR + GPS CHECK-IN */}
          {/* ================================== */}

          <View className="mt-6">
            <Text className="mb-4 text-xl font-bold text-gray-900">
              Trip Check-in
            </Text>

            <Card>
              <Text className="text-base font-bold text-gray-900">
                QR + GPS Attendance
              </Text>

              <Text className="mt-2 text-sm text-gray-500">
                Scan the trip creator's QR code to record your
                attendance. GPS verifies that you are within
                100 metres of the pickup point.
              </Text>

              {/* TRIP NOT STARTED */}
              {group.trip_status !== "in_progress" ? (
                <View className="mt-4 rounded-xl bg-yellow-50 p-4">
                  <Text className="text-sm font-semibold text-yellow-800">
                    Check-in is currently unavailable.
                  </Text>

                  <Text className="mt-1 text-sm text-yellow-700">
                    The creator must start the trip before QR
                    check-in becomes available.
                  </Text>
                </View>
              ) : isCreator ? (
                <>
                  {/* CREATOR QR GENERATION */}
                  <Pressable
                    onPress={handleGenerateQR}
                    disabled={qrLoading}
                    className={`mt-5 items-center rounded-xl py-4 ${
                      qrLoading ? "bg-blue-300" : "bg-blue-600"
                    }`}
                  >
                    {qrLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="font-bold text-white">
                        {qrPayload
                          ? "Regenerate QR Code"
                          : "Generate Check-in QR"}
                      </Text>
                    )}
                  </Pressable>

                  {/* QR CODE DISPLAY */}
                  {qrPayload ? (
                    <View className="mt-5 items-center rounded-xl bg-gray-50 p-4">
                      <QRCode
                        value={qrPayload}
                        size={210}
                        backgroundColor="white"
                        color="black"
                      />

                      <Text className="mt-4 text-center text-base font-bold text-gray-900">
                        Trip Check-in QR
                      </Text>

                      <Text className="mt-2 text-center text-sm text-gray-500">
                        Ask your group members to scan this code.
                      </Text>

                      {qrExpiry ? (
                        <Text className="mt-3 text-center text-xs text-gray-500">
                          Expires:{" "}
                          {new Date(qrExpiry).toLocaleString()}
                        </Text>
                      ) : null}

                      <Text className="mt-2 text-center text-xs text-green-700">
                        QR code generated successfully.
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                /* MEMBER SCANNER BUTTON */
                <Pressable
                  onPress={handleOpenScanner}
                  className="mt-5 items-center rounded-xl bg-blue-600 py-4"
                >
                  <Text className="font-bold text-white">
                    Scan QR & Check In
                  </Text>
                </Pressable>
              )}

              {/* ATTENDANCE */}
              <View className="mt-6 border-t border-gray-100 pt-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-bold text-gray-900">
                    Attendance
                  </Text>

                  <Pressable
                    onPress={loadAttendance}
                    disabled={attendanceLoading}
                  >
                    <Text className="font-semibold text-blue-600">
                      {attendanceLoading ? "Loading..." : "Refresh"}
                    </Text>
                  </Pressable>
                </View>

                {attendanceLoading ? (
                  <View className="items-center py-5">
                    <ActivityIndicator />
                    <Text className="mt-2 text-sm text-gray-500">
                      Loading attendance...
                    </Text>
                  </View>
                ) : attendanceError ? (
                  <View className="mt-3 rounded-xl bg-red-50 p-3">
                    <Text className="text-sm text-red-600">
                      {attendanceError}
                    </Text>
                  </View>
                ) : attendance.length === 0 ? (
                  <Text className="mt-3 text-sm text-gray-500">
                    No members have checked in yet.
                  </Text>
                ) : (
                  attendance.map((item) => (
                    <View
                      key={item.id}
                      className="mt-4 flex-row items-center justify-between"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-900">
                          {item.member_name}
                        </Text>

                        <Text className="mt-1 text-xs text-gray-500">
                          {new Date(
                            item.checked_in_at
                          ).toLocaleString()}
                        </Text>

                        <Text className="mt-1 text-xs text-gray-500">
                          {Math.round(item.distance_meters)} metres
                          from pickup
                        </Text>
                      </View>

                      <View className="rounded-full bg-green-50 px-3 py-2">
                        <Text className="text-xs font-bold text-green-700">
                          Checked in
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </Card>
          </View>

          {/* ================================== */}
          {/* GROUP CHAT */}
          {/* ================================== */}

          <View className="mt-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900">
                Group Chat
              </Text>

              <View className="flex-row items-center">
                <View className="mr-2 h-2 w-2 rounded-full bg-green-500" />

                <Text className="text-sm text-gray-500">
                  Live chat
                </Text>
              </View>
            </View>

            <View className="rounded-2xl bg-white p-4">
              {chatLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" />

                  <Text className="mt-3 text-sm text-gray-500">
                    Loading messages...
                  </Text>
                </View>
              ) : (
                <>
                  {chatError ? (
                    <View className="mb-3 rounded-xl bg-red-50 p-3">
                      <Text className="text-sm text-red-600">
                        {chatError}
                      </Text>
                    </View>
                  ) : null}

                  {messages.length === 0 ? (
                    <View className="items-center py-10">
                      <Text className="text-4xl">💬</Text>

                      <Text className="mt-3 text-base font-semibold text-gray-800">
                        Start your group conversation
                      </Text>

                      <Text className="mt-2 text-center text-sm text-gray-500">
                        Send the first message to your travel group.
                      </Text>
                    </View>
                  ) : (
                    messages.map((item) => {
                      const isMyMessage =
                        item.sender_id === currentUserId;

                      return (
                        <View
                          key={item.id}
                          className={`mb-4 flex-row ${
                            isMyMessage
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <View
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              isMyMessage
                                ? "rounded-br-sm bg-blue-600"
                                : "rounded-bl-sm bg-gray-100"
                            }`}
                          >
                            {!isMyMessage ? (
                              <Text className="mb-1 text-xs font-bold text-blue-700">
                                {item.sender_name || "Group Member"}
                              </Text>
                            ) : null}

                            <Text
                              className={`text-base ${
                                isMyMessage
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {item.message}
                            </Text>

                            <Text
                              className={`mt-2 text-right text-xs ${
                                isMyMessage
                                  ? "text-blue-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatTime(item.created_at)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* MESSAGE INPUT */}
      <View className="border-t border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center">
          <TextInput
            className="mr-3 min-h-12 flex-1 rounded-full bg-gray-100 px-5 text-base text-gray-900"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={messageInput}
            onChangeText={setMessageInput}
            multiline
            maxLength={2000}
            editable={!sending && !chatLoading}
          />

          <Pressable
            onPress={handleSendMessage}
            disabled={
              sending ||
              chatLoading ||
              !messageInput.trim()
            }
            className={`h-12 w-12 items-center justify-center rounded-full ${
              sending || chatLoading || !messageInput.trim()
                ? "bg-blue-300"
                : "bg-blue-600"
            }`}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-xl font-bold text-white">
                ➤
              </Text>
            )}
          </Pressable>
        </View>

        <Text className="mt-1 text-right text-xs text-gray-400">
          {messageInput.length}/2000
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
