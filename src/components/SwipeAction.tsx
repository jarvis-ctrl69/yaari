
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Text,
  View,
} from "react-native";

type SwipeActionProps = {
  title: string;
  onComplete: () => void;
  disabled?: boolean;
  color?: string;
};

export default function SwipeAction({
  title,
  onComplete,
  disabled = false,
  color = "#2563EB",
}: SwipeActionProps) {
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const completed = useRef(false);

  const thumbSize = 52;
  const maxDistance = Math.max(0, width - thumbSize - 8);

  const reset = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 7,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabled && gesture.dx > 5,

        onPanResponderMove: (_, gesture) => {
          const distance = Math.max(
            0,
            Math.min(maxDistance, gesture.dx)
          );

          translateX.setValue(distance);
        },

        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dx >= maxDistance * 0.7 &&
            !completed.current &&
            !disabled
          ) {
            completed.current = true;

            Animated.timing(translateX, {
              toValue: maxDistance,
              duration: 120,
              useNativeDriver: true,
            }).start(() => {
              onComplete();
              completed.current = false;
              reset();
            });
          } else {
            reset();
          }
        },

        onPanResponderTerminate: reset,
      }),
    [disabled, maxDistance, onComplete, translateX]
  );

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      className="mt-4 h-16 justify-center overflow-hidden rounded-full"
      style={{ backgroundColor: disabled ? "#9CA3AF" : color }}
    >
      <Text
        className="absolute w-full text-center text-sm font-bold text-white"
        pointerEvents="none"
      >
        {title}
      </Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          width: thumbSize,
          height: thumbSize,
          marginLeft: 4,
          borderRadius: 30,
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX }],
        }}
      >
        <Text className="text-xl font-bold" style={{ color }}>
          →
        </Text>
      </Animated.View>
    </View>
  );
}
