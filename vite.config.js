import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

/**
 * Verziócímke build időből.
 *
 * A korábbi `new Date(new Date().toLocaleString('en-US', { timeZone: ... }))`
 * körbefordítás törékeny volt: a locale sztringet a futtató Node/ICU verziótól
 * függő formátumban adta vissza, amit a Date konstruktor néha Invalid Date-ként
 * értelmezett. Itt közvetlenül a formázott részekből építjük fel.
 */
function buildVersion(timeZone = 'Europe/Budapest') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map(({ type, value }) => [type, value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `v${parts.year}${parts.month}${parts.day}-${hour}${parts.minute}`;
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion()),
  },
  plugins: [react(), cloudflare()],
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});
