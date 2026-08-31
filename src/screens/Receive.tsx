import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import { saveAndShare } from '../fileio';
import { Icon } from '../icon';
import {
  FrameType,
  REJECT_REASONS,
  decodeFrame,
  now,
  qrForChunkSize,
  safeFileName,
  utf8Decode,
  type Lock,
  type RejectReason,
} from '../protocol';
import { useStore } from '../store';
import { radius, space, type, useTheme } from '../theme';
import {
  Btn,
  Card,
  Header,
  List,
  Metric,
  Metrics,
  Note,
  Pending,
  ProgressBar,
  Row,
  Screen,
  fmtBytes,
  fmtRate,
} from '../ui';

type Counters = {
  lock: Lock | null;
  mask: Uint8Array | null;
  name: string;
  received: number;
  bytes: number;
  dupes: number;
  symbols: number;
  decodeMs: number;
  pass: number;
  passLoss: number | null;
  goodputBps: number;
  rejects: Partial<Record<RejectReason, number>>;
};

const EMPTY: Counters = {
  lock: null,
  mask: null,
  name: '',
  received: 0,
  bytes: 0,
  dupes: 0,
  symbols: 0,
  decodeMs: 0,
  pass: 0,
  passLoss: null,
  goodputBps: 0,
  rejects: {},
};

const fresh = () => ({
  ...EMPTY,
  rejects: {} as Partial<Record<RejectReason, number>>,
  chunks: new Map<number, Uint8Array>(),
  decodeAcc: 0,
  decodeN: 0,
  passSeen: new Set<number>(),
  sawFullPass: false,
  maxPayload: 0,
  t0: 0,
  lastUi: 0,
});

