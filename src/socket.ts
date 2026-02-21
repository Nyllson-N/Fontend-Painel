// socket.ts
import { io, Socket } from "socket.io-client";
import { baseURL } from "../src/config";

export const socket: Socket = io(baseURL, {
  transports: ["websocket"],
});
