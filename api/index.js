const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { kv } = require('@vercel/kv');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.json());

app.post('/api/create-room', async (req, res) => {
    const roomId = uuidv4().substring(0, 8);
    const room = {
        roomId,
        players: [],
        quizStarted: false,
        currentQuestionIndex: 0,
        scores: {},
        questions: generateQuizQuestions()
    };
    await kv.set(roomId, room);
    console.log(`Room ${roomId} created.`);
    res.json({ roomId });
});

app.get('/api/join-room/:roomId', async (req, res) => {
    const { roomId } = req.params;
    const room = await kv.get(roomId);
    if (room) {
        res.status(200).send({ message: `Room ${roomId} exists.` });
    } else {
        res.status(404).send({ message: `Room ${roomId} not found.` });
    }
});

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-duel', async ({ roomId, nickname }) => {
        let room = await kv.get(roomId);
        if (!room) {
            socket.emit('room-not-found');
            return;
        }

        if (room.players.length >= 2) {
            socket.emit('room-full');
            return;
        }

        const player = { id: socket.id, nickname };
        room.players.push(player);
        room.scores[socket.id] = 0;
        await kv.set(roomId, room);
        socket.join(roomId);

        console.log(`${nickname} (${socket.id}) joined room ${roomId}. Players: ${room.players.length}`);

        io.to(roomId).emit('player-joined', room.players);

        if (room.players.length === 2) {
            console.log(`Two players in room ${roomId}. Starting quiz...`);
            room.quizStarted = true;
            await kv.set(roomId, room);
            io.to(roomId).emit('start-quiz', {
                players: room.players,
                currentQuestion: room.questions[room.currentQuestionIndex],
                totalQuestions: room.questions.length
            });
        }
    });

    socket.on('submit-answer', async ({ roomId, playerId, answerIndex }) => {
        let room = await kv.get(roomId);
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
            setTimeout(async () => {
                room.currentQuestionIndex++;
                if (room.currentQuestionIndex < room.questions.length) {
                    io.to(roomId).emit('next-question', {
                        currentQuestion: room.questions[room.currentQuestionIndex],
                        currentQuestionIndex: room.currentQuestionIndex,
                        scores: room.scores
                    });
                } else {
                    io.to(roomId).emit('game-over', { scores: room.scores, players: room.players });
                    await kv.del(roomId);
                }
                await kv.set(roomId, room);
            }, 2000);
        }
        io.to(roomId).emit('update-score', room.scores);
        await kv.set(roomId, room);
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        // This is more complex with a KV store, as we need to iterate through all rooms.
        // For now, we'll leave this as a potential improvement.
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