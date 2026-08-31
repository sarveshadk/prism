# Prism (React Native port)

Infrastructure-free file transfer — screen to camera. A sender splits a file into chunks, wraps
each in a 16-byte header, base45-encodes the frame, and renders it as a repeating QR carousel. A
receiver watches continuously, validates every frame against its checksums, and reassembles the
file, discarding duplicates across passes.

No pairing. No acknowledgement. No back-channel. No network calls at all. The receiver can join
mid-transmission, drop out, and rejoin.

Port of [sarveshadk/airlink](https://github.com/sarveshadk/airlink) — same wire format, so a phone
running this app and the web app at airlinkk.vercel.app interoperate in both directions.

MIT.

## Run it

```
npm install          # the tree currently on disk is half-upgraded — see "SDK state" below
npm test             # protocol self-check, no device needed
npx expo start
```

Two devices: **Send** on one, **Receive** on the other, point the camera at the screen.

## Layout

| File | What |
| --- | --- |
| `src/protocol.ts` | The wire format. CRC-8/CRC-32, base45, frame encode/decode, carousel order, QR geometry. No Expo imports — runs under plain node. |
| `src/protocol.test.ts` | The self-check. RFC 9285 vectors, CRC check values, exact header byte layout, all 8 rejection categories, shuffle determinism. |
| `src/fileio.ts` | The only SDK-coupled file: pick, read, write, share. |
| `src/store.ts` | zustand: settings, state machine, bench log. |
| `src/screens/` | Home, Send, Receive, Bench, Docs. |

High-frequency counters live in component refs and flush to state at ~5 Hz. Putting them in the
store would re-render the QR carousel on every camera callback.

## Wire format

16-byte header, little-endian, then the payload; the whole frame is base45 (RFC 9285) so it fits
QR alphanumeric mode at 5.5 bits/char instead of the 8 bits/char base64's lowercase forces.

| Off | Len | Field |
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

Protocol version 1. Frame type 0 is DATA (file bytes); type 1 is META, whose payload is the UTF-8
filename. Types 2–15 stay reserved for parity frames.

Rejections are checked cheapest-first: `too-short`, `bad-magic`, `bad-header-crc`,
`unsupported-version`, `unknown-type`, `truncated-payload`, `bad-payload-crc`,
`inconsistent-header`. The Receive screen counts each separately, because the distribution
diagnoses the channel.

## Filenames

The protocol carries no filename in its DATA frames, so a received file has nothing to be named
after — that is why a plain reassembly lands as `.bin`. The sender therefore emits one **META**
frame at the head of every pass, carrying the UTF-8 filename, which costs one frame slot per pass
and means a receiver joining late learns the name within a single sweep.

META is optional in both directions, which is what keeps it compatible:

- A sender that emits none (the web prototype) still transfers correctly; the receiver falls back
  to `prism-<transferId>.bin`.
- A receiver that does not know type 1 counts it under `unknown-type` and loses nothing, because
  the DATA frames are untouched. Sending to the web app does inflate its `unknown-type` tally by
  one frame per pass.

META rides at `chunkIndex 0`, so **a receiver must branch on frame type before treating a frame as
a chunk** — otherwise the filename bytes overwrite chunk 0 and silently corrupt the file. That
ordering is asserted in `protocol.test.ts`.

The incoming name is unauthenticated — there is no pairing and no back-channel — so it is treated
as hostile input. `safeFileName` strips directory separators, control characters, and leading dots,
and caps the length; it is applied inside `writeToCache`, the single point where a wire name becomes
a real path, so no call site can bypass it. Path-traversal cases are covered in the tests.

## Two things to verify against the web app

The JSON spec names both fields but not their parameters, so these are pinned to the standard
choices. Both are one-line changes if the web prototype disagrees:

1. **CRC-8 polynomial** — `CRC8_POLY` in `src/protocol.ts` is `0x07`, init `0x00`, no reflection,
   no final XOR (CRC-8/SMBUS, check value `0xF4`). This is the plain "CRC-8".
2. **Frame type nibble** — DATA is `0`, so byte 1 of every DATA frame this app sends is `0x10`.
   META is `1` (byte 1 = `0x11`); if the web prototype ever assigns type 1 to something else, move
   `FrameType.META` into the reserved range.

Everything else in the header is fully pinned by the spec and asserted byte-for-byte in
`protocol.test.ts`.

The shuffle seed needs no verification: send order is invisible to the receiver, which collects
opportunistically in any order.

## SDK state

`package.json` targets Expo SDK 54, but `node_modules` on disk is a mix — `expo` is 54.0.37 while
`expo-camera`, `expo-file-system`, `expo-document-picker`, and `react-native` are still SDK 53
versions. Run a clean install before building:

```
rm -rf node_modules package-lock.json && npm install && npx expo install --fix
```

`src/fileio.ts` is written against SDK 54's synchronous `File` / `Paths` API. If you pin back to
SDK 53, change that one import to `expo-file-system/legacy`.

## Deliberate simplifications

Each is marked with a `ponytail:` comment at the point it applies.

- **Whole file in memory** on both ends. Fine to tens of MB; a QR carousel will never carry more.
- **No whole-file digest.** Every chunk's payload CRC-32 is verified on arrival and Save is gated on
  a complete set, so a corrupt chunk can never be accepted — but there is no end-to-end hash over
  the assembled file, because v1 has nowhere to put one.
- **Chunk grid groups cells** above 512 chunks, so a large transfer still shows its loss pattern
  instead of rendering thousands of views.
- **QR version is exact for EC L only** (the default and documented level). M/Q/H use the standard
  capacity ratios and are labelled `≈`.
- **Audio channel is not implemented.** No ggwave binding for React Native exists. The Send screen
  offers the selector and explains the state rather than pretending. Phase 2.

## What this port changes

Native barcode scanning (ML Kit / AVFoundation) replaces the web version's canvas + jsQR polling
loop, and native camera access needs no secure context — there is no HTTPS or certificate
workaround here at all.

One consequence worth knowing for benchmark comparisons: the platform scanner hands over decoded
symbols, not raw frames. So there is no receiver-side processing loss to separate from channel
loss (per-pass loss is pure channel loss), but raw camera frame count is not observable either.
Use `react-native-vision-camera`'s frame processor if you need it for a like-for-like comparison
against the web numbers.
