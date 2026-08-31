import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { HEADER_SIZE, REJECT_MEANING, REJECT_REASONS, VERSION } from '../protocol';
import { radius, space, tabular, type, useTheme } from '../theme';
import { Card, Header, List, Note, Row, Screen } from '../ui';

export default function Docs() {
  const c = useTheme();
  const [filterIdx, setFilterIdx] = useState(0);

  const sections = [
    {
      title: 'How QR Chain works',
      body: 'Prism encodes your file into a sequence of high-density QR frames displayed at up to 30 fps. The receiver’s camera decodes each frame in order, reassembling the binary payload client-side. No network handshake — just light.',
    },
    {
      title: 'Acoustic transfer',
      body: 'Files are modulated into near-ultrasonic chirps (18–20 kHz) using frequency-shift keying. The receiving device’s microphone captures and demodulates the signal in real time. Range: 30–100 cm in quiet environments.',
    },
    {
      title: 'Chunk integrity',
      body: 'Each chunk carries a CRC-32 checksum and a sequence index. Failed chunks are re-requested via a short acknowledgement QR displayed by the receiver. Typical retry rate: under 2%.',
    },
    {
      title: 'Security model',
      body: 'Sessions are ephemeral. No data leaves the device pair. Payloads are optionally encrypted with AES-256-GCM, keyed by a setup QR displayed before the transfer begins.',
    },
  ];

  const specs = [
    ['QR frame rate', 'Up to 30 fps'],
    ['QR data / frame', '~2.9 KB (binary)'],
    ['Acoustic freq', '18–20 kHz'],
    ['Acoustic range', '30–100 cm'],
    ['Max file size', 'Unlimited (chunked)'],
    ['Encryption', 'AES-256-GCM (optional)'],
  ];

  const filters = ['QR Chain', 'Acoustic', 'Both'];

  return (
    <Screen>
      {/* Title Header */}
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.xs }}>
        <Text style={[type.overline, { color: c.textMuted }]}>Documentation</Text>
        <Text style={[type.displayLarge, { color: c.text, marginTop: 4, marginBottom: 8 }]} numberOfLines={1}>
          How it works
        </Text>
        <Text style={[type.body, { color: c.textSub, lineHeight: 22 }]}>
          Prism transfers files using only light and sound. No internet. No Bluetooth. No cables.
        </Text>
      </View>

      {/* Filter Chips matching Figma */}
      <View
        style={{
          flexDirection: 'row',
          gap: space.sm,
          paddingHorizontal: space.lg,
          paddingVertical: 6,
        }}
      >
        {filters.map((f, i) => {
          const active = filterIdx === i;
          return (
            <Pressable
              key={f}
              onPress={() => setFilterIdx(i)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: radius.pill,
                backgroundColor: active ? c.coral : c.surface,
                borderWidth: 1,
                borderColor: active ? c.coral : c.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: active ? '600' : '400',
                  color: active ? '#FFFFFF' : c.textSub,
                }}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Numbered Sections matching Figma */}
      <View style={{ paddingHorizontal: space.lg, gap: space.sm }}>
        {sections.map((sec, idx) => (
          <View key={sec.title}>
            <View style={{ flexDirection: 'row', gap: 14, paddingVertical: 14 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: c.coral,
                  marginTop: 2,
                  width: 24,
                }}
              >
                {String(idx + 1).padStart(2, '0')}
              </Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[type.displaySmall, { color: c.text, fontSize: 18, lineHeight: 22 }]}>
                  {sec.title}
                </Text>
                <Text style={[type.body, { color: c.textSub, lineHeight: 21 }]}>
                  {sec.body}
                </Text>
              </View>
            </View>
            {idx < sections.length - 1 && (
              <View style={{ height: 1, backgroundColor: c.border, marginLeft: 38 }} />
            )}
          </View>
        ))}
      </View>

      {/* Technical Specs Card matching Figma */}
      <View style={{ paddingHorizontal: space.lg, marginTop: space.sm }}>
        <Card variant="cardLg">
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: c.border,
            }}
          >
            <Text style={[type.displaySmall, { color: c.text, fontSize: 18 }]}>
              Technical specs
            </Text>
          </View>

          {specs.map(([label, val], i) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderBottomWidth: i < specs.length - 1 ? 1 : 0,
                borderColor: c.border,
              }}
            >
              <Text style={[type.body, { color: c.textSub }]}>{label}</Text>
              <Text style={[type.bodyMedium, { color: c.text }]}>{val}</Text>
            </View>
          ))}
        </Card>
      </View>

      {/* Protocol Header Reference */}
      <List header={`Frame Header · ${HEADER_SIZE} Bytes · v${VERSION}`}>
        <Row label="Magic Byte" value="0xA1" detail="Noise rejection" />
        <Row label="Encoding" value="base45" detail="RFC 9285 (+29% efficiency)" />
        <Row label="CRC Check" value="CRC-32" detail="Every chunk validated" />
      </List>
    </Screen>
  );
}
