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

  console.log("[ECHO] Memulai inisialisasi Websocket...");
  window.Pusher = Pusher;
  
  // Wajib nyalakan ini sementara untuk debug di production
  Pusher.logToConsole = true; 

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "rkk1ifs5yaarebrdhhzq",
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || '127.0.0.1',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'https') === 'https' ? ['wss'] : ['ws'],
    disableStats: true,
    authEndpoint: `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/broadcasting/auth`,
    auth: {
      headers: {
        get Authorization() {
          return `Bearer ${localStorage.getItem('token') || ''}`;
        },
        'Accept': 'application/json',
      },
    },
  });

  // Tambahkan listener untuk mengecek status koneksi secara eksplisit
  window.Echo.connector.pusher.connection.bind('connected', () => {
    console.log("%c[ECHO] ✅ BERHASIL KONEK KE WEBSOCKET!", "color: green; font-size: 14px; font-weight: bold;");
    console.log("[ECHO] Socket ID:", window.Echo.socketId());
  });

  window.Echo.connector.pusher.connection.bind('error', (err: any) => {
    console.error("%c[ECHO] ❌ GAGAL KONEK KE WEBSOCKET!", "color: red; font-size: 14px; font-weight: bold;", err);
  });
}