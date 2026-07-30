/** XML 1.0 escaping. Tab, LF and CR are legal and preserved. */
export function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/[-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
