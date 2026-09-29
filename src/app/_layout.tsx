import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Stack,
} from "expo-router";
import { useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";

import "../../global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />

      <Stack>
        <Stack.Screen
          name="index"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="signup"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="profile-setup"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="profile"
          options={{ title: "Profile" }}
        />

        <Stack.Screen
          name="edit-profile"
          options={{ title: "Edit Profile" }}
        />
      </Stack>
    </ThemeProvider>
  );
}