import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { getRoom, listRoomCodes, seedRoom } from './state/rooms.js';
import { registerRoomHandlers } from './handlers/roomHandlers.js';
const PORT = Number(process.env.PORT ?? 8080);
const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/rooms/:code', (req, res) => {
    const room = getRoom(req.params.code);
    res.json({ exists: Boolean(room), phase: room?.phase ?? null });
});
app.get('/api/rooms', (_req, res) => {
    const codes = listRoomCodes();
    res.json({ count: codes.length, codes });
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
});
io.on('connection', (socket) => {
    console.log(`[socket] connected ${socket.id}`);
    registerRoomHandlers(io, socket);
    socket.on('disconnect', (reason) => {
        console.log(`[socket] disconnected ${socket.id} (${reason})`);
    });
});
const SEEDED_ROOM = seedRoom('TEST');
httpServer.listen(PORT, () => {
    console.log(`game server listening on http://localhost:${PORT}`);
    console.log(`seeded room: ${SEEDED_ROOM.code} (phase=${SEEDED_ROOM.phase})`);
});
