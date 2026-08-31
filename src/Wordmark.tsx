import React from 'react';
import { Platform, Text, View } from 'react-native';

import { useTheme } from './theme';

const WORDMARK_FONT = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

export function Wordmark({ size = 52 }: { size?: number }) {
  const c = useTheme();

  // Bold, prominent tittle (dot) proportional to font size
  const dotSize = Math.round(size * 0.165);
  // Natural vertical spacing above the dotless-i stem
  const dotTop = -Math.round(size * 0.12);

  const textStyle = {
    fontFamily: WORDMARK_FONT,
    fontSize: size,
    fontWeight: '700' as const,
    color: c.text,
    letterSpacing: -size * 0.025,
    lineHeight: size * 1.0,
  };

  return (
    <View
      style={{
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
      }}
      accessibilityRole="header"
      accessibilityLabel="Prism"
    >
      <Text style={textStyle}>pr</Text>

      <View
        style={{
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={textStyle}>{'ı'}</Text>

        {/* Static bold coral tittle for lowercase "i" */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dotTop,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: c.coral,
          }}
        />
      </View>

      <Text style={textStyle}>sm</Text>
    </View>
  );
}
