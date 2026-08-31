import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import { pickFile, type PickedFile } from '../fileio';
import { Icon } from '../icon';
import {
  DENSE_QR_VERSION,
  FrameType,
  HEADER_SIZE,
  MAX_CHUNKS,
  encodeFrame,
  encodeName,
  newTransferId,
  now,
  qrForChunkSize,
  sendOrder,
  splitChunks,
  type Ecl,
} from '../protocol';
import { useStore } from '../store';
import { radius, space, tabular, type, useTheme } from '../theme';
import {
  Btn,
  Card,
  Header,
  List,
  Metric,
  Metrics,
  Note,
  ProgressBar,
  Row,
  Screen,
  Seg,
  StepperRow,
  ToggleRow,
  fmtBytes,
  fmtRate,
} from '../ui';

const ECLS = ['L', 'M', 'Q', 'H'] as const;

export default function Send({ navigation }: any) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const { chunkSize, fps, ecl, shuffled, channel, sendState, patch } = useStore();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [picking, setPicking] = useState(false);
  const [transferId, setTransferId] = useState(0);
  const [frame, setFrame] = useState('');
  const [stats, setStats] = useState({ sent: 0, pass: 0, encodeMs: 0, wireBps: 0, currentChunk: 0 });
  const [selectedChannel, setSelectedChannel] = useState<'qr' | 'acoustic'>('qr');
  const [showParams, setShowParams] = useState(false);

  const cur = useRef({
    order: [] as number[],
    pos: 0,
    pass: 0,
    sent: 0,
    wire: 0,
    t0: 0,
    enc: 0,
    metaSent: false,
  });

  const sending = sendState === 'sending';
  const chunks = useMemo(
    () => (file ? splitChunks(file.bytes, chunkSize) : []),
    [file, chunkSize]
  );
  const nameBytes = useMemo(() => encodeName(file?.name ?? ''), [file]);
  const geo = qrForChunkSize(chunkSize, ecl);
  const tooMany = chunks.length > MAX_CHUNKS;
  const canStart = !!file && !tooMany && !geo.overflow;
  const qrSize = Math.min(width - 80, 200);

  useEffect(() => {
    if (!sending || !chunks.length) return;
    const tick = () => {
      const st = cur.current;
      if (st.pos >= st.order.length) {
        st.pass = (st.pass + 1) & 0xff;
        st.order = sendOrder(chunks.length, transferId, st.pass, shuffled);
        st.pos = 0;
        st.metaSent = false;
      }

      const meta = !st.metaSent && nameBytes.length > 0;
      if (meta) st.metaSent = true;
      const idx = meta ? 0 : st.order[st.pos++];
      const payload = meta ? nameBytes : chunks[idx];

      const t = now();
      const text = encodeFrame({
        type: meta ? FrameType.META : FrameType.DATA,
        transferId,
        chunkIndex: idx,
        chunkCount: chunks.length,
        passIndex: st.pass,
        payload,
      });
      st.enc = st.enc ? st.enc * 0.9 + (now() - t) * 0.1 : now() - t;
      st.sent++;
      st.wire += HEADER_SIZE + payload.length;
      setFrame(text);
      setStats({
        sent: st.sent,
        pass: st.pass,
        encodeMs: st.enc,
        wireBps: st.wire / Math.max(0.05, (now() - st.t0) / 1000),
        currentChunk: idx + 1,
      });
    };
    tick();
    const h = setInterval(tick, Math.max(16, 1000 / fps));
    return () => clearInterval(h);
  }, [sending, chunks, nameBytes, fps, shuffled, transferId]);

  const start = () => {
    if (!canStart) return;
    const id = newTransferId();
    setTransferId(id);
    cur.current = {
      order: sendOrder(chunks.length, id, 0, shuffled),
      pos: 0,
      pass: 0,
      sent: 0,
      wire: 0,
      t0: now(),
      enc: 0,
      metaSent: false,
    };
    setStats({ sent: 0, pass: 0, encodeMs: 0, wireBps: 0, currentChunk: 1 });
    patch({ sendState: 'sending' });
  };

  const stop = () => {
    patch({ sendState: 'idle' });
    setFrame('');
  };

  const choose = async () => {
    setPicking(true);
    try {
      const f = await pickFile();
      if (f) setFile(f);
    } finally {
      setPicking(false);
    }
  };

  const progress = chunks.length > 0 ? stats.currentChunk / chunks.length : 0;

  return (
    <Screen>
      {/* Header */}
      <Header
        title="Send"
        onBack={() => navigation?.goBack?.() || navigation?.navigate?.('Home')}
        right={
          <Pressable
            onPress={() => navigation?.navigate?.('Bench')}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <Line x1="18" y1="20" x2="18" y2="10" stroke={c.coral} strokeWidth="2" strokeLinecap="round" />
              <Line x1="12" y1="20" x2="12" y2="4" stroke={c.coral} strokeWidth="2" strokeLinecap="round" />
              <Line x1="6" y1="20" x2="6" y2="14" stroke={c.coral} strokeWidth="2" strokeLinecap="round" />
              <Line x1="2" y1="20" x2="22" y2="20" stroke={c.coral} strokeWidth="2" strokeLinecap="round" />
            </Svg>
          </Pressable>
        }
      />

      {/* Segment switcher */}
      <Seg
        options={[
          { id: 'qr', label: 'QR Chain' },
          { id: 'acoustic', label: 'Acoustic' },
        ]}
        value={selectedChannel}
        onChange={(v) => setSelectedChannel(v)}
      />

      {/* Main Transmission Card */}
      <View style={{ paddingHorizontal: space.lg }}>
        <Card variant="cardLg">
          {/* Visual Display: QR or Acoustic */}
          <View
            style={{
              paddingTop: 24,
              paddingBottom: 20,
              paddingHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.md,
            }}
          >
            {selectedChannel === 'qr' ? (
              <>
                <View
                  style={{
                    padding: 12,
                    backgroundColor: '#FFFFFF',
                    borderRadius: radius.card,
                    shadowColor: '#000000',
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  }}
                >
                  {sending && frame ? (
                    <QRCode value={frame} size={qrSize} ecl={ecl} quietZone={0} />
                  ) : (
                    <Svg width={qrSize} height={qrSize} viewBox="0 0 160 160" fill="none">
                      <Rect x="10" y="10" width="40" height="40" rx="6" fill={c.coral} />
                      <Rect x="20" y="20" width="20" height="20" rx="3" fill="#FFFFFF" />
                      <Rect x="25" y="25" width="10" height="10" rx="1.5" fill={c.coral} />

                      <Rect x="110" y="10" width="40" height="40" rx="6" fill={c.coral} />
                      <Rect x="120" y="20" width="20" height="20" rx="3" fill="#FFFFFF" />
                      <Rect x="125" y="25" width="10" height="10" rx="1.5" fill={c.coral} />

                      <Rect x="10" y="110" width="40" height="40" rx="6" fill={c.coral} />
                      <Rect x="20" y="120" width="20" height="20" rx="3" fill="#FFFFFF" />
                      <Rect x="25" y="125" width="10" height="10" rx="1.5" fill={c.coral} />

                      <Rect x="70" y="70" width="20" height="20" rx="4" fill={c.coral} opacity={0.6} />
                      <Rect x="100" y="70" width="15" height="15" rx="3" fill={c.coral} opacity={0.8} />
                      <Rect x="70" y="100" width="15" height="15" rx="3" fill={c.coral} opacity={0.8} />
                      <Rect x="110" y="110" width="25" height="25" rx="4" fill={c.coral} opacity={0.9} />
                    </Svg>
                  )}
                </View>

                <View style={{ alignItems: 'center' }}>
                  <Text style={[type.overline, { color: c.coral }]}>
                    {sending
                      ? `CHUNK ${stats.currentChunk} / ${chunks.length}`
                      : file
                        ? `${chunks.length} CHUNKS READY`
                        : 'NO FILE SELECTED'}
                  </Text>
                  <Text style={[type.caption, { color: c.textMuted, marginTop: 2 }]}>
                    {sending ? `Hold steady · ${fps} fps` : 'Choose a file below to begin'}
                  </Text>
                </View>
              </>
            ) : (
              /* Acoustic mode */
              <>
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: c.elevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <Polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={c.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" stroke={c.coral} strokeWidth="2" strokeLinecap="round" />
                  </Svg>
                </View>
                <Text style={[type.subheadBold, { color: c.coral }]}>Broadcasting at 18 kHz</Text>
              </>
            )}
          </View>

          {/* File Picker & Info */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderColor: c.border,
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: c.elevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="file" size={18} color={c.coral} />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.bodyMedium, { color: c.text }]} numberOfLines={1}>
                {file ? file.name : 'Choose a file…'}
              </Text>
              <Text style={[type.caption, { color: c.textSub, marginTop: 2 }]}>
                {file ? `${fmtBytes(file.bytes.length)} · ${chunks.length} chunks` : 'Tap Change to browse'}
              </Text>
            </View>

            <Pressable
              onPress={choose}
              disabled={picking}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: c.elevated,
              }}
            >
              {picking ? (
                <ActivityIndicator size="small" color={c.coral} />
              ) : (
                <Text style={[type.footnote, { color: c.textSub }]}>Change</Text>
              )}
            </Pressable>
          </View>

          {/* Transfer Progress Bar */}
          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 16,
              borderTopWidth: 1,
              borderColor: c.border,
              gap: 6,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.footnote, { color: c.textSub }]}>Transfer progress</Text>
              <Text style={[type.footnote, { color: c.coral, fontWeight: '600' }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>

            <ProgressBar value={progress} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
              <Text style={[type.caption, { color: c.textMuted }]}>
                {sending
                  ? `Chunk ${stats.currentChunk} of ${chunks.length}`
                  : `${chunks.length} chunks`}
              </Text>
              <Text style={[type.caption, { color: c.textMuted }]}>
                {sending ? fmtRate(stats.wireBps) : '0 KB/s'}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Receiver Locked Status Card */}
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
              backgroundColor: sending ? c.success : c.textMuted,
            }}
          />
          <Text style={[type.footnote, { color: c.textSub }]}>
            {sending ? 'Receiver locked ·' : 'Status ·'}
          </Text>
          <Text style={[type.footnote, { color: c.text, fontWeight: '600' }]}>
            {sending ? `Transfer 0x${transferId.toString(16)}` : 'Standby'}
          </Text>
          {sending && (
            <View
              style={{
                marginLeft: 'auto',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(46,204,113,0.12)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: c.success }}>Live</Text>
            </View>
          )}
        </Card>
      </View>

      {/* Primary Action Button */}
      <View style={{ paddingHorizontal: space.lg }}>
        {sending ? (
          <Btn label="Pause Transfer" tone="warm" icon="pause" onPress={stop} />
        ) : (
          <Btn
            label="Start Carousel"
            icon="play"
            onPress={start}
            disabled={!canStart}
          />
        )}
      </View>

      {/* Parameter Settings Collapse */}
      <List header="Parameters">
        <StepperRow
          label="Chunk size"
          value={chunkSize}
          step={64}
          min={64}
          max={2048}
          suffix=" B"
          onChange={(v) => patch({ chunkSize: v })}
          disabled={sending}
        />
        <StepperRow
          label="Frame rate"
          value={fps}
          step={1}
          min={1}
          max={30}
          suffix=" fps"
          onChange={(v) => patch({ fps: v })}
        />
        <Row
          label="Error correction"
          accessory={
            <View style={{ width: 170 }}>
              <Seg
                value={ecl}
                options={ECLS}
                onChange={(v) => patch({ ecl: v as Ecl })}
                disabled={sending}
              />
            </View>
          }
        />
        <ToggleRow
          label="Shuffle order"
          detail="Breaks aliasing against receiver blind spots"
          value={shuffled}
          onChange={(v) => patch({ shuffled: v })}
          disabled={sending}
        />
      </List>
    </Screen>
  );
}
