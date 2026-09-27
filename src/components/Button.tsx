import { Pressable, Text } from "react-native";

type ButtonProps = {
  title: string;
  onPress: () => void;
};

export default function Button({ title, onPress }: ButtonProps) {
  return (
    <Pressable
      onPress={() => {
        console.log("BUTTON PRESSED");
        onPress();
      }}
      className="items-center rounded-xl bg-blue-600 px-6 py-4 active:bg-blue-700"
    >
      <Text className="text-base font-semibold text-white">
        {title}
      </Text>
    </Pressable>
  );
}