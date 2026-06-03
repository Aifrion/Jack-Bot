import { addPlayer, createRoom, findRoomBySocket, getRoom, removePlayer } from '../state/rooms.js';
import { toRoomStateDtoFor, toRobotStateDto } from '../types/game.js';
import { advancePhase, broadcastRoomState, robotRoomKey, startGame, submitAnswer, submitVote, } from '../state/gameLogic.js';
const MIN_PLAYERS_TO_START = 3;
export function registerRoomHandlers(io, socket) {
    socket.on('create-room', (_, ack) => {
        const room = createRoom(socket.id);
        socket.join(room.code);
        ack?.({ ok: true, code: room.code });
        broadcastRoomState(io, room);
    });
    socket.on('join-room', (payload, ack) => {
        const code = payload?.code?.toUpperCase?.() ?? '';
        const name = payload?.name?.trim?.() ?? '';
        const room = getRoom(code);
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        if (room.phase !== 'lobby')
            return ack?.({ ok: false, error: 'Game already started' });
        if (!name)
            return ack?.({ ok: false, error: 'Name is required' });
        addPlayer(room, { socketId: socket.id, name, score: 0 });
        if (!room.hostSocketId)
            room.hostSocketId = socket.id;
        socket.join(room.code);
        ack?.({ ok: true });
        broadcastRoomState(io, room);
    });
    socket.on('start-game', (code, ack) => {
        const room = getRoom(code);
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        if (room.hostSocketId !== socket.id)
            return ack?.({ ok: false, error: 'Only the host can start the game' });
        if (room.phase !== 'lobby')
            return ack?.({ ok: false, error: 'Game already started' });
        if (room.players.size < MIN_PLAYERS_TO_START) {
            return ack?.({
                ok: false,
                error: `Need at least ${MIN_PLAYERS_TO_START} players to start (have ${room.players.size})`,
            });
        }
        ack?.({ ok: true });
        startGame(io, room);
    });
    socket.on('submit-answer', (payload, ack) => {
        const room = getRoom(payload?.code ?? '');
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        const err = submitAnswer(io, room, socket.id, payload.answer);
        ack?.(err ? { ok: false, error: err } : { ok: true });
    });
    socket.on('submit-vote', (payload, ack) => {
        const room = getRoom(payload?.code ?? '');
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        const err = submitVote(io, room, socket.id, payload.votedFor);
        ack?.(err ? { ok: false, error: err } : { ok: true });
    });
    socket.on('phase-done', (code, ack) => {
        const room = getRoom(code);
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        const err = advancePhase(io, room, socket.id);
        ack?.(err ? { ok: false, error: err } : { ok: true });
    });
    socket.on('request-room-state', (code) => {
        const room = getRoom(code);
        if (!room)
            return;
        socket.emit('room-state', toRoomStateDtoFor(room, socket.id));
    });
    socket.on('robot-subscribe', (code, ack) => {
        const room = getRoom(code);
        if (!room)
            return ack?.({ ok: false, error: 'Room not found' });
        socket.join(robotRoomKey(room.code));
        room.robotSubscriberIds.add(socket.id);
        socket.emit('robot-state', toRobotStateDto(room));
        ack?.({ ok: true });
    });
    socket.on('disconnect', () => {
        const room = findRoomBySocket(socket.id);
        if (!room)
            return;
        if (room.robotSubscriberIds.delete(socket.id)) {
            return;
        }
        const wasHost = room.hostSocketId === socket.id;
        removePlayer(room, socket.id);
        room.alivePlayerIds.delete(socket.id);
        if (wasHost) {
            const next = room.players.values().next().value;
            room.hostSocketId = next?.socketId ?? '';
        }
        broadcastRoomState(io, room);
    });
}
