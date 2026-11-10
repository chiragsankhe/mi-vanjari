import { io } from 'socket.io-client';
import { refreshSession } from './api';
import { useAuth } from '../store/auth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined; // undefined → same origin (Vite proxy)

let socket = null;

/** Connect (or return the existing) authenticated socket. */
export function getSocket() {
  const token = useAuth.getState().accessToken;
  if (!token) return null;
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    auth: (cb) => cb({ token: useAuth.getState().accessToken }),
    transports: ['websocket', 'polling'],
    reconnectionDelayMax: 10000,
  });

  socket.on('connect_error', async (err) => {
    if (err.message === 'UNAUTHORIZED') {
      try {
        await refreshSession(); // token rotated → the auth callback picks up the new one
        socket.connect();
      } catch {
        disconnectSocket();
      }
    }
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Emit with acknowledgement as a promise. */
export function emitAck(event, payload, timeout = 8000) {
  const s = getSocket();
  if (!s?.connected) return Promise.reject(new Error('OFFLINE'));
  return new Promise((resolve, reject) => {
    s.timeout(timeout).emit(event, payload, (err, res) => {
      if (err) return reject(err);
      if (res?.ok === false) return reject(Object.assign(new Error(res.error?.message), { code: res.error?.code }));
      resolve(res);
    });
  });
}
