/**
 * Közös formázók. Korábban a termékkulcs és az Office-kulcs mezője KÜLÖN,
 * egymástól eltérő logikát használt (inkonzisztens UX).
 */

/** 5 karakteres blokkok kötőjellel, nagybetűsítve. XXXXX-XXXXX-XXXXX-XXXXX-XXXXX */
export function formatProductKey(raw) {
  const cleaned = String(raw ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 25);
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 5) {
    parts.push(cleaned.slice(i, i + 5));
  }
  return parts.join('-');
}

/** A formázott kulcs teljes hossza: 5*5 + 4 kötőjel. */
export const PRODUCT_KEY_MAX_LENGTH = 29;

export const PRODUCT_KEY_PATTERN = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
