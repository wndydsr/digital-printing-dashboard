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

  window.Echo = new Echo({
    broadcaster: 'reverb',
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || "rkk1ifs5yaarebrdhhzq",
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || '127.0.0.1',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT) || 8080,
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: 'http://127.0.0.1:8000/api/broadcasting/auth',
    auth: {
      headers: {
        get Authorization() {
          return `Bearer ${localStorage.getItem('token') || ''}`;
        },
        'Accept': 'application/json',
      },
    },
  });
}