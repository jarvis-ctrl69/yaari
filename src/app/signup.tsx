import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import Button from "@/components/Button";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");

  const handleContinue = () => {
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
          onChangeText={setName}
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
          onChangeText={setAge}
          keyboardType="number-pad"
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Gender */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Gender
        </Text>

        <TextInput
          placeholder="Male / Female / Other"
          value={gender}
          onChangeText={setGender}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />
      </View>

      {/* Company Email */}
      <View className="mt-5">
        <Text className="mb-2 text-base font-semibold text-gray-900">
          Company Email
        </Text>

        <TextInput
          placeholder="name@company.com"
          value={companyEmail}
          onChangeText={setCompanyEmail}
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
          onChangeText={setPhone}
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
          onChangeText={setAadhaar}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={12}
          className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-base text-gray-900"
        />

        <Text className="mt-2 text-sm leading-5 text-gray-500">
          Your Aadhaar number should be handled securely and should never be
          displayed or logged by the app.
        </Text>
      </View>

      {/* Continue */}
      <View className="mt-8">
        <Button
          title="Continue"
          onPress={handleContinue}
        />
      </View>
    </ScrollView>
  );
}