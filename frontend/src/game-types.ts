export type Phase =
  | 'lobby'
  | 'intro'
  | 'question'
  | 'announcement'
  | 'defense'
  | 'voting'
  | 'round_result'
  | 'game_over';

export type Winner = 'players' | 'spy';

export interface PlayerView {
  socketId: string;
  name: string;
  score: number;
  isAlive: boolean;
  hasAnswered: boolean;
  hasVoted: boolean;
}

export interface AnswerView {
  socketId: string;
  name: string;
  answer: number;
}

export interface EliminatedView {
  socketId: string;
  name: string;
  wasSpy: boolean;
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostSocketId: string;
  players: PlayerView[];
  currentRound: number;
  currentQuestion: string | null;
  youAreSpy: boolean;
  yourAnswerSubmitted: boolean;
  yourVoteSubmitted: boolean;
  phaseDeadline: number | null;
  roundAnswers: AnswerView[] | null;
  lastEliminated: EliminatedView | null;
  winner: Winner | null;
  spy: { socketId: string; name: string } | null;
  robotScript: string | null;
}

export interface Ack {
  ok: boolean;
  error?: string;
}
