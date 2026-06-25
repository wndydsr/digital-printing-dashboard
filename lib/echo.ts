import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: any;
    Echo: any;
  }
}

export function initEcho() {
  if (typeof window === 'undefined') return;
  if (window.Echo) return;

  window.Pusher = Pusher;
  // Pusher.logToConsole = false; // Matikan log bawaan Pusher di production

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "rkk1ifs5yaarebrdhhzq",
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || "ws.prinora.store",
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 443,
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 443,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL || "https://api.prinora.store/api"}/broadcasting/auth`,
    auth: {
      headers: {
        get Authorization() {
          return `Bearer ${localStorage.getItem('token') || ''}`;
        },
        'Accept': 'application/json',
      },
    },
  });

  // Hanya munculkan log error jika websocket terputus / gagal konek
  window.Echo.connector.pusher.connection.bind('error', (err: any) => {
    console.error("[WEBSOCKET ERROR] Gagal terkoneksi ke server chat:", err);
  });
}