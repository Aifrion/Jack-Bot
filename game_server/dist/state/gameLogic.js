import { toRoomStateDtoFor, toRobotStateDto } from '../types/game.js';
import { QUESTIONS, START_SCRIPT } from '../utils/scripts.js';
export const robotRoomKey = (code) => `robot:${code}`;
const envMs = (name, fallback) => {
    const v = process.env[name];
    if (!v)
        return fallback;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};
const QUESTION_DURATION_MS = envMs('QUESTION_MS', 60_000);
const DEFENSE_DURATION_MS = envMs('DEFENSE_MS', 120_000);
const VOTING_DURATION_MS = envMs('VOTING_MS', 30_000);
const ROBOT_PHASE_TIMEOUT_MS = envMs('ROBOT_PHASE_TIMEOUT_MS', 60_000);
const SPY_WIN_THRESHOLD = 2;
export function broadcastRoomState(io, room) {
    for (const player of room.players.values()) {
        io.to(player.socketId).emit('room-state', toRoomStateDtoFor(room, player.socketId));
    }
    io.to(robotRoomKey(room.code)).emit('robot-state', toRobotStateDto(room));
}
function clearRoomTimer(room) {
    if (room.timerHandle) {
        clearTimeout(room.timerHandle);
        room.timerHandle = null;
    }
    room.phaseDeadline = null;
}
function scheduleAdvance(room, ms, next) {
    clearRoomTimer(room);
    room.phaseDeadline = Date.now() + ms;
    room.timerHandle = setTimeout(() => {
        room.timerHandle = null;
        room.phaseDeadline = null;
        next();
    }, ms);
}
export function startGame(io, room) {
    const ids = Array.from(room.players.keys());
    room.spySocketId = ids[Math.floor(Math.random() * ids.length)] ?? null;
    room.alivePlayerIds = new Set(ids);
    room.currentRound = 0;
    room.currentQuestionIndex = 0;
    room.currentQuestion = null;
    room.answers = new Map();
    room.votes = new Map();
    room.lastEliminatedId = null;
    room.winner = null;
    enterIntro(io, room);
}
function enterIntro(io, room) {
    room.phase = 'intro';
    room.robotScript = START_SCRIPT;
    scheduleAdvance(room, ROBOT_PHASE_TIMEOUT_MS, () => enterQuestion(io, room));
    broadcastRoomState(io, room);
}
function enterQuestion(io, room) {
    if (room.currentQuestionIndex >= QUESTIONS.length)
        room.currentQuestionIndex = 0;
    room.currentQuestion = QUESTIONS[room.currentQuestionIndex] ?? null;
    room.answers = new Map();
    room.phase = 'question';
    room.robotScript = null;
    scheduleAdvance(room, QUESTION_DURATION_MS, () => enterAnnouncement(io, room));
    broadcastRoomState(io, room);
}
function enterAnnouncement(io, room) {
    room.phase = 'announcement';
    const answerLines = Array.from(room.answers.entries())
        .map(([sid, a]) => `${room.players.get(sid)?.name ?? '?'} answered with ${a}`)
        .join('. ');
    room.robotScript =
        `The question was: ${room.currentQuestion}. ` +
            (answerLines ? `${answerLines}.` : 'Nobody answered.');
    scheduleAdvance(room, ROBOT_PHASE_TIMEOUT_MS, () => enterDefense(io, room));
    broadcastRoomState(io, room);
}
function enterDefense(io, room) {
    room.phase = 'defense';
    room.robotScript =
        "Now it's time to defend yourselves. You all have 120 seconds to make yourself seem less suspicious.";
    scheduleAdvance(room, DEFENSE_DURATION_MS, () => enterVoting(io, room));
    broadcastRoomState(io, room);
}
function enterVoting(io, room) {
    room.phase = 'voting';
    room.votes = new Map();
    room.robotScript = null;
    scheduleAdvance(room, VOTING_DURATION_MS, () => enterRoundResult(io, room));
    broadcastRoomState(io, room);
}
function enterRoundResult(io, room) {
    clearRoomTimer(room);
    const tally = new Map();
    for (const votedFor of room.votes.values()) {
        if (!room.alivePlayerIds.has(votedFor))
            continue;
        tally.set(votedFor, (tally.get(votedFor) ?? 0) + 1);
    }
    let eliminated = null;
    if (tally.size === 0) {
        const alive = Array.from(room.alivePlayerIds);
        eliminated = alive[Math.floor(Math.random() * alive.length)] ?? null;
    }
    else {
        const maxVotes = Math.max(...tally.values());
        const tied = Array.from(tally.entries())
            .filter(([, c]) => c === maxVotes)
            .map(([sid]) => sid);
        eliminated = tied[Math.floor(Math.random() * tied.length)] ?? null;
    }
    if (eliminated) {
        room.alivePlayerIds.delete(eliminated);
        room.lastEliminatedId = eliminated;
    }
    const eliminatedName = eliminated ? room.players.get(eliminated)?.name ?? '?' : '?';
    const wasSpy = eliminated === room.spySocketId;
    if (wasSpy) {
        room.winner = 'players';
        room.phase = 'game_over';
        room.robotScript = `${eliminatedName} was the spy! Players win.`;
        broadcastRoomState(io, room);
        return;
    }
    if (room.alivePlayerIds.size <= SPY_WIN_THRESHOLD) {
        room.winner = 'spy';
        room.phase = 'game_over';
        const spyName = room.spySocketId ? room.players.get(room.spySocketId)?.name ?? '?' : '?';
        room.robotScript = `${eliminatedName} was eliminated, but they were not the spy. ${spyName} was the spy. The spy wins!`;
        broadcastRoomState(io, room);
        return;
    }
    room.phase = 'round_result';
    room.currentQuestionIndex++;
    room.currentRound++;
    room.robotScript = `${eliminatedName} was eliminated and was not the spy. Next round.`;
    scheduleAdvance(room, ROBOT_PHASE_TIMEOUT_MS, () => enterQuestion(io, room));
    broadcastRoomState(io, room);
}
export function submitAnswer(io, room, socketId, answer) {
    if (room.phase !== 'question')
        return 'Not in question phase';
    if (!room.alivePlayerIds.has(socketId))
        return 'You are not alive in this round';
    if (!Number.isInteger(answer) || answer < 0 || answer > 10)
        return 'Answer must be an integer 0–10';
    room.answers.set(socketId, answer);
    broadcastRoomState(io, room);
    if (allAliveAnswered(room))
        enterAnnouncement(io, room);
    return null;
}
export function submitVote(io, room, voterId, votedFor) {
    if (room.phase !== 'voting')
        return 'Not in voting phase';
    if (!room.alivePlayerIds.has(voterId))
        return 'You are not alive in this round';
    if (!room.alivePlayerIds.has(votedFor))
        return 'Target is not alive';
    if (voterId === votedFor)
        return "You can't vote for yourself";
    room.votes.set(voterId, votedFor);
    broadcastRoomState(io, room);
    if (allAliveVoted(room))
        enterRoundResult(io, room);
    return null;
}
export function advancePhase(io, room, callerSocketId) {
    const isHost = callerSocketId === room.hostSocketId;
    const isRobot = room.robotSubscriberIds.has(callerSocketId);
    if (!isHost && !isRobot)
        return 'Only the host or a subscribed robot can advance phases';
    switch (room.phase) {
        case 'intro':
            enterQuestion(io, room);
            return null;
        case 'announcement':
            enterDefense(io, room);
            return null;
        case 'round_result':
            enterQuestion(io, room);
            return null;
        default:
            return `Cannot advance from phase ${room.phase}`;
    }
}
function allAliveAnswered(room) {
    for (const sid of room.alivePlayerIds)
        if (!room.answers.has(sid))
            return false;
    return true;
}
function allAliveVoted(room) {
    for (const sid of room.alivePlayerIds)
        if (!room.votes.has(sid))
            return false;
    return true;
}
