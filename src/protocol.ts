export const MAGIC = 0xa1;
export const VERSION = 1;
export const HEADER_SIZE = 16;
export const MAX_CHUNKS = 0xffff; // chunkcount is uint16

// low nibble of byte 1. meta is optional: a sender may omit it, a receiver may reject it
export const FrameType = { DATA: 0, META: 1 } as const;

export const MAX_NAME_BYTES = 180;

export type Ecl = 'L' | 'M' | 'Q' | 'H';

// crc-8/smbus: poly 0x07, init 0x00, no reflect, no xorout
const CRC8_POLY = 0x07;

const CRC8_TABLE = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 0x80 ? ((c << 1) ^ CRC8_POLY) & 0xff : (c << 1) & 0xff;
    t[i] = c;
  }
  return t;
})();

export function crc8(bytes: Uint8Array): number {
  let c = 0;
  for (let i = 0; i < bytes.length; i++) c = CRC8_TABLE[c ^ bytes[i]];
  return c;
}

const CRC32_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = -1;
  for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// qr alphanumeric charset, in order
const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
const B45_INDEX: Record<string, number> = {};
for (let i = 0; i < B45.length; i++) B45_INDEX[B45[i]] = i;

export function base45Encode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 1 < bytes.length; i += 2) {
    const n = bytes[i] * 256 + bytes[i + 1];
    out += B45[n % 45] + B45[Math.floor(n / 45) % 45] + B45[Math.floor(n / 2025)];
  }
  if (i < bytes.length) {
    const n = bytes[i];
    out += B45[n % 45] + B45[Math.floor(n / 45)];
  }
  return out;
}

export function base45Decode(text: string): Uint8Array | null {
  const n = text.length;
  if (n % 3 === 1) return null;
  const out = new Uint8Array(Math.floor(n / 3) * 2 + (n % 3 === 2 ? 1 : 0));
  let o = 0;
  for (let i = 0; i < n; ) {
    const a = B45_INDEX[text[i]];
    const b = B45_INDEX[text[i + 1]];
    if (a === undefined || b === undefined) return null;
    if (n - i >= 3) {
      const c = B45_INDEX[text[i + 2]];
      if (c === undefined) return null;
      const v = a + b * 45 + c * 2025;
      if (v > 0xffff) return null;
      out[o++] = v >> 8;
      out[o++] = v & 0xff;
      i += 3;
    } else {
      const v = a + b * 45;
      if (v > 0xff) return null;
      out[o++] = v;
      i += 2;
    }
  }
  return out;
}

export const base45Len = (rawBytes: number) =>
  Math.floor(rawBytes / 2) * 3 + (rawBytes % 2) * 2;

export type Frame = {
  type: number;
  transferId: number;
  chunkIndex: number;
  chunkCount: number;
  passIndex: number;
  payload: Uint8Array;
};

export function encodeFrame(f: Frame): string {
  const buf = new Uint8Array(HEADER_SIZE + f.payload.length);
  const dv = new DataView(buf.buffer);
  buf[0] = MAGIC;
  buf[1] = ((VERSION & 0x0f) << 4) | (f.type & 0x0f);
  dv.setUint16(2, f.transferId, true);
  dv.setUint16(4, f.chunkIndex, true);
  dv.setUint16(6, f.chunkCount, true);
  dv.setUint16(8, f.payload.length, true);
  buf[10] = f.passIndex & 0xff;
  dv.setUint32(11, crc32(f.payload), true);
  buf[15] = crc8(buf.subarray(0, 15));
  buf.set(f.payload, HEADER_SIZE);
  return base45Encode(buf);
}

export type RejectReason =
  | 'too-short'
  | 'bad-magic'
  | 'bad-header-crc'
  | 'unsupported-version'
  | 'unknown-type'
  | 'truncated-payload'
  | 'bad-payload-crc'
  | 'inconsistent-header';

export const REJECT_REASONS: RejectReason[] = [
  'too-short',
  'bad-magic',
  'bad-header-crc',
  'unsupported-version',
  'unknown-type',
  'truncated-payload',
  'bad-payload-crc',
  'inconsistent-header',
];

export const REJECT_MEANING: Record<RejectReason, string> = {
  'too-short': 'fewer bytes than a header',
  'bad-magic': 'not a Prism frame — rejects 255/256 of random data',
  'bad-header-crc': 'header fields cannot be trusted',
  'unsupported-version': 'protocol version this build cannot parse',
  'unknown-type': "frame type not in this version's set",
  'truncated-payload': 'fewer payload bytes than payloadLen promised',
  'bad-payload-crc': 'payload corrupted in transit',
  'inconsistent-header': 'fields disagree with the locked transfer',
};

export type Lock = { transferId: number; chunkCount: number };

export type DecodeResult =
  | { ok: true; frame: Frame }
  | { ok: false; reason: RejectReason };

