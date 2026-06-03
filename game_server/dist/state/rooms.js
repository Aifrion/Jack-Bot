import { generateUniqueRoomCode } from '../utils/codes.js';
const rooms = new Map();
function blankGameState() {
    return {
        spySocketId: null,
        alivePlayerIds: new Set(),
        currentRound: 0,
        currentQuestionIndex: 0,
        currentQuestion: null,
        answers: new Map(),
        votes: new Map(),
        phaseDeadline: null,
        timerHandle: null,
        lastEliminatedId: null,
        winner: null,
        robotScript: null,
    };
}
export function createRoom(hostSocketId) {
    const code = generateUniqueRoomCode((c) => rooms.has(c));
    const room = {
        code,
        hostSocketId,
        phase: 'lobby',
        players: new Map(),
        createdAt: Date.now(),
        robotSubscriberIds: new Set(),
        ...blankGameState(),
    };
    rooms.set(code, room);
    return room;
}
export function seedRoom(code) {
    const upper = code.toUpperCase();
    const existing = rooms.get(upper);
    if (existing)
        return existing;
    const room = {
        code: upper,
        hostSocketId: '',
        phase: 'lobby',
        players: new Map(),
        createdAt: Date.now(),
        robotSubscriberIds: new Set(),
        ...blankGameState(),
    };
    rooms.set(upper, room);
    return room;
}
export function getRoom(code) {
    return rooms.get(code.toUpperCase());
}
export function deleteRoom(code) {
    rooms.delete(code.toUpperCase());
}
export function listRoomCodes() {
    return Array.from(rooms.keys());
}
export function addPlayer(room, player) {
    room.players.set(player.socketId, player);
}
export function removePlayer(room, socketId) {
    room.players.delete(socketId);
}
export function findRoomBySocket(socketId) {
    for (const room of rooms.values()) {
        if (room.hostSocketId === socketId ||
            room.players.has(socketId) ||
            room.robotSubscriberIds.has(socketId)) {
            return room;
        }
    }
    return undefined;
}
export function resetRoomForNewGame(room) {
    if (room.timerHandle)
        clearTimeout(room.timerHandle);
    Object.assign(room, blankGameState());
    room.phase = 'lobby';
}
