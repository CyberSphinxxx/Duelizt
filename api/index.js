const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = {};

app.use(express.json());

app.post('/api/create-room', (req, res) => {
    const roomId = uuidv4().substring(0, 8);
    rooms[roomId] = {
        players: [],
        quizStarted: false,
        currentQuestionIndex: 0,
        scores: {},
        questions: generateQuizQuestions()
    };
    console.log(`Room ${roomId} created.`);
    res.json({ roomId });
});

app.get('/api/join-room/:roomId', (req, res) => {
    const { roomId } = req.params;
    if (rooms[roomId]) {
        res.status(200).send({ message: `Room ${roomId} exists.` });
    } else {
        res.status(404).send({ message: `Room ${roomId} not found.` });
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-duel', ({ roomId, nickname }) => {
        if (!rooms[roomId]) {
            socket.emit('room-not-found');
            return;
        }

        const room = rooms[roomId];

        if (room.players.length >= 2) {
            socket.emit('room-full');
            return;
        }

        const player = { id: socket.id, nickname };
        room.players.push(player);
        room.scores[socket.id] = 0;
        socket.join(roomId);

        console.log(`${nickname} (${socket.id}) joined room ${roomId}. Players: ${room.players.length}`);

        io.to(roomId).emit('player-joined', room.players);

        if (room.players.length === 2) {
            console.log(`Two players in room ${roomId}. Starting quiz...`);
            room.quizStarted = true;
            io.to(roomId).emit('start-quiz', {
                players: room.players,
                currentQuestion: room.questions[room.currentQuestionIndex],
                totalQuestions: room.questions.length
            });
        }
    });

    socket.on('submit-answer', ({ roomId, playerId, answerIndex }) => {
        const room = rooms[roomId];
        if (!room || !room.quizStarted) return;

        const currentQuestion = room.questions[room.currentQuestionIndex];
        if (answerIndex === currentQuestion.correctAnswerIndex) {
            if (!currentQuestion.answeredBy || !currentQuestion.answeredBy.includes(playerId)) {
                room.scores[playerId]++;
                if (!currentQuestion.answeredBy) {
                    currentQuestion.answeredBy = [];
                }
                currentQuestion.answeredBy.push(playerId);
                console.log(`${room.players.find(p => p.id === playerId).nickname} got a point in room ${roomId}! Score: ${room.scores[playerId]}`);
            }
        }

        const playersAnswered = room.players.filter(p => currentQuestion.answeredBy && currentQuestion.answeredBy.includes(p.id)).length;
        if (playersAnswered === room.players.length || room.players.length === 1) {
            setTimeout(() => {
                room.currentQuestionIndex++;
                if (room.currentQuestionIndex < room.questions.length) {
                    io.to(roomId).emit('next-question', {
                        currentQuestion: room.questions[room.currentQuestionIndex],
                        currentQuestionIndex: room.currentQuestionIndex,
                        scores: room.scores
                    });
                } else {
                    io.to(roomId).emit('game-over', { scores: room.scores, players: room.players });
                    delete rooms[roomId];
                }
            }, 2000);
        }
        io.to(roomId).emit('update-score', room.scores);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const disconnectedPlayer = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                delete room.scores[socket.id];

                io.to(roomId).emit('player-left', { playerId: socket.id, nickname: disconnectedPlayer.nickname, players: room.players });

                if (room.players.length === 0) {
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted as it's empty.`);
                } else if (room.quizStarted && room.players.length === 1) {
                    io.to(roomId).emit('game-over', { scores: room.scores, players: room.players, message: `${disconnectedPlayer.nickname} left the game.` });
                    delete rooms[roomId];
                    console.log(`Room ${roomId} deleted due to player leaving during quiz.`);
                }
                break;
            }
        }
    });
});

function generateQuizQuestions() {
    return [
        {
            question: "What is the capital of France?",
            options: ["Berlin", "Madrid", "Paris", "Rome"],
            correctAnswerIndex: 2
        },
        {
            question: "Which planet is known as the Red Planet?",
            options: ["Earth", "Mars", "Jupiter", "Venus"],
            correctAnswerIndex: 1
        },
        {
            question: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctAnswerIndex: 1
        },
        {
            question: "Who painted the Mona Lisa?",
            options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
            correctAnswerIndex: 2
        },
        {
            question: "What is the largest ocean on Earth?",
            options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
            correctAnswerIndex: 3
        }
    ];
}

module.exports = (req, res) => {
    httpServer.emit('request', req, res);
};
