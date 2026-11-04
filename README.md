# Amazing Taiwan — Live Word Hunt

Real-time classroom game with teacher-hosted rooms, QR join, tablet-friendly word boards, timed questions, and a shared scoreboard.

## Run locally

Install Node.js 18+, then run:

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser. For tablet access, deploy to a public Node.js host.

## Deploy on Render

1. Push the project folder to a GitHub repository.
2. In Render, create a **Web Service** from that repository.
3. Runtime: Node. Build command: `npm install`. Start command: `npm start`.
4. Open the provided HTTPS URL and click **Host a game**.
5. Display the room QR code on the projector; learners scan and join.

**Important:** This is a Node.js + Socket.IO app. Netlify Drop cannot host its real-time server. A free service may sleep when idle; wake it before class. Rooms and scores are kept in server memory and will reset on server restart. For a single classroom, use one server instance.

## Gameplay

The host sees the target word and reads it aloud. Students scan the printed travel blog and select the matching word from their tablet boards. The target is intentionally hidden from student screens. Each correct response earns 100 points plus up to 50 speed bonus points. Wrong answers score zero. Each student can answer only once per word. The next question is released by the host after reveal. A round ends after all words in the selected set.

## Teacher note

Word sets are editable in `server.js` under `WORDS`. Verify all words against the exact version of your class workbook before use. Current Blog Challenge vocabulary is a starter set, not a verified transcription of the uploaded page.

## Privacy and classroom use

Use student numbers or nicknames, not full names. No account or database is required. Anyone with the room code can join; keep the code within your class. The game is intended for supervised classroom use.
