# NIGHTMARE 온라인 방 서버

폐교 NIGHTMARE 모드(최대 4명 협동)의 방 서버입니다. 방을 만들고(네 글자 코드), 같은 방 사람들끼리 메시지를 중계합니다.
괴물과 퍼즐 상태는 방장 브라우저가 맡고, 방장이 나가면 다음 사람이 이어받습니다.

## 내 컴퓨터에서 실행

```bash
cd server
npm install
npm start          # ws://localhost:8787
```

게임을 `http://localhost:…` 로 열면 자동으로 `ws://localhost:8787` 에 접속합니다.

## 도메인에 올리기

게임 페이지(GitHub Pages)는 정적 파일만 올릴 수 있어서, 이 서버는 따로 띄워야 합니다.
Node 18 이상이 돌아가는 곳이면 어디든 됩니다 (VPS, Render, Fly.io, Railway 등).

1. 서버에 이 폴더를 올리고 `npm install && PORT=8787 npm start` 로 실행합니다 (pm2·systemd 등으로 계속 켜 두기).
2. 도메인을 연결하고 **HTTPS(wss)** 를 붙입니다. 게임 페이지가 https라서 서버도 반드시 `wss://` 여야 합니다.
   Caddy를 쓰면 설정 두 줄로 끝납니다:

   ```
   nightmare.내도메인.com {
       reverse_proxy localhost:8787
   }
   ```

3. 게임의 `index.html` 에서 서버 주소를 적습니다:

   ```js
   window.NIGHTMARE_SERVER = "wss://nightmare.내도메인.com";
   ```

4. `https://nightmare.내도메인.com/health` 가 `{"ok":true,...}` 를 돌려주면 서버가 살아 있는 것입니다.

주소창에 `?server=wss://…` 를 붙이면 index.html을 고치지 않고 다른 서버로 잠깐 접속해 볼 수 있습니다.

## 메시지

| 보내는 쪽 | 메시지 | 설명 |
| --- | --- | --- |
| 클라이언트 | `{t:"create", name}` | 방 만들기 → `joined` |
| 클라이언트 | `{t:"join", room, name}` | 코드로 참가 → `joined` 또는 `error` |
| 클라이언트 (방장) | `{t:"start", s}` | 시작 → 모두에게 `start` |
| 클라이언트 | 그 밖의 모든 메시지 | 같은 방 다른 사람에게 `from`을 붙여 중계 (위치 `p`, 괴물 `m`, 이벤트 `e`) |
| 서버 | `{t:"players", players, hostId}` | 방 사람이 바뀔 때 |
| 서버 | `{t:"left", id}` | 누가 나갔을 때 |
