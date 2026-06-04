export interface JoinPayload {
  roomCode: string;
  playerName: string;
  shirtColor: ShirtColor;
}

export const ROOM_CODE_LENGTH = 4;

export const MAX_NAME_LENGTH = 12;

export const SHIRT_COLORS = ['orange', 'green', 'red'] as const;

export type ShirtColor = (typeof SHIRT_COLORS)[number];
