import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { Icon } from '../icon';
import { useStore } from '../store';
import { radius, space, type, useTheme } from '../theme';
import { Card, Header, List, Row, Screen, StepperRow, ThemeToggle, ToggleRow } from '../ui';

export default function Settings({ navigation }: any) {
  const c = useTheme();
  const { themePref, fps, channel, patch, clearRuns, runs } = useStore();
  const isDark = themePref === 'Dark';

  const [encrypt, setEncrypt] = useState(true);
  const [verify, setVerify] = useState(true);

  const handleClearHistory = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear Transfer History',
      'Are you sure you want to delete all transfer logs and benchmarks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearRuns();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <Screen>
      {/* Title Header */}
      <Header
        title="Settings"
        showToggle
      />

      {/* Group: Appearance */}
      <List header="Appearance">
        <Row
          label="Dark Mode"
          detail={isDark ? 'Currently using dark theme' : 'Currently using light theme'}
          accessory={
            <ThemeToggle
              dark={isDark}
              onChange={(v) => patch({ themePref: v ? 'Dark' : 'Light' })}
            />
          }
        />
      </List>

      {/* Group: Transfer */}
      <List header="Transfer">
        <Row
          label="Default Channel"
          detail="Used when starting a new transfer"
          value={channel === 'QR' ? 'QR Chain' : 'Acoustic'}
          onPress={() => {
            const next = channel === 'QR' ? 'Audio' : 'QR';
            patch({ channel: next });
          }}
        />
        <StepperRow
          label="QR Frame Rate"
          value={fps}
          step={1}
          min={1}
          max={30}
          suffix=" fps"
          onChange={(v) => patch({ fps: v })}
        />
        <Row
          label="Acoustic Frequency"
          detail="Range tunable for environment noise"
          value="18 kHz"
        />
      </List>

      {/* Group: Security */}
      <List header="Security">
        <ToggleRow
          label="Encrypt Transfers"
          detail="AES-256-GCM with per-session key QR"
          value={encrypt}
          onChange={setEncrypt}
        />
        <ToggleRow
          label="Verify Chunks"
          detail="CRC-32 check on every received chunk"
          value={verify}
          onChange={setVerify}
        />
      </List>

      {/* Group: About */}
      <List header="About">
        <Row label="Version" value="0.9.2 (build 114)" />
        <Row
          label="Open Source"
          detail="github.com/prism-app"
          icon="external"
          onPress={() => Linking.openURL('https://github.com')}
        />
        <Row label="Privacy Policy" icon="shield" />
      </List>

      {/* Danger Zone: Clear History */}
      <View style={{ paddingHorizontal: space.lg, marginTop: space.xs }}>
        <Pressable
          onPress={handleClearHistory}
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: radius.card,
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <Text style={[type.bodyMedium, { color: c.error, fontWeight: '600' }]}>
            Clear Transfer History ({runs.length} runs)
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
