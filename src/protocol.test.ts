import {
  FrameType,
  HEADER_SIZE,
  MAGIC,
  MAX_NAME_BYTES,
  REJECT_REASONS,
  base45Decode,
  base45Encode,
  base45Len,
  crc32,
  crc8,
  decodeFrame,
  encodeFrame,
  encodeName,
  qrForChunkSize,
  safeFileName,
  sendOrder,
  splitChunks,
  utf8Decode,
  utf8Encode,
} from './protocol';

const assert = {
  equal(actual: unknown, expected: unknown, message?: string) {
    if (actual !== expected)
      throw new Error(message ?? `Expected ${String(expected)}, got ${String(actual)}`);
  },
  deepEqual(actual: unknown, expected: unknown, message?: string) {
    const same = (a: unknown, b: unknown): boolean => {
      if (Object.is(a, b)) return true;
      if (a instanceof Uint8Array && b instanceof Uint8Array) {
        return a.length === b.length && a.every((value, i) => value === b[i]);
      }
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((value, i) => same(value, b[i]));
      }
      return false;
    };
    if (!same(actual, expected)) throw new Error(message ?? 'Values are not deeply equal');
  },
  notDeepEqual(actual: unknown, expected: unknown, message?: string) {
    try {
      this.deepEqual(actual, expected);
    } catch {
      return;
    }
    throw new Error(message ?? 'Values are deeply equal');
  },
  ok(value: unknown, message?: string) {
    if (!value) throw new Error(message ?? 'Expected a truthy value');
  },
  match(value: string, expression: RegExp, message?: string) {
    if (!expression.test(value)) throw new Error(message ?? 'Value does not match expression');
  },
};

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

assert.equal(base45Encode(ascii('AB')), 'BB8');
assert.equal(base45Encode(ascii('Hello!!')), '%69 VD92EX0');
assert.equal(base45Encode(ascii('base-45')), 'UJCLQE7W581');
assert.equal(base45Encode(ascii('ietf!')), 'QED8WEX0');
assert.deepEqual(base45Decode('QED8WEX0'), ascii('ietf!'));

for (let n = 0; n <= 300; n++) {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 37 + n) & 0xff;
  const text = base45Encode(b);
  assert.equal(text.length, base45Len(n), `base45Len wrong at n=${n}`);
  assert.deepEqual(base45Decode(text), b, `round-trip failed at n=${n}`);
}

assert.equal(base45Decode('AAAA'), null, 'length % 3 == 1 must be rejected');
assert.equal(base45Decode('ab'), null, 'lowercase is not in the alphabet');
assert.equal(base45Decode('::::::'), null, 'group above 0xffff must be rejected');

assert.equal(crc32(new Uint8Array(0)), 0);
assert.equal(crc32(ascii('123456789')), 0xcbf43926);
assert.equal(crc8(ascii('123456789')), 0xf4, 'crc-8/smbus published check value');

{
  const text = encodeFrame({
    type: 0,
    transferId: 0x1234,
    chunkIndex: 5,
    chunkCount: 9,
    passIndex: 7,
    payload: new Uint8Array([1, 2, 3]),
  });
  const b = base45Decode(text)!;
  assert.equal(b.length, HEADER_SIZE + 3);
  assert.deepEqual(
    [...b.subarray(0, 11)],
    [MAGIC, 0x10, 0x34, 0x12, 0x05, 0x00, 0x09, 0x00, 0x03, 0x00, 0x07],
    'header bytes 0-10 are not the documented little-endian layout'
  );
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  assert.equal(dv.getUint32(11, true), crc32(new Uint8Array([1, 2, 3])));
  assert.equal(b[15], crc8(b.subarray(0, 15)));
  assert.match(text, /^[0-9A-Z $%*+\-./:]+$/, 'frame text must be qr-alphanumeric-safe');
}

