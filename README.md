<div align="center">
  <img src="assets/wordmark.png" alt="Prism" width="380"/>
</div>

Prism moves files from one device to another using just a screen and a camera. The sender splits the file into chunks, wraps each one in a small header, encodes it as base45, and displays it as a rotating QR carousel. The receiver points its camera at the screen, checks each frame against its checksum, and reassembles the file as pieces come in, throwing out anything it's already seen.

There's no pairing step and no acknowledgement sent back to the sender, so a receiver can join partway through a transfer, look away, and pick back up later without anything breaking.

## Contents

- Getting started
- Project layout
- Wire format
- Filenames
- Checking compatibility with the web app
- SDK state
- Simplifications made on purpose
- What changed in this port
- Testing
- Roadmap
- Contributing
- License

## Getting started

You'll need Node and npm, plus the Expo CLI or Expo Go (or a dev build if you need native modules). To actually test a transfer you'll want two devices, or a device and a simulator with camera passthrough.

```bash
npm install       # node_modules on disk is currently a mix of SDK versions, see "SDK state" below
npm test          # runs the protocol self check, no device needed
npx expo start
```

Open the app on two devices, pick Send on one and Receive on the other, and point the receiving camera at the sending screen.

## Project layout

| File | What |
| --- | --- |
| `src/protocol.ts` | The wire format itself: CRC 8/CRC 32, base45, frame encode/decode, carousel ordering, QR geometry. No Expo imports, so it runs under plain Node. |
| `src/protocol.test.ts` | The self check. RFC 9285 vectors, CRC check values, the exact header byte layout, all eight rejection categories, and shuffle determinism. |
| `src/fileio.ts` | The one file that's coupled to the SDK: picking, reading, writing, and sharing files. |
| `src/store.ts` | A zustand store for settings, the state machine, and the bench log. |
| `src/screens/` | Home, Send, Receive, Bench, and Docs screens. |

High frequency counters live in component refs and only get flushed to the store around 5 times a second. If they lived in the store directly, the QR carousel would re render on every camera callback.

## Wire format

Every frame starts with a 16 byte, little endian header, then the payload. The whole thing gets base45 encoded (RFC 9285) so it fits QR alphanumeric mode at 5.5 bits per character instead of the 8 bits per character that base64's lowercase letters force.

| Offset | Length | Field |
| --- | --- | --- |
| 0 | 1 | `magic` = `0xA1` |
| 1 | 1 | `version_type`, high nibble is the version, low nibble is the frame type |
| 2 | 2 | `transferId` |
| 4 | 2 | `chunkIndex` |
| 6 | 2 | `chunkCount` |
| 8 | 2 | `payloadLen` |
| 10 | 1 | `passIndex` (mod 256) |
| 11 | 4 | `payloadCrc32` |
| 15 | 1 | `headerCrc8`, computed over bytes 0 through 14 |

Protocol version is 1. Frame type 0 is DATA, the actual file bytes. Type 1 is META, whose payload is just the UTF 8 filename. Types 2 through 15 are reserved for parity frames down the line.

Rejections get checked cheapest first: too short, bad magic, bad header CRC, unsupported version, unknown type, truncated payload, bad payload CRC, inconsistent header. The Receive screen tracks each of these separately, since which ones show up tells you a lot about what's wrong with the channel.

## Filenames

DATA frames don't carry a filename, so a plain reassembly has nothing to name itself after, which is why you'd otherwise end up with a `.bin` file. To fix that, the sender sends one META frame at the start of every pass with the filename in it. That costs one frame slot per pass, but it also means a receiver joining late still picks up the name within a single sweep.

META is optional on both ends, which is what keeps this compatible with the original:

- A sender that never sends one, like the web version, still transfers fine. The receiver just falls back to `prism-<transferId>.bin`.
- A receiver that doesn't know about type 1 just counts it as unknown type and moves on, since the DATA frames are unaffected. Sending to the web app will bump its unknown type count by one frame per pass, and that's expected.

