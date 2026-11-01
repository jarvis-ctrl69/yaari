
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
import { useLocalSearchParams } from "expo-router";

import Card from "@/components/Card";
import {
  getTripGroup,
  getGroupMessages,
  sendGroupMessage,
  GroupMessage,
} from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { supabase } from "@/lib/supabase";

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
};

export default function GroupScreen() {
  const params = useLocalSearchParams<{
    tripId?: string | string[];
  }>();

  const tripId = Array.isArray(params.tripId)
    ? params.tripId[0]
    : params.tripId;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Chat states
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const scrollViewRef = useRef<ScrollView>(null);

  // Load group and members
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
        if (active) setLoading(false);
      }
    };

    loadGroup();

    return () => {
      active = false;
    };
  }, [tripId]);

  // Load current logged-in user
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

  // Load messages and establish real-time connection
  useEffect(() => {
    if (!group?.id) return;

    let active = true;
    let connectedSocket: Awaited<ReturnType<typeof connectSocket>> | null =
      null;

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

        if (!active) {
          return;
        }

        connectedSocket = socket;

        // Listen for incoming group messages
        socket.on("new_message", handleNewMessage);

        // Join only after server verifies group membership
        socket.emit(
          "join_group",
          group.id,
          (result: { success: boolean; message?: string }) => {
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
        if (active) setChatLoading(false);
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

  // Send a message
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
        // Avoid duplicate messages if Socket.IO already delivered it
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

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            </Card>
          </View>

          {/* MEMBERS */}
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

          {/* GROUP CHAT */}
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
