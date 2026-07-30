/**
 * Browser- and Node-compatible Base64 helpers.
 */

function bytesToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  if (typeof btoa === 'function') return btoa(binary);
  return globalThis.Buffer.from(binary, 'binary').toString('base64');
}

function base64ToBytes(b64) {
  const clean = String(b64).replace(/\s+/g, '');
  const binary = typeof atob === 'function'
    ? atob(clean)
    : globalThis.Buffer.from(clean, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeUtf8Base64(str) {
  return bytesToBase64(new TextEncoder().encode(String(str ?? '')));
}

export function encodeUtf16LeBase64(str, withBom = true) {
  const s = String(str ?? '');
  const out = new Uint8Array(s.length * 2 + (withBom ? 2 : 0));
  let offset = 0;
  if (withBom) { out[offset++] = 0xff; out[offset++] = 0xfe; }
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[offset++] = code & 0xff;
    out[offset++] = code >> 8;
  }
  return bytesToBase64(out);
}

export function decodeBase64ToUtf8(b64) {
  return new TextDecoder('utf-8').decode(base64ToBytes(b64));
}

export function decodeBase64ToUtf16Le(b64) {
  let bytes = base64ToBytes(b64);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) bytes = bytes.subarray(2);
  return new TextDecoder('utf-16le').decode(bytes);
}
