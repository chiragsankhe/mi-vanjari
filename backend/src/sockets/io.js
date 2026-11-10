/** Holds the Socket.io server instance so services can emit without circular imports. */
let io = null;

export const setIO = (instance) => {
  io = instance;
};

/** Emit an event to every socket of a given user (each user joins room `user:<id>`). */
export function emitToUser(userId, event, payload) {
  if (io) io.to(`user:${userId}`).emit(event, payload);
}

export function emitToRoom(room, event, payload) {
  if (io) io.to(room).emit(event, payload);
}

/** Whether a user currently has at least one connected socket. */
export function isOnline(userId) {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return Boolean(room && room.size > 0);
}
