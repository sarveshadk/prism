import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Wordmark } from './Wordmark';
import { useTheme } from './theme';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_W * 0.38;


export function Bootloader({ onFinish }: { onFinish: () => void }) {
  const c = useTheme();

  // Wordmark entrance
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.88);

  // Progress bar
  const barOpacity = useSharedValue(0);
  const barProgress = useSharedValue(0);

  // Full-screen fade out
  const screenOpacity = useSharedValue(1);

  const dismiss = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    // Phase 1 (0–400ms): Wordmark fades in and scales to 1
    wordmarkOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    wordmarkScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });

    // Phase 2 (500–1800ms): Progress bar appears and fills
    barOpacity.value = withDelay(
      450,
      withTiming(1, { duration: 200 })
    );
    barProgress.value = withDelay(
      500,
      withTiming(1, {
        duration: 1300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Phase 3 (2000–2400ms): Everything fades out
    screenOpacity.value = withDelay(
      2000,
      withTiming(0, {
        duration: 400,
        easing: Easing.in(Easing.cubic),
      })
    );

    // Guaranteed unmount timer on JS thread
    const timer = setTimeout(() => {
      onFinish();
    }, 2450);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));

  const barContainerStyle = useAnimatedStyle(() => ({
    opacity: barOpacity.value,
  }));

  const barFillStyle = useAnimatedStyle(() => ({
    width: barProgress.value * BAR_WIDTH,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
        },
        screenStyle,
      ]}
    >
      {/* Wordmark */}
      <Animated.View style={wordmarkStyle}>
        <Wordmark size={42} />
      </Animated.View>

      {/* Progress bar */}
      <Animated.View
        style={[
          {
            marginTop: 28,
            width: BAR_WIDTH,
            height: 2,
            borderRadius: 1,
            backgroundColor: c.border,
            overflow: 'hidden',
          },
          barContainerStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 1,
              backgroundColor: c.text,
            },
            barFillStyle,
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}
