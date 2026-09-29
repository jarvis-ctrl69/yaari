import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your company email.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setLoading(true);

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.replace("/");
  };

  return (
    <View className="flex-1 bg-gray-50 px-6 pt-16">
      <Text className="text-3xl font-bold text-gray-900">
        Welcome Back
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Login with your company email to continue to Yaari.
      </Text>

      {/* Company Email */}
      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Company Email
        </Text>

        <TextInput
          placeholder="name@company.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Password */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Password
        </Text>

        <TextInput
          placeholder="Enter your password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          secureTextEntry
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Error */}
      {error ? (
        <Text className="mt-3 text-sm font-semibold text-red-600">
          {error}
        </Text>
      ) : null}

      {/* Login */}
      <View className="mt-8">
        <Button
          title={loading ? "Logging in..." : "Login"}
          onPress={handleLogin}
        />
      </View>

      {/* Forgot Password */}
      <Text
        className="mt-5 text-center text-sm font-semibold text-blue-600"
        onPress={() => router.push("/forgot-password")}
      >
        Forgot Password?
      </Text>

      {/* Signup */}
      <View className="mt-8">
        <Text
          className="text-center text-base text-gray-600"
          onPress={() => router.push("/signup")}
        >
          Don't have an account?{" "}
          <Text className="font-semibold text-blue-600">
            Create Account
          </Text>
        </Text>
      </View>
    </View>
  );
}