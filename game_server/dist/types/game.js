export function toRoomStateDtoFor(room, viewerSocketId) {
    const isSpy = viewerSocketId === room.spySocketId;
    const hideQuestionFromSpy = isSpy && room.phase === 'question';
    const question = room.phase === 'lobby' || room.phase === 'intro' || hideQuestionFromSpy
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
        lastEliminated: room.lastEliminatedId &&
            (room.phase === 'round_result' || room.phase === 'game_over')
            ? {
                socketId: room.lastEliminatedId,
                name: room.players.get(room.lastEliminatedId)?.name ?? '?',
                wasSpy: room.lastEliminatedId === room.spySocketId,
            }
            : null,
        winner: room.winner,
        spy: room.phase === 'game_over' && room.spySocketId
            ? { socketId: room.spySocketId, name: room.players.get(room.spySocketId)?.name ?? '?' }
            : null,
        robotScript: room.robotScript,
    };
}
function shouldRevealAnswers(phase) {
    return (phase === 'announcement' ||
        phase === 'defense' ||
        phase === 'voting' ||
        phase === 'round_result' ||
        phase === 'game_over');
}
export function toRobotStateDto(room) {
    return {
        code: room.code,
        phase: room.phase,
        players: Array.from(room.players.values()).map((p) => ({
            socketId: p.socketId,
            name: p.name,
            score: p.score,
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
