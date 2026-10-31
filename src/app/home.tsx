
import { ScrollView, Text, View, Pressable } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
      ? "Good afternoon"
      : "Good evening";

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-5 pb-10 pt-14">

        {/* HEADER */}
        <View className="mb-7 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-slate-500">
              {greeting} 👋
            </Text>
            <Text className="mt-1 text-3xl font-extrabold text-slate-900">
              Welcome to <Text className="text-blue-600">Yaari.</Text>
            </Text>
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
            <Text className="text-2xl">✈️</Text>
          </View>
        </View>

        {/* HERO SECTION */}
        <View className="overflow-hidden rounded-3xl bg-blue-700 p-6">
          <View className="self-start rounded-full bg-white/15 px-3 py-2">
            <Text className="text-xs font-bold tracking-wider text-white">
              TRAVEL TOGETHER • EXPLORE MORE
            </Text>
          </View>

          <Text className="mt-5 text-3xl font-extrabold leading-10 text-white">
            Your next journey{"\n"}starts with a <Text className="text-sky-200">Yaari!</Text>
          </Text>

          <Text className="mt-3 text-sm leading-6 text-blue-100">
            Discover people travelling your way, share journeys
            and make every trip more memorable.
          </Text>

          <Pressable
            onPress={() => router.push("/(tabs)/explore")}
            className="mt-6 self-start flex-row items-center rounded-xl bg-white px-5 py-3"
          >
            <Text className="font-bold text-blue-700">
              Find your travel buddy
            </Text>
            <Text className="ml-2 text-lg text-blue-700">→</Text>
          </Pressable>

          {/* Decorative circles */}
          <View className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[20px] border-white/10" />
          <View className="absolute -bottom-12 right-20 h-28 w-28 rounded-full bg-sky-400/20" />
        </View>

        {/* SECTION TITLE */}
        <View className="mb-4 mt-9">
          <Text className="text-xl font-extrabold text-slate-900">
            Let's get moving
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            What would you like to do today?
          </Text>
        </View>

        {/* CREATE TRIP CARD */}
        <Pressable
          onPress={() => router.push("/create-trip")}
          className="mb-4 overflow-hidden rounded-3xl bg-white p-5"
          style={{
            elevation: 2,
            shadowColor: "#0f172a",
            shadowOpacity: 0.06,
            shadowRadius: 10,
          }}
        >
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
              <Text className="text-3xl">🧭</Text>
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-lg font-extrabold text-slate-900">
                Create a Trip
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Plan a journey and invite fellow travellers.
              </Text>
            </View>

            <Text className="text-2xl font-bold text-blue-600">→</Text>
          </View>
        </Pressable>

        {/* EXPLORE TRIPS CARD */}
        <Pressable
          onPress={() => router.push("/(tabs)/explore")}
          className="mb-4 overflow-hidden rounded-3xl bg-white p-5"
          style={{
            elevation: 2,
            shadowColor: "#0f172a",
            shadowOpacity: 0.06,
            shadowRadius: 10,
          }}
        >
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <Text className="text-3xl">🌍</Text>
            </View>

            <View className="ml-4 flex-1">
              <Text className="text-lg font-extrabold text-slate-900">
                Explore Trips
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Find journeys and connect with travellers.
              </Text>
            </View>

            <Text className="text-2xl font-bold text-emerald-600">→</Text>
          </View>
        </Pressable>

        {/* MY TRIPS */}
        <Pressable
          onPress={() => router.push("/(tabs)/trips")}
          className="mb-7 flex-row items-center rounded-3xl bg-indigo-50 p-5"
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100">
            <Text className="text-2xl">🎒</Text>
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-base font-extrabold text-indigo-950">
              My Trips
            </Text>
            <Text className="mt-1 text-sm text-indigo-700">
              Your created and joined journeys.
            </Text>
          </View>

          <Text className="text-xl font-bold text-indigo-700">→</Text>
        </Pressable>

        {/* COMMUNITY MESSAGE */}
        <View className="mb-6">
          <Text className="text-xl font-extrabold text-slate-900">
            More than just a journey 💙
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Meet new people, share travel experiences and turn
            ordinary journeys into unforgettable memories.
          </Text>
        </View>

        {/* SAFETY CARD */}
        <View className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Text className="text-2xl">🛡️</Text>
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-lg font-extrabold text-rose-900">
                Travel with confidence
              </Text>
              <Text className="mt-1 text-xs font-semibold text-rose-700">
                YOUR SAFETY MATTERS
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-sm leading-6 text-rose-800">
            YAARI is built around safer, more connected travel.
            Emergency assistance and trusted-contact features
            are part of our safety-focused experience.
          </Text>
        </View>

        {/* FOOTER */}
        <Text className="mt-8 text-center text-xs font-medium text-slate-400">
          Made for journeys, friendships and memories.
        </Text>
        <Text className="mt-1 text-center text-xs font-bold tracking-widest text-blue-500">
          YAARI
        </Text>

      </View>
    </ScrollView>
  );
}