META always rides at chunkIndex 0, so a receiver has to check the frame type before treating it as a chunk. Otherwise the filename bytes would overwrite chunk 0 and quietly corrupt the file. This is checked directly in `protocol.test.ts`.

The filename itself is untrusted, since there's no pairing and nothing verifying who sent it. `safeFileName` strips out directory separators, control characters, and leading dots, and caps the length. It's applied inside `writeToCache`, which is the one place a wire name turns into an actual file path, so there's no way around it. Path traversal is covered in the tests too.

## Checking compatibility with the web app

The spec names these two fields but doesn't pin down their exact parameters, so they're set to the standard defaults here. Both are a one line change if the web version turns out to disagree:

1. CRC 8 polynomial: `CRC8_POLY` in `src/protocol.ts` is `0x07`, init `0x00`, no reflection, no final XOR. That's CRC 8/SMBUS, check value `0xF4`, basically the plain "CRC 8" people usually mean.
2. Frame type nibble: DATA is 0, so byte 1 of every DATA frame is `0x10`. META is 1, so byte 1 is `0x11`. If the web version ever assigns type 1 to something else, `FrameType.META` just moves into the reserved range.

Everything else in the header is fully pinned by the spec and checked byte for byte in `protocol.test.ts`.

The shuffle seed doesn't need checking against anything, since send order is invisible to the receiver anyway. It just collects frames in whatever order they show up.

## SDK state

`package.json` targets Expo SDK 54, but node_modules on disk right now is a mix: expo itself is 54.0.37, while expo-camera, expo-file-system, expo-document-picker, and react-native are still on SDK 53. Do a clean install before building anything:

```bash
rm -rf node_modules package-lock.json && npm install && npx expo install --fix
```

`src/fileio.ts` is written against SDK 54's synchronous File and Paths API. If you're pinning back to SDK 53, the one thing to change is that import to `expo-file-system/legacy`.

## Simplifications made on purpose

- The whole file sits in memory on both ends. That's fine up to tens of megabytes, which is about as much as a QR carousel could ever realistically carry.
- There's no whole file digest. Every chunk's payload gets CRC 32 checked as it arrives, and Save won't fire until every chunk is accounted for, so a corrupt chunk can't sneak through. But there's no end to end hash over the finished file, since v1 just doesn't have a place to put one.
- The chunk grid groups cells together once you're past 512 chunks, so a big transfer still shows its loss pattern without trying to render thousands of individual boxes.
- QR version numbers are exact for error correction level L, the default. M, Q, and H use the standard capacity ratios and get labeled with a "roughly equal to" sign instead of an exact number.
- There's no audio channel yet. Nobody's built a ggwave binding for React Native, so the Send screen just shows the option and explains that it's not there yet rather than faking it. That's planned for phase two.

## What changed in this port

Native barcode scanning (ML Kit on Android, AVFoundation on iOS) takes the place of the web version's canvas plus jsQR polling loop. Native camera access also doesn't need a secure context, so there's none of the HTTPS or certificate workaround the web version needed.

One thing worth knowing if you're comparing benchmarks: the platform scanner only hands you already decoded symbols, not raw frames. That means there's no receiver side processing loss to separate out from channel loss (whatever loss you see per pass is purely channel loss), but you also can't see the raw frame count. If you need that for an apples to apples comparison against the web numbers, use react-native-vision-camera's frame processor instead.

## Testing

```bash
npm test
```

`src/protocol.test.ts` is the full self check and doesn't need a device at all. It covers RFC 9285 test vectors, CRC check values, the exact header byte layout, all eight rejection categories, and shuffle determinism.

## Roadmap

- Audio channel using a ggwave binding for React Native (phase two)
- An end to end file digest on top of the per chunk CRC 32
- Parity frame types in the reserved range (2 through 15) for forward error correction

## Contributing

Issues and PRs are welcome. If you touch anything in `src/protocol.ts`, add or update the matching case in `src/protocol.test.ts` too. The wire format is what makes this whole thing, and its compatibility with the web app, work, so it's tested byte for byte on purpose.

## License

MIT
