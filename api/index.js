import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Redis } from '@upstash/redis';

// --- Redis Client Setup ---
// Check for multiple possible ENV var names from Vercel integrations
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
let redis;

if (redisUrl) {
    redis = new Redis({
        url: redisUrl,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

// --- Express App and HTTP Server Setup ---
const app = express();
const httpServer = createServer(app);

// --- Socket.IO Server Setup ---
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Middleware ---
app.use(express.json());

// --- API Routes ---
app.post('/api/create-room', async (req, res) => {
    // **Critical Check:** Ensure Redis is connected before proceeding.
    if (!redis) {
        console.error("FATAL: Redis connection not established. Check environment variables.");
        return res.status(500).json({ message: "Database connection not configured." });
    }

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
        await redis.set(roomId, room);
        console.log(`Room ${roomId} created successfully.`);
        res.status(200).json({ roomId });
    } catch (error) {
        console.error("Error in /api/create-room:", error);
        res.status(500).json({ message: "Failed to create room.", error: error.message });
    }
});

// ... (other routes and socket handlers will also benefit from the `!redis` check, but let's fix the entry point first)
io.on('connection', (socket) => {
    if (!redis) {
        console.error("Socket connection attempt failed: Redis not connected.");
        return;
    }
    console.log('Client connected:', socket.id);

    socket.on('join-duel', async ({ roomId, nickname, isCreator }) => {
        try {
            let room = await redis.get(roomId);
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
            await redis.set(roomId, room);
            socket.join(roomId);
            io.to(roomId).emit('player-update', room.players);
        } catch (error) {
            console.error("Error in join-duel:", error);
        }
    });

    // ... (rest of the socket handlers)
});


// --- Quiz Questions ---
function generateQuizQuestions() {
    return [
        { question: "What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correctAnswerIndex: 2 },
        { question: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Venus"], correctAnswerIndex: 1 },
    ];
}

// --- Vercel Serverless Function Handler ---
export default function handler(req, res) {
    // **Critical Check:** Ensure Redis URL was found at startup.
    if (!redisUrl) {
        console.error("FATAL: Redis connection URL not found in environment variables.");
        return res.status(500).json({ message: "Redis connection URL not found in environment variables." });
    }
    httpServer.emit('request', req, res);
}