{
  const payload = new Uint8Array(1500).map((_, i) => (i * 7) & 0xff);
  const f = { type: 0, transferId: 0xbeef, chunkIndex: 41, chunkCount: 100, passIndex: 255, payload };
  const got = decodeFrame(encodeFrame(f), { transferId: 0xbeef, chunkCount: 100 });
  if (!got.ok) throw new Error(`valid frame was rejected: ${got.reason}`);
  assert.equal(got.frame.chunkIndex, 41);
  assert.equal(got.frame.chunkCount, 100);
  assert.equal(got.frame.passIndex, 255);
  assert.deepEqual(got.frame.payload, payload);
}

// builds a valid frame, mutates the header, then repairs crc8 so the mutation is what gets tested
function mutated(fix: (b: Uint8Array, dv: DataView) => void, keepCrc8 = false) {
  const b = base45Decode(
    encodeFrame({
      type: 0,
      transferId: 1,
      chunkIndex: 0,
      chunkCount: 4,
      passIndex: 0,
      payload: ascii('hello'),
    })
  )!;
  fix(b, new DataView(b.buffer, b.byteOffset, b.byteLength));
  if (!keepCrc8) b[15] = crc8(b.subarray(0, 15));
  return base45Encode(b);
}
const reasonOf = (text: string, lock?: { transferId: number; chunkCount: number }) => {
  const r = decodeFrame(text, lock);
  return r.ok ? 'ok' : r.reason;
};

assert.equal(reasonOf('BB8'), 'too-short');
assert.equal(reasonOf('AAAA'), 'too-short');
assert.equal(reasonOf(mutated((b) => (b[0] = 0x00))), 'bad-magic');
assert.equal(reasonOf(mutated((b) => (b[15] ^= 0xff), true)), 'bad-header-crc');
assert.equal(reasonOf(mutated((b) => (b[1] = 0x20))), 'unsupported-version');
assert.equal(reasonOf(mutated((b) => (b[1] = 0x1f))), 'unknown-type');
assert.equal(reasonOf(mutated((_b, dv) => dv.setUint16(8, 999, true))), 'truncated-payload');
assert.equal(reasonOf(mutated((b) => (b[HEADER_SIZE] ^= 0xff), true)), 'bad-payload-crc');
assert.equal(reasonOf(mutated((_b, dv) => dv.setUint16(4, 4, true))), 'inconsistent-header');
assert.equal(reasonOf(mutated(() => {}), { transferId: 2, chunkCount: 4 }), 'inconsistent-header');
assert.equal(REJECT_REASONS.length, 8);

{
  let survived = 0;
  for (let i = 0; i < 4000; i++) {
    const b = new Uint8Array(24);
    for (let j = 0; j < b.length; j++) b[j] = (Math.random() * 256) | 0;
    if (decodeFrame(base45Encode(b)).ok) survived++;
  }
  assert.equal(survived, 0, 'random noise decoded as a valid frame');
}

{
  const perm = (o: number[]) => [...o].sort((a, b) => a - b);
  assert.deepEqual(sendOrder(6, 1, 0, false), [0, 1, 2, 3, 4, 5]);
  const a = sendOrder(64, 0x1234, 3, true);
  const b = sendOrder(64, 0x1234, 3, true);
  assert.deepEqual(a, b, 'shuffle is not reproducible from (transferId, passIndex)');
  assert.deepEqual(perm(a), [...Array(64).keys()], 'shuffle dropped or duplicated an index');
  assert.notDeepEqual(a, sendOrder(64, 0x1234, 4, true), 'passes share an order');
  assert.notDeepEqual(a, sendOrder(64, 0x1235, 3, true), 'transfers share an order');
}

{
  assert.equal(splitChunks(new Uint8Array(3001), 1500).length, 3);
  assert.equal(splitChunks(new Uint8Array(3000), 1500).length, 2);
  assert.equal(splitChunks(new Uint8Array(0), 1500).length, 1, 'empty file still sends one frame');
  const small = qrForChunkSize(512, 'L');
  const big = qrForChunkSize(1500, 'L');
  assert.ok(big.version > small.version, 'denser payload should need a higher QR version');
  assert.equal(small.modules, 17 + 4 * small.version);
}

