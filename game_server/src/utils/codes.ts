const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function generateUniqueRoomCode(isTaken: (code: string) => boolean): string {
  for (let i = 0; i < 50; i++) {
    const code = generateRoomCode();
    if (!isTaken(code)) return code;
  }
  throw new Error('Could not generate a unique room code after 50 attempts');
}