export default function Receive({ navigation }: any) {
  const c = useTheme();
  const { fps, ecl, shuffled, recvState, patch, addRun } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [ui, setUi] = useState<Counters>(EMPTY);
  const [assembled, setAssembled] = useState<Uint8Array | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [mode, setMode] = useState<'qr' | 'acoustic'>('qr');

  const st = useRef(fresh());

  const sweepY = useSharedValue(0);

  useEffect(() => {
    sweepY.value = withRepeat(
      withTiming(240, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [sweepY]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweepY.value }],
  }));

  const flush = useCallback(() => {
    const s = st.current;
    s.lastUi = now();
    setUi({
      lock: s.lock,
      mask: s.mask ? new Uint8Array(s.mask) : null,
      name: s.name,
      received: s.chunks.size,
      bytes: s.bytes,
      dupes: s.dupes,
      symbols: s.symbols,
      decodeMs: s.decodeN ? s.decodeAcc / s.decodeN : 0,
      pass: s.pass,
      passLoss: s.passLoss,
      goodputBps: s.t0 ? s.bytes / Math.max(0.05, (now() - s.t0) / 1000) : 0,
      rejects: { ...s.rejects },
    });
  }, []);

  const finish = useCallback(() => {
    const s = st.current;
    if (!s.lock) return;
    const total = [...s.chunks.values()].reduce((n, x) => n + x.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (let i = 0; i < s.lock.chunkCount; i++) {
      const chunk = s.chunks.get(i)!;
      out.set(chunk, o);
      o += chunk.length;
    }
    setAssembled(out);
    patch({ recvState: 'complete' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addRun({
      id: `${Date.now()}`,
      at: Date.now(),
      kind: 'receive',
      chunkSize: s.maxPayload,
      fps,
      ecl,
      shuffled,
      qrVersion: qrForChunkSize(s.maxPayload, ecl).version,
      chunkCount: s.lock.chunkCount,
      chunksReceived: s.chunks.size,
      fileBytes: total,
      seconds: (now() - s.t0) / 1000,
      goodputBps: total / Math.max(0.05, (now() - s.t0) / 1000),
      duplicates: s.dupes,
      symbolsSeen: s.symbols,
      meanDecodeMs: s.decodeN ? s.decodeAcc / s.decodeN : 0,
      rejects: { ...s.rejects },
      complete: true,
    });
    flush();
  }, [addRun, ecl, flush, fps, patch, shuffled]);

  const onScan = useCallback(
    ({ data }: { data: string }) => {
      const s = st.current;
      s.symbols++;

      const t = now();
      const res = decodeFrame(data, s.lock);
      s.decodeAcc += now() - t;
      s.decodeN++;

      if (!res.ok) {
        s.rejects[res.reason] = (s.rejects[res.reason] ?? 0) + 1;
        if (now() - s.lastUi > 200) flush();
        return;
      }

      const f = res.frame;
      if (!s.lock) {
        s.lock = { transferId: f.transferId, chunkCount: f.chunkCount };
        s.mask = new Uint8Array(f.chunkCount);
        s.pass = f.passIndex;
        s.t0 = now();
      }
      const lock = s.lock;
      const mask = s.mask!;

      if (f.type === FrameType.META) {
        s.name = safeFileName(utf8Decode(f.payload), '');
        if (now() - s.lastUi > 200) flush();
        return;
      }

      if (f.passIndex !== s.pass) {
        if (s.sawFullPass) s.passLoss = 1 - s.passSeen.size / lock.chunkCount;
        s.sawFullPass = true;
        s.passSeen = new Set();
        s.pass = f.passIndex;
      }
      s.passSeen.add(f.chunkIndex);
      if (f.payload.length > s.maxPayload) s.maxPayload = f.payload.length;

      if (s.chunks.has(f.chunkIndex)) {
        s.dupes++;
      } else {
        s.chunks.set(f.chunkIndex, f.payload.slice());
        mask[f.chunkIndex] = 1;
        s.bytes += f.payload.length;
      }

      if (s.chunks.size === lock.chunkCount) {
        finish();
        return;
      }
      if (now() - s.lastUi > 200) flush();
    },
    [finish, flush]
  );

  const clear = () => {
    st.current = fresh();
    setAssembled(null);
    setSaved('');
    setUi(EMPTY);
  };
  const startFresh = () => {
    clear();
    patch({ recvState: 'receiving' });
  };
  const discard = () => {
    clear();
    patch({ recvState: 'idle' });
  };

  const save = async () => {
    if (!assembled) return;
    setSaving(true);
    try {
      const uri = await saveAndShare(
        ui.name || `prism-${ui.lock?.transferId.toString(16)}.bin`,
        assembled
      );
      setSaved(uri);
    } finally {
      setSaving(false);
    }
  };

  if (!permission) return <Pending />;

  if (!permission.granted)
    return (
      <Screen>
        <List
          header="Camera"
          footer="The camera is the only permission Prism needs. No network access is requested."
        >
          <Row label="Allow camera access" icon="camera" onPress={requestPermission} />
        </List>
      </Screen>
    );

  const scanning = recvState === 'receiving';
  const complete = recvState === 'complete';
  const progress = ui.lock ? ui.received / ui.lock.chunkCount : 0;
  const isDecoding = !!ui.lock && ui.received > 0;

  return (
    <Screen>
      {/* Header */}
      <Header
        title="Receive"
        onBack={() => navigation?.goBack?.() || navigation?.navigate?.('Home')}
        right={
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate?.('Send');
              }}
              hitSlop={8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: c.elevated,
              }}
            >
              <Icon name="file" size={14} color={c.coral} />
              <Text style={[type.footnote, { color: c.coral, fontWeight: '600' }]}>Send</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('qr')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: mode === 'qr' ? c.coral : c.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: mode === 'qr' ? '600' : '400',
                  color: mode === 'qr' ? '#FFFFFF' : c.textSub,
                }}
              >
                QR
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('acoustic')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: mode === 'acoustic' ? c.coral : c.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13 }}>🎙</Text>
            </Pressable>
          </View>
        }
      />

      {/* Main Viewfinder / Acoustic Visual Area */}
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.md }}>
        {mode === 'qr' ? (
          <View
            style={{
              position: 'relative',
              width: 260,
              height: 260,
              borderRadius: 20,
              overflow: 'hidden',
              backgroundColor: '#000000',
            }}
          >
            {/* Live Camera View */}
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanning ? onScan : undefined}
            />

            {/* Figma Reticle Corner Brackets */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {/* Top-Left */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  width: 32,
                  height: 32,
                  borderTopWidth: 2.5,
                  borderLeftWidth: 2.5,
                  borderTopLeftRadius: 16,
                  borderColor: c.coral,
                }}
              />
              {/* Top-Right */}
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderTopWidth: 2.5,
                  borderRightWidth: 2.5,
                  borderTopRightRadius: 16,
                  borderColor: c.coral,
                }}
              />
              {/* Bottom-Left */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  width: 32,
                  height: 32,
                  borderBottomWidth: 2.5,
                  borderLeftWidth: 2.5,
                  borderBottomLeftRadius: 16,
                  borderColor: c.coral,
                }}
              />
              {/* Bottom-Right */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: 32,
                  height: 32,
                  borderBottomWidth: 2.5,
                  borderRightWidth: 2.5,
                  borderBottomRightRadius: 16,
                  borderColor: c.coral,
                }}
              />

              {/* Animated Sweep Line */}
              {scanning && (
                <Animated.View
                  style={[
                    {
                      position: 'absolute',
                      left: 16,
                      right: 16,
                      height: 2,
                      backgroundColor: c.coral,
                      shadowColor: c.coral,
                      shadowOpacity: 0.8,
                      shadowRadius: 8,
                    },
                    sweepStyle,
                  ]}
                />
              )}
            </View>
          </View>
        ) : (
          /* Acoustic Mode View */
          <View style={{ alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="mic" size={36} color={c.coral} />
            </View>
            <Text style={[type.subheadBold, { color: c.coral }]}>Listening · 18–20 kHz</Text>
          </View>
        )}
      </View>

      {/* Receiver Status Card matching Figma */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: isDecoding ? c.coral : c.textMuted,
            }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyMedium, { color: c.text, fontSize: 13 }]}>
              {isDecoding
                ? `Decoding chunk ${ui.received} / ${ui.lock?.chunkCount ?? '?'}`
                : scanning
                  ? 'Waiting for sender…'
                  : 'Ready to scan'}
            </Text>
            <Text style={[type.caption, { color: c.textSub, marginTop: 2 }]}>
              {mode === 'qr'
                ? "Point camera at sender's QR code"
                : 'Place devices 30–60 cm apart'}
            </Text>
          </View>
          {scanning && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,75,62,0.1)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.coral }}>Live</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Primary Action Button */}
      <View style={{ paddingHorizontal: space.lg }}>
        {scanning ? (
          <Btn label="Pause" tone="warm" onPress={() => patch({ recvState: 'idle' })} />
        ) : (
          <Btn
            label={complete ? 'Scan Another' : 'Start Scanning'}
            icon="camera"
            onPress={startFresh}
          />
        )}
      </View>

      {/* Transfer Progress & Chunk Grid */}
      {ui.lock ? (
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          <Card style={{ padding: space.base, gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.footnote, { color: c.textSub }]}>Received progress</Text>
              <Text style={[type.footnote, { color: c.coral, fontWeight: '600' }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <ProgressBar value={progress} done={complete} />
            <Grid mask={ui.mask} chunkCount={ui.lock.chunkCount} />
          </Card>
        </View>
      ) : null}

      {/* Completed State Actions */}
      {complete && assembled && (
        <View style={{ paddingHorizontal: space.lg }}>
          <Btn
            label="Save or Share File"
            haptic="success"
            loading={saving}
            onPress={save}
          />
        </View>
      )}

      {/* Diagnostics */}
      {ui.lock && (
        <Metrics>
          <Metric value={`${ui.dupes}`} label="Duplicates" />
          <Metric
            value={ui.passLoss == null ? '—' : `${(ui.passLoss * 100).toFixed(1)}%`}
            label="Pass Loss"
          />
          <Metric value={fmtRate(ui.goodputBps)} label="Goodput" />
        </Metrics>
      )}
    </Screen>
  );
}

