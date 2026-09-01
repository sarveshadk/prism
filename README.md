<div align="center">
  <img src="assets/wordmark.png" alt="Prism" width="420"/>

  <p><b>Infrastructure-free file transfer, screen to camera.</b></p>

  <p>
    <img src="https://img.shields.io/badge/platform-React%20Native%20(Expo)-000000.svg" alt="platform"/>
    <img src="https://img.shields.io/badge/license-MIT-red.svg" alt="license"/>
    <img src="https://img.shields.io/badge/protocol-v1-1f1f1f.svg" alt="protocol version"/>
  </p>
</div>

<br/>

Prism sends files between two devices with **no pairing, no acknowledgement, no back-channel, and
no network calls at all.** A sender splits a file into chunks, wraps each in a 16-byte header,
base45-encodes the frame, and renders it as a repeating QR carousel. A receiver watches the screen
continuously, validates every frame against its checksums, and reassembles the file — discarding
duplicates as they arrive.

Because the transfer is one-way and stateless, a receiver can join mid-transmission, drop out, and
rejoin at any point without breaking anything.

This is the React Native port of [sarveshadk/airlink](https://github.com/sarveshadk/airlink). It
shares the exact same wire format, so this app and the web app at
[airlinkk.vercel.app](https://airlinkk.vercel.app) interoperate with each other in both
directions.

<br/>

## Table of contents

- [Why](#why)
- [Features](#features)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [Wire format](#wire-format)
- [Filenames](#filenames)
- [Verifying against the web app](#verifying-against-the-web-app)
- [SDK state](#sdk-state)
- [Deliberate simplifications](#deliberate-simplifications)
- [What this port changes](#what-this-port-changes)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

<br/>

## Why

Most "offline" file-sharing options quietly depend on infrastructure — a shared Wi-Fi network, a
Bluetooth pairing handshake, a hotspot, a cable. Prism doesn't. It only needs a screen and a
camera, so it works between any two devices that can display and read a QR code, regardless of
network conditions, OS, or whether the two devices trust each other at the network layer.

## Features

- **Zero infrastructure** — no Wi-Fi, Bluetooth, hotspot, or cable required.
- **No handshake** — the sender doesn't know or care whether a receiver is watching.
- **Resilient by design** — a receiver can join late, look away, and come back without losing
  progress; duplicate and out-of-order frames are handled for free by the checksum + chunk model.
- **Cross-platform interoperability** — the wire format is shared with the web prototype, so a
  phone and a browser can send to each other.
- **Self-describing filenames** — an optional META frame carries the original filename across, with
  a safe fallback when it's missing.
- **Defensive by default** — incoming filenames are treated as hostile input and sanitized at the
  single point where they become a real path.
- **Diagnosable losses** — every rejection reason is counted separately on the Receive screen, so
  channel quality can be read off the failure distribution instead of guessed at.

## Getting started

### Prerequisites

- Node.js and npm
- [Expo CLI](https://docs.expo.dev/get-started/installation/) / the Expo Go app, or a development
  build for native modules
- Two devices (or a device + simulator with camera passthrough) to test a real transfer

### Install

```bash
npm install          # the tree currently on disk is half-upgraded — see "SDK state" below
npm test              # protocol self-check, no device needed
npx expo start
```

### Run a transfer

Open the app on two devices. Choose **Send** on one and **Receive** on the other, then point the
receiving device's camera at the sending device's screen.

## Project layout

| File | What |
| --- | --- |
| `src/protocol.ts` | The wire format. CRC-8/CRC-32, base45, frame encode/decode, carousel order, QR geometry. No Expo imports — runs under plain Node. |
| `src/protocol.test.ts` | The self-check: RFC 9285 vectors, CRC check values, exact header byte layout, all 8 rejection categories, shuffle determinism. |
| `src/fileio.ts` | The only SDK-coupled file: pick, read, write, share. |
| `src/store.ts` | zustand store: settings, state machine, bench log. |
| `src/screens/` | Home, Send, Receive, Bench, Docs. |

High-frequency counters live in component refs and flush to state at ~5 Hz. Putting them in the
store would re-render the QR carousel on every camera callback.

## Wire format

A 16-byte, little-endian header precedes the payload. The whole frame is base45-encoded
([RFC 9285](https://datatracker.ietf.org/doc/html/rfc9285)) so it fits QR alphanumeric mode at 5.5
bits/char, instead of the 8 bits/char that base64's lowercase characters force.

| Offset | Length | Field |
| --- | --- | --- |
| 0 | 1 | `magic` = `0xA1` |
| 1 | 1 | `version_type` — high nibble version, low nibble frame type |
| 2 | 2 | `transferId` |
| 4 | 2 | `chunkIndex` |
| 6 | 2 | `chunkCount` |
| 8 | 2 | `payloadLen` |
| 10 | 1 | `passIndex` (mod 256) |
| 11 | 4 | `payloadCrc32` |
| 15 | 1 | `headerCrc8` over bytes 0–14 |

Protocol version is `1`. Frame type `0` is **DATA** (raw file bytes); type `1` is **META**, whose
payload is the UTF-8 filename. Types `2`–`15` are reserved for future parity frames.

Rejections are checked cheapest-first: `too-short` → `bad-magic` → `bad-header-crc` →
`unsupported-version` → `unknown-type` → `truncated-payload` → `bad-payload-crc` →
`inconsistent-header`. The Receive screen counts each of these separately, because the
distribution across categories is what diagnoses the channel.

## Filenames

DATA frames carry no filename, so a plain reassembly has nothing to be named after — that's why it
lands as `.bin` by default. To fix that, the sender emits one **META** frame at the head of every
pass, carrying the UTF-8 filename. This costs one frame slot per pass, and means a receiver that
joins late still learns the filename within a single sweep.

META is optional in both directions, which is what keeps everything compatible:

- A sender that emits none — like the web prototype — still transfers correctly; the receiver falls
  back to `prism-<transferId>.bin`.
- A receiver that doesn't recognize type `1` counts it under `unknown-type` and loses nothing,
  since the DATA frames are untouched. Sending to the web app does inflate its `unknown-type`
  tally by one frame per pass.

META rides at `chunkIndex 0`, so **a receiver must branch on frame type before treating a frame as
a chunk** — otherwise the filename bytes overwrite chunk 0 and silently corrupt the file. This
ordering is asserted directly in `protocol.test.ts`.

The incoming filename is unauthenticated — there's no pairing and no back-channel — so it's treated
as hostile input. `safeFileName` strips directory separators, control characters, and leading dots,
and caps the length. It's applied inside `writeToCache`, the single point where a wire name becomes
a real path, so no call site can bypass it. Path-traversal cases are covered in the tests.

## Verifying against the web app

The JSON spec names both of the following fields but not their parameters, so they're pinned here
to the standard choices. Both are one-line changes if the web prototype ever disagrees:

1. **CRC-8 polynomial** — `CRC8_POLY` in `src/protocol.ts` is `0x07`, init `0x00`, no reflection, no
   final XOR (CRC-8/SMBUS, check value `0xF4`). This is the plain "CRC-8."
2. **Frame type nibble** — DATA is `0`, so byte 1 of every DATA frame this app sends is `0x10`.
   META is `1` (byte 1 = `0x11`). If the web prototype ever assigns type `1` to something else,
   `FrameType.META` moves into the reserved range.

Everything else in the header is fully pinned by the spec and asserted byte-for-byte in
`protocol.test.ts`.

The shuffle seed needs no verification — send order is invisible to the receiver, which collects
frames opportunistically in whatever order they arrive.

## SDK state

`package.json` targets Expo SDK 54, but `node_modules` on disk is currently a mix: `expo` is
`54.0.37`, while `expo-camera`, `expo-file-system`, `expo-document-picker`, and `react-native` are
still SDK 53 versions. Run a clean install before building:

```bash
rm -rf node_modules package-lock.json && npm install && npx expo install --fix
```

`src/fileio.ts` is written against SDK 54's synchronous `File` / `Paths` API. If you pin back to
SDK 53, change that one import to `expo-file-system/legacy`.

## Deliberate simplifications

Each of these is marked with a `ponytail:` comment at the point it applies in the code.

- **Whole file in memory** on both ends — fine up to tens of MB; a QR carousel will never realistically
  carry more than that.
- **No whole-file digest.** Every chunk's payload CRC-32 is verified on arrival, and Save is gated
  on a complete set, so a corrupt chunk can never be accepted — but there's no end-to-end hash over
  the assembled file, since v1 has nowhere to put one.
- **Chunk grid groups cells** above 512 chunks, so a large transfer still shows its loss pattern
  instead of rendering thousands of individual views.
- **QR version is exact for EC level L only** (the default, documented level). M/Q/H use the
  standard capacity ratios and are labelled with `≈`.
- **Audio channel is not implemented.** No ggwave binding exists for React Native yet. The Send
  screen shows the selector and explains the state honestly rather than pretending. Planned for
  Phase 2.

## What this port changes

Native barcode scanning (ML Kit on Android, AVFoundation on iOS) replaces the web version's canvas
+ jsQR polling loop. Native camera access also needs no secure context — there's no HTTPS or
certificate workaround required at all here.

One consequence worth knowing for benchmark comparisons: the platform scanner hands over already-decoded
symbols, not raw frames. So there's no receiver-side processing loss to separate from channel loss
(per-pass loss is pure channel loss) — but raw camera frame count also isn't observable. Use
[`react-native-vision-camera`](https://github.com/mrousavy/react-native-vision-camera)'s frame
processor if you need that for a like-for-like comparison against the web numbers.

## Testing

```bash
npm test
```

`src/protocol.test.ts` is the full self-check and needs no device: RFC 9285 test vectors, CRC
check values, exact header byte layout, all 8 rejection categories, and shuffle determinism are
all asserted there.

## Roadmap

- [ ] Audio/ultrasonic channel (ggwave binding for React Native) — Phase 2
- [ ] End-to-end file digest on top of per-chunk CRC-32
- [ ] Parity frame types (reserved range `2`–`15`) for forward error correction

## Contributing

Issues and pull requests are welcome. If you're changing anything in `src/protocol.ts`, add or
update a case in `src/protocol.test.ts` alongside it — the wire format is the contract this whole
project (and its interoperability with the web app) depends on, so it's covered byte-for-byte on
purpose.

## License

MIT