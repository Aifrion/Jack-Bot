import type { Room, Player } from '../types/game.js';
import { generateUniqueRoomCode } from '../utils/codes.js';

const rooms = new Map<string, Room>();

function blankGameState() {
  return {
    spySocketId: null,
    alivePlayerIds: new Set<string>(),
    currentRound: 0,
    currentQuestionIndex: 0,
    currentQuestion: null,
    answers: new Map<string, number>(),
    votes: new Map<string, string>(),
    phaseDeadline: null,
    timerHandle: null,
    lastEliminatedId: null,
    winner: null,
    robotScript: null,
  };
}

export function createRoom(hostSocketId: string): Room {
  const code = generateUniqueRoomCode((c) => rooms.has(c));
  const room: Room = {
    code,
    hostSocketId,
    phase: 'lobby',
    players: new Map(),
    createdAt: Date.now(),
    robotSubscriberIds: new Set<string>(),
    ...blankGameState(),
  };
  rooms.set(code, room);
  return room;
}

export function seedRoom(code: string): Room {
  const upper = code.toUpperCase();
  const existing = rooms.get(upper);
  if (existing) return existing;
  const room: Room = {
    code: upper,
    hostSocketId: '',
    phase: 'lobby',
    players: new Map(),
    createdAt: Date.now(),
    robotSubscriberIds: new Set<string>(),
    ...blankGameState(),
  };
  rooms.set(upper, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  rooms.delete(code.toUpperCase());
}

export function listRoomCodes(): string[] {
  return Array.from(rooms.keys());
}

export function addPlayer(room: Room, player: Player): void {
  room.players.set(player.socketId, player);
}

export function removePlayer(room: Room, socketId: string): void {
  room.players.delete(socketId);
}

export function findRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (
      room.hostSocketId === socketId ||
      room.players.has(socketId) ||
      room.robotSubscriberIds.has(socketId)
    ) {
      return room;
    }
  }
  return undefined;
}

export function resetRoomForNewGame(room: Room): void {
  if (room.timerHandle) clearTimeout(room.timerHandle);
  Object.assign(room, blankGameState());
  room.phase = 'lobby';
}