function Grid({ mask, chunkCount }: { mask: Uint8Array | null; chunkCount: number }) {
  const c = useTheme();
  if (!mask || chunkCount === 0) return null;

  const received = mask.reduce((n, v) => n + v, 0);

  // For very large transfers (>500 chunks), show a compact progress summary bar
  // instead of rendering hundreds of individual cells which would hurt performance
  if (chunkCount > 500) {
    const SEGMENTS = 50;
    const perSeg = chunkCount / SEGMENTS;
    return (
      <View style={{ gap: 6, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 1.5 }}>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const segStart = Math.floor(i * perSeg);
            const segEnd = Math.min(Math.floor((i + 1) * perSeg), chunkCount);
            let segReceived = 0;
            for (let j = segStart; j < segEnd; j++) {
              if (mask[j] === 1) segReceived++;
            }
            const fill = segReceived / (segEnd - segStart);
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: fill >= 1
                    ? c.coral
                    : fill > 0
                      ? `rgba(255,75,62,${0.25 + fill * 0.5})`
                      : c.elevated,
                }}
              />
            );
          })}
        </View>
        <Text style={{ fontSize: 10, color: c.textMuted, textAlign: 'center' }}>
          {received} / {chunkCount} chunks received
        </Text>
      </View>
    );
  }

  // For moderate transfers (>120 chunks), use smaller cells with no text labels
  if (chunkCount > 120) {
    const cellSize = chunkCount > 300 ? 6 : 10;
    return (
      <View style={{ gap: 6, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
          {Array.from({ length: chunkCount }).map((_, i) => (
            <View
              key={i}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: cellSize > 6 ? 2 : 1,
                backgroundColor: mask[i] === 1 ? c.coral : c.elevated,
              }}
            />
          ))}
        </View>
        <Text style={{ fontSize: 10, color: c.textMuted, textAlign: 'center' }}>
          {received} / {chunkCount} chunks received
        </Text>
      </View>
    );
  }

  // For small transfers (<=120 chunks), show individual labeled cells
  return (
    <View style={{ gap: 6, marginTop: 4 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: chunkCount }).map((_, i) => {
          const got = mask[i] === 1;
          return (
            <View
              key={i}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                backgroundColor: got ? c.coral : c.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  color: got ? '#FFFFFF' : c.textMuted,
                  fontWeight: '500',
                }}
              >
                {i + 1}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 10, color: c.textMuted, textAlign: 'center' }}>
        {received} / {chunkCount} chunks received
      </Text>
    </View>
  );
}
