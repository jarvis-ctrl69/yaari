import { View } from "react-native";

type CardProps = {
  children: React.ReactNode;
};

export default function Card({ children }: CardProps) {
  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {children}
    </View>
  );
}