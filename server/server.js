// 폐교 NIGHTMARE — 온라인 멀티플레이 방 서버
//
// 하는 일은 단순하다: 방을 만들고(코드 4글자), 같은 방 사람들끼리 메시지를 중계한다.
// 게임 판정(괴물 AI·퍼즐 상태)은 방장 클라이언트가 맡고, 서버는 방장이 나가면 다음 사람에게 넘긴다.
//
//   PORT=8787 node server.js
//
// 클라이언트 → 서버
//   {t:"create", name}            방 만들기 → {t:"joined", room, id, hostId, players}
//   {t:"join", room, name}        참가      → {t:"joined", ...} 또는 {t:"error", s}
//   {t:"start", s}                (방장) 시작 → 모두에게 {t:"start", s}
//   {t:"leave"}                   방 나가기
//   그 밖의 모든 메시지            같은 방의 다른 사람들에게 from(보낸 사람 id)을 붙여 중계
// 서버 → 클라이언트
//   {t:"players", players, hostId} 방 사람 목록이 바뀔 때
//   {t:"left", id}                누가 나갔을 때

const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const MAX_PLAYERS = 4;
const MAX_MSG = 4096;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외

const rooms = new Map(); // code → { code, players: Map<id, ws>, host, started }
let nextId = 1;

function makeCode() {
  for (;;) {
    let c = "";
    for (let i = 0; i < 4; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(c)) return c;
  }
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function playerList(room) {
  return [...room.players.values()].map((w) => ({ id: w.id, name: w.name, host: w.id === room.host }));
}

function broadcast(room, msg, exceptId) {
  const s = JSON.stringify(msg);
  for (const w of room.players.values()) if (w.id !== exceptId && w.readyState === w.OPEN) w.send(s);
}

function announce(room) {
  broadcast(room, { t: "players", players: playerList(room), hostId: room.host });
}

function cleanName(n) {
  n = String(n || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 8);
  return n || "손님";
}

function leave(ws) {
  const room = ws.room && rooms.get(ws.room);
  ws.room = null;
  if (!room) return;
  room.players.delete(ws.id);
  if (room.players.size === 0) { rooms.delete(room.code); return; }
  broadcast(room, { t: "left", id: ws.id });
  if (room.host === ws.id) room.host = Math.min(...room.players.keys());
  announce(room);
}

function join(ws, room, name) {
  if (ws.room) leave(ws);
  ws.name = cleanName(name);
  ws.room = room.code;
  room.players.set(ws.id, ws);
  send(ws, { t: "joined", room: room.code, id: ws.id, hostId: room.host, players: playerList(room) });
  announce(room);
}

const server = http.createServer((req, res) => {
  // 상태 확인용 (도메인에 올린 뒤 https://도메인/health 로 살아 있는지 볼 수 있다)
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });

wss.on("connection", (ws) => {
  ws.id = nextId++;
  ws.name = "손님";
  ws.room = null;
  ws.alive = true;
  ws.on("pong", () => (ws.alive = true));

  ws.on("message", (data) => {
    let m;
    try { m = JSON.parse(data); } catch { return; }
    if (!m || typeof m.t !== "string") return;
    const room = ws.room && rooms.get(ws.room);

    switch (m.t) {
      case "create": {
        const code = makeCode();
        const r = { code, players: new Map(), host: ws.id, started: false };
        rooms.set(code, r);
        join(ws, r, m.name);
        return;
      }
      case "join": {
        const r = rooms.get(String(m.room || "").toUpperCase().trim());
        if (!r) return send(ws, { t: "error", s: "그런 방이 없습니다." });
        if (r.started) return send(ws, { t: "error", s: "이미 시작한 방입니다." });
        if (r.players.size >= MAX_PLAYERS) return send(ws, { t: "error", s: `방이 가득 찼습니다. (최대 ${MAX_PLAYERS}명)` });
        join(ws, r, m.name);
        return;
      }
      case "start": {
        if (!room || room.host !== ws.id) return;
        room.started = true;
        broadcast(room, { t: "start", s: String(m.s || "") });
        return;
      }
      case "leave":
        leave(ws);
        return;
      default: {
        // 게임 메시지 중계 (위치·문·아이템·괴물 등)
        if (!room) return;
        m.from = ws.id;
        broadcast(room, m, ws.id);
      }
    }
  });

  ws.on("close", () => leave(ws));
});

// 끊긴 연결 정리
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    ws.ping();
  }
}, 15000);

server.listen(PORT, () => console.log(`[nightmare] 방 서버 ws://localhost:${PORT}`));
