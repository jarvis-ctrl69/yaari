
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  YaariNotification,
} from "@/lib/api";

function getNotificationIcon(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("request")) {
    return { icon: "👤", background: "bg-blue-50" };
  }

  if (normalized.includes("accept")) {
    return { icon: "✓", background: "bg-green-50" };
  }

  if (normalized.includes("reject")) {
    return { icon: "✕", background: "bg-red-50" };
  }

  if (normalized.includes("group")) {
    return { icon: "👥", background: "bg-purple-50" };
  }

  return { icon: "🔔", background: "bg-gray-100" };
}

function formatNotificationTime(date: string) {
  const notificationDate = new Date(date);
  const now = new Date();

  if (Number.isNaN(notificationDate.getTime())) {
    return "";
  }

  const difference = now.getTime() - notificationDate.getTime();
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return notificationDate.toLocaleDateString();
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<
    YaariNotification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const loadNotifications = useCallback(async () => {
    try {
      setErrorMessage("");

      const result = await getNotifications();

      setNotifications(result.notifications || []);
    } catch (error) {
      console.error("Notifications loading error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (
    notification: YaariNotification
  ) => {
    if (notification.is_read || updatingId) return;

    try {
      setUpdatingId(notification.id);

      await markNotificationAsRead(notification.id);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error
          ? error.message
          : "Could not update notification."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    try {
      setMarkingAll(true);

      await markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (error) {
      Alert.alert(
        "Update failed",
        error instanceof Error
          ? error.message
          : "Could not update notifications."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const renderNotification = ({
    item,
  }: {
    item: YaariNotification;
  }) => {
    const iconData = getNotificationIcon(item.type);

    return (
      <Pressable
        onPress={() => handleMarkAsRead(item)}
        disabled={item.is_read || updatingId === item.id}
        className={`flex-row items-start px-4 py-5 ${
          item.is_read ? "bg-white" : "bg-blue-50/40"
        }`}
      >
        {/* NOTIFICATION ICON */}
        <View
          className={`h-12 w-12 items-center justify-center rounded-2xl ${iconData.background}`}
        >
          <Text className="text-xl font-bold text-gray-800">
            {iconData.icon}
          </Text>
        </View>

        {/* NOTIFICATION DETAILS */}
        <View className="ml-4 flex-1">
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-base font-bold text-gray-900">
              {item.title}
            </Text>

            {!item.is_read ? (
              <View className="ml-2 rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  New
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-1 text-sm leading-5 text-gray-600">
            {item.message}
          </Text>

          <Text className="mt-2 text-xs text-gray-400">
            {formatNotificationTime(item.created_at)}
          </Text>

          {updatingId === item.id ? (
            <ActivityIndicator
              size="small"
              className="mt-2 self-start"
            />
          ) : null}
        </View>

        {!item.is_read ? (
          <View className="ml-2 mt-2 h-2 w-2 rounded-full bg-blue-600" />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="px-6 pb-5 pt-12">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-gray-900">
              Notifications
            </Text>

            <Text className="mt-1 text-sm text-gray-500">
              Stay updated with your travel activities
            </Text>
          </View>

          {unreadCount > 0 ? (
            <View className="rounded-full bg-green-100 px-3 py-2">
              <Text className="font-bold text-green-700">
                {unreadCount} New
              </Text>
            </View>
          ) : null}
        </View>

        {/* MARK ALL AS READ */}
        <View className="mt-5 flex-row justify-end">
          <Pressable
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAll}
          >
            <Text
              className={`text-sm font-semibold ${
                unreadCount > 0
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              {markingAll ? "Updating..." : "Mark all as read"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* NOTIFICATION LIST */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />

          <Text className="mt-3 text-sm text-gray-500">
            Loading notifications...
          </Text>
        </View>
      ) : errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-red-600">
            {errorMessage}
          </Text>

          <Pressable
            onPress={loadNotifications}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-3"
          >
            <Text className="font-semibold text-white">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl">🔔</Text>

          <Text className="mt-4 text-xl font-bold text-gray-900">
            You're all caught up!
          </Text>

          <Text className="mt-2 text-center text-sm text-gray-500">
            Your trip updates and activity notifications will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 30 }}
          ItemSeparatorComponent={() => (
            <View className="mx-4 h-px bg-gray-100" />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      )}
    </View>
  );
}
