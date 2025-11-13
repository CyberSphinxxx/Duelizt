Create a React app called "Duelizt" — a 1v1 quiz game where users can challenge friends via an invite link.

Core features:
1. **Home Screen**:
   - User enters a nickname.
   - Option to either “Create Duel” or “Join Duel”.
   - If creating a duel, generate a unique room ID (e.g., UUID or short hash).
   - Show a shareable invite link like `https://duelizt.app/join/<roomId>`.

2. **Join Screen**:
   - User enters a nickname and the room ID (auto-filled if joined via link).
   - Once both players are connected, the duel starts automatically.

3. **Quiz Screen**:
   - Fetch random quiz questions (multiple-choice, from a static JSON or API like Open Trivia DB).
   - Both players see the same questions.
   - Players answer simultaneously — first correct answer gets a point.
   - Display current scores and question progress.
   - Use simple WebSocket (or Socket.IO) communication for real-time updates.

4. **Result Screen**:
   - Show winner, final scores, and an option to play again or return to home.

Technical stack:
- React (Vite or Create React App)
- React Router for page navigation
- Socket.IO for real-time 1v1 interaction
- Simple in-memory room management (server)
- Basic CSS or Tailwind for styling

Server setup:
- Use Node.js with Express + Socket.IO.
- Endpoints:
  - `/create-room` — generates and returns a room ID.
  - `/join-room/:id` — joins a room and waits for both players.
  - WebSocket events:
    - `player-joined`
    - `start-quiz`
    - `submit-answer`
    - `update-score`
    - `game-over`

Extra details:
- Keep UI clean and minimal — similar to Kahoot’s simplicity.
- Add a “Waiting for opponent…” screen before quiz starts.
- Ensure game sync even if one player answers first.

Generate the full project structure with clear comments in the code:
- `/client` (React)
- `/server` (Node.js)
Each part should be well-documented and ready to run with `npm start` or `npm run dev`.
