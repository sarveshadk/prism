import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { useStore, type Run } from '../store';
import { radius, space, type, useTheme } from '../theme';
import { Card, Metric, Metrics, Screen, ThemeToggle } from '../ui';

/** Format bytes into human-readable string */
function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format timestamp into relative time string */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function Home({ navigation }: any) {
  const c = useTheme();
  const { runs } = useStore();

  // Derive real metrics from the store
  const receives = runs.filter((r) => r.kind === 'receive');
  const sweeps = runs.filter((r) => r.kind === 'encode-sweep');
  const totalBytes = receives.reduce((sum, r) => sum + (r.fileBytes ?? 0), 0);
  const avgSpeed =
    receives.length > 0
      ? receives.reduce((sum, r) => sum + (r.goodputBps ?? 0), 0) / receives.length
      : 0;

  return (
    <Screen>
      {/* Top Welcome Header — generous width and clean padding */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space.lg,
          paddingTop: space.xs,
          paddingBottom: space.xs,
        }}
      >
        <View style={{ flex: 1, paddingRight: space.md }}>
          <Text style={[type.overline, { color: c.textMuted }]}>Good morning</Text>
          <Text
            style={{
              fontFamily: 'System',
              fontWeight: '700',
              fontSize: 22,
              lineHeight: 28,
              letterSpacing: -0.3,
              color: c.text,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            Ready to transfer?
          </Text>
        </View>
        <ThemeToggle />
      </View>

      {/* 2-Column Action Cards */}
      <View
        style={{
          flexDirection: 'row',
          gap: space.md,
          paddingHorizontal: space.lg,
        }}
      >
        {/* Send Action Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Send');
          }}
          style={{ flex: 1 }}
        >
          <Card
            variant="cardLg"
            style={{
              padding: space.base,
              minHeight: 156,
              justifyContent: 'space-between',
            }}
          >
            <Svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <Rect x="2" y="2" width="16" height="16" rx="3" fill={c.coral} />
              <Rect x="5" y="5" width="10" height="10" rx="1.5" fill={c.surface} />
              <Rect x="7" y="7" width="6" height="6" rx="1" fill={c.coral} />

              <Rect x="30" y="2" width="16" height="16" rx="3" fill={c.coral} />
              <Rect x="33" y="5" width="10" height="10" rx="1.5" fill={c.surface} />
              <Rect x="35" y="7" width="6" height="6" rx="1" fill={c.coral} />

              <Rect x="2" y="30" width="16" height="16" rx="3" fill={c.coral} />
              <Rect x="5" y="33" width="10" height="10" rx="1.5" fill={c.surface} />
              <Rect x="7" y="35" width="6" height="6" rx="1" fill={c.coral} />

              <Rect x="30" y="30" width="5" height="5" rx="1" fill={c.coral} opacity="0.9" />
              <Rect x="37" y="30" width="5" height="5" rx="1" fill={c.coral} opacity="0.5" />
              <Rect x="30" y="37" width="5" height="5" rx="1" fill={c.coral} opacity="0.5" />
              <Rect x="37" y="37" width="5" height="5" rx="1" fill={c.coral} opacity="0.9" />
              <Rect x="22" y="22" width="4" height="4" rx="1" fill={c.coral} opacity="0.4" />
            </Svg>

            <View>
              <Text style={[type.subheadBold, { color: c.text, fontSize: 16 }]}>Send</Text>
              <Text style={[type.caption, { color: c.textSub, marginTop: 2 }]}>QR · Acoustic</Text>
            </View>
          </Card>
        </Pressable>

        {/* Receive Action Card */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Receive');
          }}
          style={{ flex: 1 }}
        >
          <Card
            variant="cardLg"
            style={{
              padding: space.base,
              minHeight: 156,
              justifyContent: 'space-between',
            }}
          >
            <Svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <Path d="M4 14V6a2 2 0 012-2h8" stroke={c.coral} strokeWidth="3" strokeLinecap="round" />
              <Path d="M44 14V6a2 2 0 00-2-2h-8" stroke={c.coral} strokeWidth="3" strokeLinecap="round" />
              <Path d="M4 34v8a2 2 0 002 2h8" stroke={c.coral} strokeWidth="3" strokeLinecap="round" />
              <Path d="M44 34v8a2 2 0 01-2 2h-8" stroke={c.coral} strokeWidth="3" strokeLinecap="round" />
              <Circle cx="24" cy="24" r="5" stroke={c.coral} strokeWidth="1.75" opacity="0.45" />
              <Circle cx="24" cy="24" r="1.5" fill={c.coral} />
              <Line x1="10" y1="24" x2="38" y2="24" stroke={c.coral} strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
            </Svg>

            <View>
              <Text style={[type.subheadBold, { color: c.text, fontSize: 16 }]}>Receive</Text>
              <Text style={[type.caption, { color: c.textSub, marginTop: 2 }]}>Scan · Listen</Text>
            </View>
          </Card>
        </Pressable>
      </View>

      {/* 3-Column Metrics — bound to real data */}
      <Metrics>
        <Metric value={totalBytes > 0 ? fmtBytes(totalBytes) : '0 B'} label="Total Sent" />
        <Metric value={`${runs.length}`} label="Transfers" />
        <Metric
          value={avgSpeed > 0 ? `${(avgSpeed / 1024).toFixed(1)} KB/s` : '—'}
          label="Avg Speed"
        />
      </Metrics>

      {/* Recent Transfers Section — real data from store.runs */}
      <View style={{ paddingHorizontal: space.lg, marginTop: space.xs }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: space.sm,
          }}
        >
          <Text style={[type.subheadBold, { color: c.text }]}>Recent Transfers</Text>
          {runs.length > 0 && (
            <Pressable
              onPress={() => navigation.navigate('Bench')}
              hitSlop={8}
            >
              <Text style={[type.footnote, { color: c.coral, fontWeight: '500' }]}>View all</Text>
            </Pressable>
          )}
        </View>

        {runs.length === 0 ? (
          <Card style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
            <Text style={[type.body, { color: c.textMuted, textAlign: 'center' }]}>
              No transfers yet.{'\n'}Send or receive a file to see your history here.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: space.sm }}>
            {runs.slice(0, 6).map((run) => (
              <Card
                key={run.id}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                {/* Status Indicator Icon */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: c.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    {run.complete !== false ? (
                      <Polyline
                        points="20 6 9 17 4 12"
                        stroke={c.success}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : (
                      <>
                        <Circle cx="12" cy="12" r="10" stroke={c.warning} strokeWidth="2" />
                        <Line x1="12" y1="8" x2="12" y2="12" stroke={c.warning} strokeWidth="2" />
                        <Line x1="12" y1="16" x2="12.01" y2="16" stroke={c.warning} strokeWidth="2" />
                      </>
                    )}
                  </Svg>
                </View>

                {/* Run Info */}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[type.bodyMedium, { color: c.text, fontSize: 13 }]}
                    numberOfLines={1}
                  >
                    {run.kind === 'receive'
                      ? `Received · ${fmtBytes(run.fileBytes ?? 0)}`
                      : `Encode Sweep · ${run.chunkSize} B`}
                  </Text>
                  <Text style={[type.caption, { color: c.textSub, marginTop: 2 }]}>
                    {run.kind === 'receive'
                      ? `${run.chunksReceived ?? 0}/${run.chunkCount ?? 0} chunks · QR v${run.qrVersion}`
                      : `QR v${run.qrVersion} · EC ${run.ecl} · ${run.fps} fps`}
                  </Text>
                </View>

                {/* Timestamp */}
                <Text style={[type.caption, { color: c.textMuted, fontSize: 10 }]}>
                  {timeAgo(run.at)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}