export function decodeFrame(text: string, lock?: Lock | null): DecodeResult {
  // undecodable text yields no bytes, so it falls in the cheapest bucket
  const bytes = base45Decode(text);
  if (!bytes || bytes.length < HEADER_SIZE) return { ok: false, reason: 'too-short' };
  if (bytes[0] !== MAGIC) return { ok: false, reason: 'bad-magic' };
  if (crc8(bytes.subarray(0, 15)) !== bytes[15]) return { ok: false, reason: 'bad-header-crc' };

  const version = bytes[1] >> 4;
  const type = bytes[1] & 0x0f;
  if (version !== VERSION) return { ok: false, reason: 'unsupported-version' };
  if (type !== FrameType.DATA && type !== FrameType.META)
    return { ok: false, reason: 'unknown-type' };

  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const transferId = dv.getUint16(2, true);
  const chunkIndex = dv.getUint16(4, true);
  const chunkCount = dv.getUint16(6, true);
  const payloadLen = dv.getUint16(8, true);
  const passIndex = bytes[10];

  if (bytes.length - HEADER_SIZE < payloadLen) return { ok: false, reason: 'truncated-payload' };
  const payload = bytes.subarray(HEADER_SIZE, HEADER_SIZE + payloadLen);
  if (crc32(payload) !== dv.getUint32(11, true)) return { ok: false, reason: 'bad-payload-crc' };

  if (chunkCount === 0 || chunkIndex >= chunkCount) return { ok: false, reason: 'inconsistent-header' };
  if (lock && (transferId !== lock.transferId || chunkCount !== lock.chunkCount))
    return { ok: false, reason: 'inconsistent-header' };

  return { ok: true, frame: { type, transferId, chunkIndex, chunkCount, passIndex, payload } };
}

export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.codePointAt(i)!;
    if (c > 0xffff) i++; // codepointat already consumed both surrogate halves
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else
      out.push(
        0xf0 | (c >> 18),
        0x80 | ((c >> 12) & 0x3f),
        0x80 | ((c >> 6) & 0x3f),
        0x80 | (c & 0x3f)
      );
  }
  return new Uint8Array(out);
}

export function utf8Decode(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; ) {
    const c = b[i];
    // i always advances, so malformed input yields nonsense but never spins
    if (c < 0x80) {
      s += String.fromCharCode(c);
      i += 1;
    } else if (c < 0xe0) {
      s += String.fromCharCode(((c & 0x1f) << 6) | (b[i + 1] & 0x3f));
      i += 2;
    } else if (c < 0xf0) {
      s += String.fromCharCode(((c & 0x0f) << 12) | ((b[i + 1] & 0x3f) << 6) | (b[i + 2] & 0x3f));
      i += 3;
    } else {
      s += String.fromCodePoint(
        ((c & 0x07) << 18) | ((b[i + 1] & 0x3f) << 12) | ((b[i + 2] & 0x3f) << 6) | (b[i + 3] & 0x3f)
      );
      i += 4;
    }
  }
  return s;
}

export function encodeName(name: string): Uint8Array {
  const bytes = utf8Encode(name);
  if (bytes.length <= MAX_NAME_BYTES) return bytes;
  let end = MAX_NAME_BYTES;
  // back off only if the cut landed mid-character, then drop that character whole
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end);
}

// untrusted sender input: must not escape the target directory
export function safeFileName(name: string, fallback = 'prism-file'): string {
  const base = (name.split(/[/\\]/).pop() ?? '')
    .replace(/[\x00-\x1f\x7f<>:"|?*]/g, '')
    .replace(/^\.+/, '')
    .trim();
  return base.slice(0, 120) || fallback;
}

// seeded from (transferid, passindex) alone, so any pass is reproducible from the wire
export function sendOrder(
  chunkCount: number,
  transferId: number,
  passIndex: number,
  shuffled: boolean
): number[] {
  const order = Array.from({ length: chunkCount }, (_, i) => i);
  if (!shuffled) return order;
  let s = (Math.imul(transferId, 0x9e3779b1) ^ Math.imul(passIndex + 1, 0x85ebca6b)) >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = chunkCount - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  return order;
}

// alphanumeric capacity at ec l, versions 1..40
const ALNUM_CAP_L = [
  25, 47, 77, 114, 154, 195, 224, 279, 335, 395, 468, 535, 619, 667, 758, 854, 938, 1046, 1153,
  1249, 1352, 1460, 1588, 1704, 1853, 1990, 2132, 2223, 2369, 2520, 2677, 2840, 3009, 3183, 3351,
  3537, 3729, 3927, 4087, 4296,
];

// only l is exact; m/q/h are ratio estimates, reported via `exact`
const EC_RATIO: Record<Ecl, number> = { L: 1, M: 0.79, Q: 0.56, H: 0.43 };

export const DENSE_QR_VERSION = 15;

export function qrGeometry(charCount: number, ecl: Ecl) {
  const cap = EC_RATIO[ecl];
  for (let v = 0; v < 40; v++) {
    if (charCount <= ALNUM_CAP_L[v] * cap) {
      const version = v + 1;
      return { version, modules: 17 + 4 * version, exact: ecl === 'L', overflow: false };
    }
  }
  return { version: 40, modules: 177, exact: ecl === 'L', overflow: true };
}

export const qrForChunkSize = (chunkSize: number, ecl: Ecl) =>
  qrGeometry(base45Len(HEADER_SIZE + chunkSize), ecl);

export function splitChunks(bytes: Uint8Array, chunkSize: number): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) out.push(bytes.subarray(i, i + chunkSize));
  return out.length ? out : [bytes.subarray(0, 0)];
}

export const newTransferId = () => (Math.random() * 0x10000) & 0xffff;

export const now = () =>
  typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
