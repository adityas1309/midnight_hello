import * as cryptoBrowserify from 'crypto-browserify';

function toUint8Array(value: Uint8Array | Buffer): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  return new Uint8Array(value);
}

export function timingSafeEqual(a: Uint8Array | Buffer, b: Uint8Array | Buffer): boolean {
  const left = toUint8Array(a);
  const right = toUint8Array(b);

  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

export * from 'crypto-browserify';

export default {
  ...cryptoBrowserify,
  timingSafeEqual,
};
