/** Supabase realtime-js expects WebSocket; Node 20 on Render does not provide it globally. */
import ws from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws as unknown as typeof WebSocket;
}
