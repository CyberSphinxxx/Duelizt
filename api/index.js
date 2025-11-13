import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';

// --- Redis Client Setup ---
// Upstash will provide REDIS_URL or similar env vars
const redis = new Redis(process.env.REDIS_URL);

// --- Express App and HTTP Server Setup ---
const app = express();
const httpServer = createServer(app);

// --- Socket.IO Server Setup ---
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Be more specific in production
        methods: ["GET", "POST"]
    }
});

// --- Middleware ---
app.use(express.json());

// --- API Routes ---
app.post('/api/create-room', async (req, res) => {
    try {
        const roomId = uuidv4().substring(0, 8);
        const room = {
            roomId,
            players: [],
            quizStarted: false,
            currentQuestionIndex: 0,
            scores: {},
            questions: generateQuizQuestions(),
            gameCreator: null
        };
        await redis.set(roomId, JSON.stringify(room));
        console.log(`Room ${roomId} created successfully.`);
        res.status(200).json({ roomId });
    } catch (error) {
        console.error("Error in /api/create-room:", error);
        res.status(500).json({ message: "Failed to create room.", error: error.message });
    }
});

app.get('/api/join-room/:roomId', async (req, res) => {
    try {
        const { roomId } = req.params;
        const roomString = await redis.get(roomId);
        if (roomString) {
            res.status(200).send({ message: `Room ${roomId} exists.` });
        } else {
            res.status(404).send({ message: `Room ${roomId} not found.` });
        }
    } catch (error) {
        console.error("Error in /api/join-room:", error);
        res.status(500).json({ message: "Failed to join room.", error: error.message });
    }
});


// --- Socket.IO Event Handlers ---
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-duel', async ({ roomId, nickname, isCreator }) => {
        try {
            let roomString = await redis.get(roomId);
            let room = roomString ? JSON.parse(roomString) : null;

            if (!room) {
                socket.emit('room-not-found');
                return;
            }
            if (room.players.length >= 2) {
                socket.emit('room-full');
                return;
            }
            const player = { id: socket.id, nickname, ready: isCreator };
            if (isCreator && !room.gameCreator) {
                room.gameCreator = socket.id;
            }
            room.players.push(player);
            room.scores[socket.id] = 0;
            await redis.set(roomId, JSON.stringify(room));
            socket.join(roomId);
            io.to(roomId).emit('player-update', room.players);
        } catch (error) {
            console.error("Error in join-duel:", error);
        }
    });

    socket.on('player-ready', async ({ roomId, playerId }) => {
        try {
            let roomString = await redis.get(roomId);
            let room = roomString ? JSON.parse(roomString) : null;
            if (!room) return;
            const player = room.players.find(p => p.id === playerId);
            if (player) {
                player.ready = true;
                await redis.set(roomId, JSON.stringify(room));
                io.to(roomId).emit('player-update', room.players);
            }
        } catch (error) {
            console.error("Error in player-ready:", error);
        }
    });

    socket.on('start-game', async ({ roomId }) => {
        try {
            let roomString = await redis.get(roomId);
            let room = roomString ? JSON.parse(roomString) : null;
            if (!room || room.quizStarted) return;
            room.quizStarted = true;
            await redis.set(roomId, JSON.stringify(room));
            io.to(roomId).emit('start-quiz', {
                players: room.players,
                currentQuestion: room.questions[room.currentQuestionIndex],
                totalQuestions: room.questions.length
            });
        } catch (error) {
            console.error("Error in start-game:", error);
        }
    });

    socket.on('submit-answer', async ({ roomId, playerId, answerIndex }) => {
        try {
            let roomString = await redis.get(roomId);
            let room = roomString ? JSON.parse(roomString) : null;
            if (!room || !room.quizStarted) return;

            const currentQuestion = room.questions[room.currentQuestionIndex];
            if (answerIndex === currentQuestion.correctAnswerIndex) {
                if (!currentQuestion.answeredBy || !currentQuestion.answeredBy.includes(playerId)) {
                    room.scores[playerId]++;
                    if (!currentQuestion.answeredBy) {
                        currentQuestion.answeredBy = [];
                    }
                    currentQuestion.answeredBy.push(playerId);
                }
            }

            const playersAnswered = room.players.filter(p => currentQuestion.answeredBy && currentQuestion.answeredBy.includes(p.id)).length;
            if (playersAnswered === room.players.length) {
                setTimeout(async () => {
                    room.currentQuestionIndex++;
                    await redis.set(roomId, JSON.stringify(room));
                    if (room.currentQuestionIndex < room.questions.length) {
                        io.to(roomId).emit('next-question', {
                            currentQuestion: room.questions[room.currentQuestionIndex],
                            currentQuestionIndex: room.currentQuestionIndex,
                            scores: room.scores
                        });
                    } else {
                        io.to(roomId).emit('game-over', { scores: room.scores, players: room.players });
                        await redis.del(roomId);
                    }
                }, 2000);
            }
            io.to(roomId).emit('update-score', room.scores);
            await redis.set(roomId, JSON.stringify(room));
        } catch (error) {
            console.error("Error in submit-answer:", error);
        }
    });

    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);
        // Simplified disconnect handling for Redis.
        // In a real-world scenario, you might want to track which room a socket belongs to more directly.
        // For now, we'll iterate through rooms to remove the player.
        try {
            const keys = await redis.keys('*'); // Get all room keys
            for (const key of keys) {
                let roomString = await redis.get(key);
                let room = roomString ? JSON.parse(roomString) : null;
                if (room && room.players) {
                    const playerIndex = room.players.findIndex(p => p.id === socket.id);
                    if (playerIndex !== -1) {
                        room.players.splice(playerIndex, 1);
                        if (room.players.length === 0) {
                            await redis.del(key); // Delete room if empty
                        } else {
                            await redis.set(key, JSON.stringify(room));
                            io.to(room.roomId).emit('player-update', room.players);
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error("Error during disconnect handling:", error);
        }
    });
});

// --- Quiz Questions ---
function generateQuizQuestions() {
    return [
        { question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correctAnswerIndex: 2 },
        { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Venus"], correctAnswerIndex: 1 },
        { question: "What is 2 + 2?", options: ["3", "4", "5", "6"], correctAnswerIndex: 1 },
        { question: "Who painted the Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], correctAnswerIndex: 2 },
        { question: "What is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], correctAnswerIndex: 3 }
    ];
}

// --- Vercel Serverless Function Handler ---
export default function handler(req, res) {
    httpServer.emit('request', req, res);
}
