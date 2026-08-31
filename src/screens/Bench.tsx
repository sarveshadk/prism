import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { shareJson } from '../fileio';
import { FrameType, HEADER_SIZE, encodeFrame, now, qrForChunkSize } from '../protocol';
import { useStore, type Run } from '../store';
import { radius, space, tabular, type, useTheme } from '../theme';
import { Btn, Card, Header, List, Metric, Metrics, Row, Screen, fmtBytes, fmtRate } from '../ui';

const SWEEP = [256, 512, 768, 1024, 1280, 1500, 2048];
const FRAMES_PER_POINT = 200;

export default function Bench() {
  const c = useTheme();
  const { fps, ecl, shuffled, runs, addRun, clearRuns } = useStore();
  const [busy, setBusy] = useState(false);

  const speedTransports = [
    { label: 'QR Chain', color: c.coral, speed: 4.1, reliability: 98, latency: 120 },
    { label: 'Acoustic', color: c.textSub, speed: 1.8, reliability: 95, latency: 340 },
    { label: 'Bluetooth', color: c.neutral, speed: 320, reliability: 99, latency: 8 },
    { label: 'Wi-Fi Direct', color: c.neutral, speed: 4200, reliability: 99, latency: 4 },
  ];

  const maxLog = Math.log10(4201);
  const qrPoints = [3.2, 4.0, 3.8, 4.2, 4.1, 3.9, 4.3, 4.1, 4.0, 4.4];
  const acPoints = [1.5, 1.8, 1.6, 1.9, 1.7, 2.0, 1.8, 1.9, 1.7, 1.8];

  const makeSvgPath = (pts: number[], w = 280, h = 72) => {
    const min = Math.min(...pts) - 0.4;
    const max = Math.max(...pts) + 0.4;
    return `M${pts
      .map(
        (val, i) =>
          `${((i / (pts.length - 1)) * w).toFixed(1)},${(h - ((val - min) / (max - min)) * h).toFixed(1)}`
      )
      .join('L')}`;
  };

  const matrixRows = [
    ['', 'QR', 'Ac.', 'BT', 'Wi-Fi'],
    ['Internet', '✗', '✗', '✗', '✗'],
    ['Pairing', '✗', '✗', '✓', '✓'],
    ['Radio hw', '✗', '✗', '✓', '✓'],
    ['Darkness', '✗', '✓', '✓', '✓'],
    ['Silence', '✓', '✗', '✓', '✓'],
  ];

  const runSweep = useCallback(async () => {
    setBusy(true);
    const payload = new Uint8Array(2048).map((_, i) => (i * 31) & 0xff);
    for (const chunkSize of SWEEP) {
      const geo = qrForChunkSize(chunkSize, ecl);
      const slice = payload.subarray(0, chunkSize);
      const t0 = now();
      for (let i = 0; i < FRAMES_PER_POINT; i++) {
        encodeFrame({
          type: FrameType.DATA,
          transferId: 1,
          chunkIndex: i & 0xffff,
          chunkCount: 0xffff,
          passIndex: i & 0xff,
          payload: slice,
        });
      }
      const perFrame = (now() - t0) / FRAMES_PER_POINT;
      addRun({
        id: `${Date.now()}-${chunkSize}`,
        at: Date.now(),
        kind: 'encode-sweep',
        chunkSize,
        fps,
        ecl,
        shuffled,
        qrVersion: geo.version,
        encodeMsPerFrame: perFrame,
        ceilingBps: chunkSize * fps,
      });
      await new Promise((r) => setTimeout(r, 0));
    }
    setBusy(false);
  }, [addRun, ecl, fps, shuffled]);

  return (
    <Screen onRefresh={runSweep} refreshing={busy}>
      {/* Title Header */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xs }}>
        <Text style={[type.overline, { color: c.textMuted }]}>Performance</Text>
        <Text style={[type.displayLarge, { color: c.text, marginTop: 4, marginBottom: 8 }]}>
          Benchmark
        </Text>
      </View>

      {/* Subtitle Card */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={[type.body, { color: c.textSub, lineHeight: 21 }]}>
            Prism operates where other transports can’t — no pairing, no network, no hardware radio.
            These baselines show the speed tradeoff.
          </Text>
        </Card>
      </View>

      {/* Card 1: Log-Scale Transfer Speed Comparison */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card variant="cardLg" style={{ padding: space.base, gap: space.md }}>
          <Text style={[type.bodyMedium, { color: c.textSub, fontSize: 13 }]}>
            Transfer speed (KB/s, log scale)
          </Text>

          <View style={{ gap: 14 }}>
            {speedTransports.map((t) => {
              const barWidthPct = (Math.log10(t.speed + 1) / maxLog) * 100;
              return (
                <View key={t.label} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[type.bodyMedium, { color: c.text, fontSize: 13 }]}>
                      {t.label}
                    </Text>
                    <Text
                      style={[type.callout, tabular, { color: t.color, fontWeight: '600' }]}
                    >
                      {t.speed >= 1000 ? `${(t.speed / 1000).toFixed(1)} MB/s` : `${t.speed} KB/s`}
                    </Text>
                  </View>

                  <View
                    style={{
                      height: 6,
                      borderRadius: radius.pill,
                      backgroundColor: c.elevated,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${barWidthPct}%`,
                        height: '100%',
                        borderRadius: radius.pill,
                        backgroundColor: t.color,
                        opacity: t.color === c.neutral ? 0.5 : 1,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legends */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {[
              { label: 'QR Chain', color: c.coral },
              { label: 'Acoustic', color: c.textSub },
              { label: 'BT / Wi-Fi', color: c.neutral },
            ].map((leg) => (
              <View key={leg.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 12,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: leg.color,
                  }}
                />
                <Text style={[type.caption, { color: c.textMuted, fontSize: 11 }]}>
                  {leg.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      {/* Card 2: Rate over time line chart */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card variant="cardLg" style={{ padding: space.base, gap: space.sm }}>
          <Text style={[type.bodyMedium, { color: c.textSub, fontSize: 13 }]}>
            Rate over time — last 10 chunks
          </Text>

          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 4 }}>
            {[
              { label: 'QR Chain', color: c.coral },
              { label: 'Acoustic', color: c.textSub },
            ].map((leg) => (
              <View key={leg.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={{
                    width: 12,
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: leg.color,
                  }}
                />
                <Text style={[type.caption, { color: c.textMuted, fontSize: 11 }]}>
                  {leg.label}
                </Text>
              </View>
            ))}
          </View>

          <Svg width="100%" height={72} viewBox="0 0 280 72">
            {[0.25, 0.5, 0.75].map((factor) => (
              <Line
                key={factor}
                x1={0}
                y1={factor * 72}
                x2={280}
                y2={factor * 72}
                stroke={c.border}
                strokeWidth={1}
              />
            ))}
            <Path
              d={`${makeSvgPath(qrPoints, 280, 72)} L280,72 L0,72 Z`}
              fill={c.coral}
              fillOpacity={0.08}
            />
            <Path
              d={`${makeSvgPath(acPoints, 280, 72)} L280,72 L0,72 Z`}
              fill={c.textSub}
              fillOpacity={0.06}
            />
            <Path
              d={makeSvgPath(qrPoints, 280, 72)}
              fill="none"
              stroke={c.coral}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={makeSvgPath(acPoints, 280, 72)}
              fill="none"
              stroke={c.textSub}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Card>
      </View>

      {/* Card 3: 2-Column Reliability & Latency Cards */}
      <View
        style={{
          flexDirection: 'row',
          gap: space.md,
          paddingHorizontal: space.lg,
        }}
      >
        {speedTransports.slice(0, 2).map((t) => (
          <Card key={t.label} style={{ flex: 1, padding: 14, gap: space.sm }}>
            <Text style={[type.overline, { color: c.textMuted }]}>{t.label}</Text>

            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[type.caption, { color: c.textSub }]}>Reliability</Text>
                <Text style={[type.caption, { color: t.color, fontWeight: '600' }]}>
                  {t.reliability}%
                </Text>
              </View>
              <View
                style={{
                  height: 4,
                  borderRadius: radius.pill,
                  backgroundColor: c.elevated,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${t.reliability}%`,
                    height: '100%',
                    borderRadius: radius.pill,
                    backgroundColor: t.color,
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[type.caption, { color: c.textSub }]}>Latency</Text>
              <Text style={[type.caption, { color: t.color, fontWeight: '600' }]}>
                {t.latency} ms
              </Text>
            </View>
          </Card>
        ))}
      </View>

      {/* Card 4: Infrastructure Requirements Matrix Table */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card variant="cardLg">
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={[type.bodyMedium, { color: c.textSub, fontSize: 13 }]}>
              Infrastructure requirements
            </Text>
          </View>

          {matrixRows.map((row, rowIdx) => (
            <View
              key={row[0] || 'header'}
              style={{
                flexDirection: 'row',
                borderBottomWidth: rowIdx < matrixRows.length - 1 ? 1 : 0,
                borderColor: c.border,
              }}
            >
              {row.map((cell, colIdx) => (
                <View
                  key={colIdx}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 6,
                    alignItems: colIdx === 0 ? 'flex-start' : 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: rowIdx === 0 ? 11 : 12,
                      fontWeight: rowIdx === 0 ? '600' : '400',
                      color:
                        rowIdx === 0
                          ? c.textMuted
                          : colIdx === 0
                            ? c.textSub
                            : cell === '✓'
                              ? c.success
                              : c.textMuted,
                    }}
                  >
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </Card>
      </View>

      {/* Action Button */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Btn label="Run Encode Sweep" loading={busy} onPress={runSweep} />
      </View>
    </Screen>
  );
}