{
  const HIRA_A = String.fromCharCode(0x3042);
  const PARTY = String.fromCodePoint(0x1f389);
  const UMLAUT_U = String.fromCharCode(0xfc);

  for (const s of ['report.pdf', `${UMLAUT_U}ber.txt`, `${HIRA_A}${HIRA_A}.png`, `p ${PARTY} q.zip`, '']) {
    assert.equal(utf8Decode(utf8Encode(s)), s, `utf8 round-trip failed for ${s}`);
  }
  assert.equal(utf8Encode(UMLAUT_U).length, 2);
  assert.equal(utf8Encode(HIRA_A).length, 3);
  assert.equal(utf8Encode(PARTY).length, 4, 'a surrogate pair must encode as 4 bytes, not 6');

  assert.deepEqual(encodeName('short.txt'), utf8Encode('short.txt'));

  const cut = encodeName(HIRA_A.repeat(200));
  assert.ok(cut.length <= MAX_NAME_BYTES, 'encodeName exceeded the cap');
  assert.equal(cut.length % 3, 0, 'truncation split a multi-byte character');
  assert.equal(utf8Decode(cut), HIRA_A.repeat(cut.length / 3));

  // MAX_NAME_BYTES divides evenly by 3 and 4, so those widths never land mid-character on their
  // own; a leading ascii byte shifts every boundary and actually exercises the back-off
  for (const ch of [UMLAUT_U, HIRA_A, PARTY]) {
    const width = utf8Encode(ch).length;
    const bytes = encodeName(`a${ch.repeat(200)}`);
    assert.ok(bytes.length <= MAX_NAME_BYTES, `cap exceeded for ${width}-byte chars`);
    assert.equal(
      utf8Decode(bytes),
      `a${ch.repeat((bytes.length - 1) / width)}`,
      `truncation split a ${width}-byte character`
    );
    assert.ok(MAX_NAME_BYTES - bytes.length < width, 'truncation discarded more than necessary');
  }

  assert.equal(safeFileName('../../etc/passwd'), 'passwd');
  assert.equal(safeFileName('..\\..\\windows\\system32\\evil.dll'), 'evil.dll');
  assert.equal(safeFileName('/absolute/path.txt'), 'path.txt');
  assert.equal(safeFileName('..'), 'prism-file');
  assert.equal(safeFileName(''), 'prism-file');
  assert.equal(safeFileName('  '), 'prism-file');
  assert.equal(safeFileName('.hidden'), 'hidden');
  assert.equal(safeFileName('bad:name?.txt'), 'badname.txt');
  assert.equal(safeFileName(`nul${String.fromCharCode(0)}byte.txt`), 'nulbyte.txt');
  assert.equal(safeFileName('a b.txt'), 'a b.txt');
  assert.equal(safeFileName('  spaced.txt  '), 'spaced.txt');
  assert.equal(safeFileName('normal file (1).png'), 'normal file (1).png');
  assert.ok(safeFileName('x'.repeat(400)).length <= 120, 'safeFileName did not cap length');
}

{
  const name = 'holiday photo.jpeg';
  const text = encodeFrame({
    type: FrameType.META,
    transferId: 7,
    chunkIndex: 0,
    chunkCount: 12,
    passIndex: 3,
    payload: encodeName(name),
  });
  const got = decodeFrame(text, { transferId: 7, chunkCount: 12 });
  if (!got.ok) throw new Error(`META frame was rejected: ${got.reason}`);
  assert.equal(got.frame.type, FrameType.META);
  assert.equal(utf8Decode(got.frame.payload), name);
  assert.equal(got.frame.chunkIndex, 0);
  assert.ok(got.frame.type !== FrameType.DATA, 'META is indistinguishable from DATA');

  assert.equal(reasonOf(mutated((b) => (b[1] = 0x12))), 'unknown-type');
  assert.equal(reasonOf(mutated((b) => (b[1] = 0x1f))), 'unknown-type');
}

console.log('protocol ok');
