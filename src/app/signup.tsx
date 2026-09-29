import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
} from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [genderDropdownOpen, setGenderDropdownOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedName = name.trim();
    const trimmedAge = age.trim();
    const trimmedGender = gender.trim();
    const trimmedEmail = companyEmail.trim();
    const trimmedPhone = phone.trim();
    const trimmedAadhaar = aadhaar.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    const ageNumber = Number(trimmedAge);

    if (
      !trimmedAge ||
      Number.isNaN(ageNumber) ||
      ageNumber < 18
    ) {
      setError("You must be at least 18 years old.");
      return;
    }

    if (!trimmedGender) {
      setError("Please select your gender.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("Please enter a valid company email.");
      return;
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!/^\d{12}$/.test(trimmedAadhaar)) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (trimmedPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    const { data, error: signupError } =
      await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,

        // Store only non-sensitive profile information.
        // Aadhaar is intentionally NOT stored here.
        options: {
          data: {
            name: trimmedName,
            age: ageNumber,
            gender: trimmedGender,
            phone: trimmedPhone,
          },
        },
      });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    console.log("Account created:", data.user?.id);

    router.push("/verify-email");
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="px-6 pb-10 pt-16"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-3xl font-bold text-gray-900">
        Create Account
      </Text>

      <Text className="mt-3 text-base leading-6 text-gray-600">
        Tell us a little about yourself to create your Yaari account.
      </Text>

      {/* Name */}
      <View className="mt-8">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Name
        </Text>

        <TextInput
          placeholder="Enter your full name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError("");
          }}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Age */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Age
        </Text>

        <TextInput
          placeholder="Enter your age"
          value={age}
          onChangeText={(text) => {
            setAge(text);
            setError("");
          }}
          keyboardType="number-pad"
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Gender */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Gender
        </Text>

        <Pressable
          onPress={() => setGenderDropdownOpen(true)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4"
        >
          <Text
            className={
              gender
                ? "text-base text-gray-900"
                : "text-base text-gray-400"
            }
          >
            {gender || "Select your gender"}
          </Text>
        </Pressable>
      </View>

      {/* Company Email */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Company Email
        </Text>

        <TextInput
          placeholder="name@company.com"
          value={companyEmail}
          onChangeText={(text) => {
            setCompanyEmail(text);
            setError("");
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Phone */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Phone Number
        </Text>

        <TextInput
          placeholder="Enter your phone number"
          value={phone}
          onChangeText={(text) => {
            setPhone(text);
            setError("");
          }}
          keyboardType="phone-pad"
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Aadhaar */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Aadhaar Number
        </Text>

        <TextInput
          placeholder="Enter your Aadhaar number"
          value={aadhaar}
          onChangeText={(text) => {
            setAadhaar(text);
            setError("");
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={12}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />

        <Text className="mt-2 text-sm leading-5 text-gray-500">
          Your Aadhaar number should be handled securely and
          should never be displayed or logged by the app.
        </Text>
      </View>

      {/* Password */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Password
        </Text>

        <TextInput
          placeholder="Create a password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError("");
          }}
          secureTextEntry
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Confirm Password */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Confirm Password
        </Text>

        <TextInput
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />

        <Text className="mt-2 text-sm leading-5 text-gray-500">
          Password must contain at least 8 characters.
        </Text>
      </View>

      {error ? (
        <Text className="mt-4 text-center text-sm font-semibold text-red-600">
          {error}
        </Text>
      ) : null}

      <View className="mt-8">
        <Button
          title={loading ? "Creating Account..." : "Continue"}
          onPress={handleContinue}
        />
      </View>

      <Modal
        visible={genderDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setGenderDropdownOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 px-6"
          onPress={() => setGenderDropdownOpen(false)}
        >
          <Pressable
            className="w-full rounded-2xl bg-white p-5"
            onPress={() => {}}
          >
            <Text className="mb-4 text-xl font-bold text-gray-900">
              Select Gender
            </Text>

            <Pressable
              onPress={() => {
                setGender("Male");
                setGenderDropdownOpen(false);
                setError("");
              }}
              className="border-b border-gray-100 py-4"
            >
              <Text className="text-base text-gray-900">Male</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setGender("Female");
                setGenderDropdownOpen(false);
                setError("");
              }}
              className="border-b border-gray-100 py-4"
            >
              <Text className="text-base text-gray-900">Female</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setGender("Other");
                setGenderDropdownOpen(false);
                setError("");
              }}
              className="py-4"
            >
              <Text className="text-base text-gray-900">Other</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}