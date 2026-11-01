
import { io, Socket } from "socket.io-client";
import { supabase } from "./supabase";

const SOCKET_URL = "http://192.168.31.159:3000";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Please log in to connect to group chat");
  }

  // Reuse an existing authenticated connection
  if (socket?.connected) {
    return socket;
  }

  // Close any previous connection before reconnecting
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: {
      token: session.access_token,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return new Promise((resolve, reject) => {
    const currentSocket = socket!;

    currentSocket.once("connect", () => {
      resolve(currentSocket);
    });

    currentSocket.once("connect_error", (error) => {
      currentSocket.disconnect();
      socket = null;
      reject(error);
    });
  });
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
