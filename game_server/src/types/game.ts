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

export interface Player {
  socketId: string;
  name: string;
  score: number;
  shirtColor: string;
}

export interface Room {
  code: string;
  hostSocketId: string;
  phase: Phase;
  players: Map<string, Player>;
  createdAt: number;

  spySocketId: string | null;
  alivePlayerIds: Set<string>;
  currentRound: number;
  currentQuestionIndex: number;
  currentQuestion: string | null;
  answers: Map<string, number>;
  votes: Map<string, string>;
  phaseDeadline: number | null;
  timerHandle: NodeJS.Timeout | null;
  lastEliminatedId: string | null;
  winner: Winner | null;
  robotScript: string | null;
  robotSubscriberIds: Set<string>;
}

export interface RoomStateDto {
  code: string;
  phase: Phase;
  hostSocketId: string;
  players: Array<{
    socketId: string;
    name: string;
    score: number;
    shirtColor: string;
    isAlive: boolean;
    hasAnswered: boolean;
    hasVoted: boolean;
  }>;
  currentRound: number;
  currentQuestion: string | null;
  youAreSpy: boolean;
  yourAnswerSubmitted: boolean;
  yourVoteSubmitted: boolean;
  phaseDeadline: number | null;
  roundAnswers: Array<{ socketId: string; name: string; answer: number }> | null;
  lastEliminated: { socketId: string; name: string; wasSpy: boolean } | null;
  winner: Winner | null;
  spy: { socketId: string; name: string } | null;
  robotScript: string | null;
}

export function toRoomStateDtoFor(room: Room, viewerSocketId: string): RoomStateDto {
  const isSpy = viewerSocketId === room.spySocketId;
  const hideQuestionFromSpy = isSpy && room.phase === 'question';
  const question =
    room.phase === 'lobby' || room.phase === 'intro' || hideQuestionFromSpy
      ? null
      : room.currentQuestion;

  return {
    code: room.code,
    phase: room.phase,
    hostSocketId: room.hostSocketId,
    players: Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      name: p.name,
      score: p.score,
      shirtColor: p.shirtColor,
      isAlive: room.alivePlayerIds.has(p.socketId),
      hasAnswered: room.answers.has(p.socketId),
      hasVoted: room.votes.has(p.socketId),
    })),
    currentRound: room.currentRound,
    currentQuestion: question,
    youAreSpy: isSpy && room.phase !== 'lobby',
    yourAnswerSubmitted: room.answers.has(viewerSocketId),
    yourVoteSubmitted: room.votes.has(viewerSocketId),
    phaseDeadline: room.phaseDeadline,
    roundAnswers: shouldRevealAnswers(room.phase)
      ? Array.from(room.answers.entries()).map(([sid, a]) => ({
          socketId: sid,
          name: room.players.get(sid)?.name ?? '?',
          answer: a,
        }))
      : null,
    lastEliminated:
      room.lastEliminatedId &&
      (room.phase === 'round_result' || room.phase === 'game_over')
        ? {
            socketId: room.lastEliminatedId,
            name: room.players.get(room.lastEliminatedId)?.name ?? '?',
            wasSpy: room.lastEliminatedId === room.spySocketId,
          }
        : null,
    winner: room.winner,
    spy:
      room.phase === 'game_over' && room.spySocketId
        ? { socketId: room.spySocketId, name: room.players.get(room.spySocketId)?.name ?? '?' }
        : null,
    robotScript: room.robotScript,
  };
}

function shouldRevealAnswers(phase: Phase): boolean {
  return (
    phase === 'announcement' ||
    phase === 'defense' ||
    phase === 'voting' ||
    phase === 'round_result' ||
    phase === 'game_over'
  );
}

export interface RobotStateDto {
  code: string;
  phase: Phase;
  players: Array<{
    socketId: string;
    name: string;
    score: number;
    shirtColor: string;
    isAlive: boolean;
    hasAnswered: boolean;
    hasVoted: boolean;
  }>;
  currentRound: number;
  currentQuestion: string | null;
  spy: { socketId: string; name: string } | null;
  phaseDeadline: number | null;
  roundAnswers: Array<{ socketId: string; name: string; answer: number }> | null;
  lastEliminated: { socketId: string; name: string; wasSpy: boolean } | null;
  winner: Winner | null;
  robotScript: string | null;
}

export function toRobotStateDto(room: Room): RobotStateDto {
  return {
    code: room.code,
    phase: room.phase,
    players: Array.from(room.players.values()).map((p) => ({
      socketId: p.socketId,
      name: p.name,
      score: p.score,
      shirtColor: p.shirtColor,
      isAlive: room.alivePlayerIds.has(p.socketId),
      hasAnswered: room.answers.has(p.socketId),
      hasVoted: room.votes.has(p.socketId),
    })),
    currentRound: room.currentRound,
    currentQuestion: room.currentQuestion,
    spy: room.spySocketId
      ? { socketId: room.spySocketId, name: room.players.get(room.spySocketId)?.name ?? '?' }
      : null,
    phaseDeadline: room.phaseDeadline,
    roundAnswers: Array.from(room.answers.entries()).map(([sid, a]) => ({
      socketId: sid,
      name: room.players.get(sid)?.name ?? '?',
      answer: a,
    })),
    lastEliminated: room.lastEliminatedId
      ? {
          socketId: room.lastEliminatedId,
          name: room.players.get(room.lastEliminatedId)?.name ?? '?',
          wasSpy: room.lastEliminatedId === room.spySocketId,
        }
      : null,
    winner: room.winner,
    robotScript: room.robotScript,
  };
}
