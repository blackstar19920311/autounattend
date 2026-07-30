/**
 * Base64 kódolás, ami BÖNGÉSZŐBEN ÉS Node-ban is működik.
 *
 * A korábbi implementáció Node-specifikus `Buffer`-t használt. Mivel az
 * `addFile()` minden generálásnál lefut, a böngészőben ez `ReferenceError`-t
 * dobott, és a teljes XML generálás elhalt (a UI csak "generálási hiba"-t
 * mutatott). A `generateTest.js` pont azért nem bukott el, mert Node-ban fut,
 * ahol a `Buffer` létezik.
 */

function bytesToBase64(bytes) {
  let binary = '';
  const CHUNK = 0x8000; // nagy fájloknál elkerüli a call stack túlcsordulást
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  /* c8 ignore next */
  return globalThis.Buffer.from(binary, 'binary').toString('base64');
}

function base64ToBytes(b64) {
  const clean = String(b64).replace(/\s+/g, '');
  let binary;
  if (typeof atob === 'function') {
    binary = atob(clean);
  } else {
    /* c8 ignore next */
    binary = globalThis.Buffer.from(clean, 'base64').toString('binary');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** UTF-8, BOM nélkül. */
export function encodeUtf8Base64(str) {
  return bytesToBase64(new TextEncoder().encode(String(str ?? '')));
}

/** UTF-16LE, BOM-mal (Registry .reg és VBScript .vbs fájlokhoz kötelező). */
export function encodeUtf16LeBase64(str, withBom = true) {
  const s = String(str ?? '');
  const out = new Uint8Array(s.length * 2 + (withBom ? 2 : 0));
  let o = 0;
  if (withBom) {
    out[o++] = 0xff;
    out[o++] = 0xfe;
  }
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    out[o++] = code & 0xff;
    out[o++] = (code >> 8) & 0xff;
  }
  return bytesToBase64(out);
}

/** Visszafejtés – főleg a tesztek használják a round-trip ellenőrzéshez. */
export function decodeBase64ToUtf8(b64) {
  return new TextDecoder('utf-8').decode(base64ToBytes(b64));
}

/** Visszafejtés UTF-16LE-ből (BOM-ot levágja). */
export function decodeBase64ToUtf16Le(b64) {
  let bytes = base64ToBytes(b64);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    bytes = bytes.subarray(2);
  }
  return new TextDecoder('utf-16le').decode(bytes);
}
