// 렌더링: 장면 배경, 오브젝트, 캐릭터, 그것. 전부 캔버스 도형으로 그린다.
// 모든 함수는 월드 좌표(높이 540)로 그리며, 변환은 game.js가 걸어 준다.
(() => {
  'use strict';
  const GAME = window.GAME;
  const R = (GAME.R = {});

  const CEIL = 36;
  const FLOOR = (R.FLOOR = 450);
  const FEET = (R.FEET = 482);
  const SOFT = '"Nanum Myeongjo", serif';
  const HAND = '"East Sea Dokdo", cursive';
  const MONO = '"Nanum Gothic Coding", monospace';

  const PAL = {
    corridor:  { wall: '#4a4c44', wain: '#2d3c32', floor: '#3a2c21', ceil: '#141412' },
    classroom: { wall: '#55524a', wain: '#4a3726', floor: '#3d2e22', ceil: '#151412' },
    office:    { wall: '#4d4c46', wain: '#3a342b', floor: '#34302a', ceil: '#131311' },
    nurse:     { wall: '#5a5d58', wain: '#46504c', floor: '#3a3935', ceil: '#141514' },
    toilet:    { wall: '#596059', wain: '#3f4a46', floor: '#2f3336', ceil: '#121414' },
    music:     { wall: '#4d443e', wain: '#3c2a22', floor: '#382a20', ceil: '#141110' },
    storage:   { wall: '#3c3832', wain: '#2d2822', floor: '#2a221b', ceil: '#100e0c' },
  };

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function rng(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  function strokeRect(c, x, y, w, h, col, lw = 2) { c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(x, y, w, h); }
  function text(c, str, x, y, size, col, font = SOFT, align = 'center') {
    c.font = `${size}px ${font}`;
    c.fillStyle = col;
    c.textAlign = align;
    c.textBaseline = 'middle';
    c.fillText(str, x, y);
  }

  // ───────── 벽 / 바닥 ─────────

  function drawShell(c, sc, x0, x1) {
    const p = PAL[sc.kind];
    const w = sc.width;
    rect(c, 0, 0, w, CEIL, p.ceil);
    const g = c.createLinearGradient(0, CEIL, 0, 330);
    g.addColorStop(0, shade(p.wall, 0.55));
    g.addColorStop(1, p.wall);
    rect(c, 0, CEIL, w, 330 - CEIL, g);

    if (sc.kind === 'toilet') { // 타일
      c.strokeStyle = 'rgba(0,0,0,.18)';
      c.lineWidth = 1;
      for (let y = CEIL + 30; y < FLOOR; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      for (let x = 0; x < w; x += 30) { c.beginPath(); c.moveTo(x, CEIL); c.lineTo(x, FLOOR); c.stroke(); }
    }

    rect(c, 0, 330, w, FLOOR - 330, p.wain);
    rect(c, 0, 326, w, 6, shade(p.wain, 0.6));
    rect(c, 0, FLOOR - 8, w, 8, '#151210');

    // 바닥: 아래로 갈수록 넓어지는 판자
    const fg = c.createLinearGradient(0, FLOOR, 0, 540);
    fg.addColorStop(0, shade(p.floor, 0.7));
    fg.addColorStop(1, p.floor);
    rect(c, 0, FLOOR, w, 90, fg);
    c.strokeStyle = 'rgba(0,0,0,.35)';
    c.lineWidth = 1;
    let y = FLOOR + 6, step = 6;
    while (y < 540) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); step *= 1.35; y += step; }

    // 얼룩
    const r = rng(hash(sc.name));
    for (let i = 0; i < w / 90; i++) {
      const sx = r() * w, sy = CEIL + r() * (FLOOR - CEIL - 40);
      if (sx < x0 - 120 || sx > x1 + 120) { r(); r(); continue; }
      const rad = 16 + r() * 50;
      c.beginPath();
      c.ellipse(sx, sy, rad * 0.7, rad, 0, 0, Math.PI * 2);
      c.fillStyle = 'rgba(15,11,7,.22)';
      c.fill();
      if (r() < 0.4) rect(c, sx - 1, sy, 2, 40 + r() * 90, 'rgba(25,15,8,.3)');
    }

    // 천장 형광등 틀
    for (let lx = 200; lx < w; lx += 400) rect(c, lx - 40, CEIL, 80, 7, '#2a2a27');
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.round(v * k);
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  function drawWindow(c, x, kind, broken) {
    const w = kind === 'corridor' ? 150 : 170;
    const top = kind === 'corridor' ? 70 : 84, h = kind === 'corridor' ? 120 : 170;
    rect(c, x - w / 2 - 6, top - 6, w + 12, h + 12, '#1d1d1a');
    const g = c.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, '#2c3a52');
    g.addColorStop(1, '#1a2333');
    rect(c, x - w / 2, top, w, h, g);
    // 달
    if (broken) {
      c.beginPath();
      c.moveTo(x - 20, top); c.lineTo(x + 30, top + h * 0.4); c.lineTo(x - 5, top + h * 0.55);
      c.lineTo(x + 20, top + h); c.lineTo(x - w / 2, top + h); c.lineTo(x - w / 2, top);
      c.fillStyle = '#05070b';
      c.fill();
    }
    rect(c, x - 3, top, 6, h, '#1d1d1a');
    rect(c, x - w / 2, top + h / 2 - 3, w, 6, '#1d1d1a');
  }

  function moonOnFloor(c, x) {
    c.beginPath();
    c.moveTo(x - 70, FLOOR); c.lineTo(x + 70, FLOOR); c.lineTo(x + 130, 540); c.lineTo(x - 10, 540);
    c.fillStyle = 'rgba(120,140,180,.08)';
    c.fill();
  }

  // ───────── 오브젝트 그림 ─────────

  function door(c, x, label, opts = {}) {
    rect(c, x - 66, 200, 132, 250, '#1c1611');
    for (const s of [-1, 1]) {
      const px = x + (s < 0 ? -62 : 2);
      rect(c, px, 206, 60, 244, opts.room ? '#4f3b2a' : '#5a4330');
      rect(c, px + 10, 226, 40, 84, '#141a20');
      strokeRect(c, px + 10, 226, 40, 84, '#2a2018', 3);
      rect(c, px + (s < 0 ? 50 : 4), 330, 6, 22, '#2a2018');
    }
    if (label) {
      c.save();
      c.translate(x - 40, 168);
      if (opts.crooked) c.rotate(0.12);
      rect(c, 0, 0, 80, 26, label === '화장실' ? '#9fb2bb' : '#cfc7b3');
      strokeRect(c, 0, 0, 80, 26, '#3a342b', 2);
      c.font = `800 15px ${SOFT}`;
      c.fillStyle = opts.crooked ? '#7a1a14' : '#222';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(label, 40, 14);
      c.restore();
    }
  }

  function locker(c, x) {
    rect(c, x - 34, 258, 68, 192, '#363e43');
    strokeRect(c, x - 34, 258, 68, 192, '#1f2427', 2);
    rect(c, x - 1, 258, 2, 192, '#1f2427');
    for (let i = 0; i < 4; i++) { rect(c, x - 26, 274 + i * 8, 18, 3, '#1a1e21'); rect(c, x + 8, 274 + i * 8, 18, 3, '#1a1e21'); }
    rect(c, x - 8, 350, 4, 16, '#8a9196');
    rect(c, x + 4, 350, 4, 16, '#8a9196');
  }

  function cabinet(c, x) {
    rect(c, x - 30, 268, 60, 182, '#47503f');
    strokeRect(c, x - 30, 268, 60, 182, '#262b22', 2);
    for (let i = 0; i < 3; i++) rect(c, x - 20, 284 + i * 8, 40, 3, '#262b22');
    rect(c, x - 18, 320, 36, 16, '#c9c1ac');
    text(c, '청소함', x, 329, 11, '#2a2a22', MONO);
    rect(c, x + 18, 360, 4, 18, '#9a9a8c');
  }

  function studentDesk(c, x, fallen) {
    c.save();
    if (fallen) { c.translate(x, FLOOR + 30); c.rotate(-1.35); c.translate(-x, -(FLOOR + 30)); }
    rect(c, x - 34, 392, 68, 8, '#7b5a3c');
    rect(c, x - 30, 400, 4, 58, '#55595a');
    rect(c, x + 26, 400, 4, 58, '#55595a');
    rect(c, x - 28, 402, 56, 14, '#5a4128');
    c.restore();
    if (!fallen) { // 의자
      rect(c, x + 44, 420, 34, 6, '#6d4f34');
      rect(c, x + 72, 372, 6, 50, '#6d4f34');
      rect(c, x + 46, 426, 3, 34, '#55595a');
      rect(c, x + 74, 426, 3, 34, '#55595a');
    }
  }

  function officeDesk(c, x) {
    rect(c, x - 80, 384, 160, 10, '#5d5a52');
    rect(c, x - 76, 394, 50, 62, '#4a4842');
    rect(c, x + 66, 394, 6, 62, '#3a3934');
    for (let i = 0; i < 3; i++) rect(c, x - 70, 400 + i * 18, 38, 2, '#2e2d29');
    rect(c, x + 10, 360, 44, 24, '#c9c2ad'); // 서류 더미
    rect(c, x + 14, 352, 38, 8, '#b7af98');
  }

  function bigDesk(c, x) {
    rect(c, x - 80, 376, 160, 12, '#6a5038');
    rect(c, x - 76, 388, 152, 64, '#4f3a28');
    rect(c, x - 46, 400, 92, 52, '#120e0a');
  }

  function bed(c, x) {
    rect(c, x - 90, 392, 180, 20, '#cfcabf');
    rect(c, x - 90, 384, 46, 10, '#e5e0d4');
    rect(c, x - 94, 412, 188, 6, '#6e7373');
    rect(c, x - 92, 380, 5, 78, '#6e7373');
    rect(c, x + 87, 396, 5, 62, '#6e7373');
  }

  function bedCurtain(c, x) {
    bed(c, x);
    rect(c, x - 110, 112, 220, 4, '#7a7f80');
    c.fillStyle = 'rgba(170,185,175,.85)';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      const cx = x - 110 + i * 22;
      c.moveTo(cx, 116); c.lineTo(cx + 22, 116);
      c.quadraticCurveTo(cx + 26, 300, cx + 20, 440); c.lineTo(cx - 2, 440);
      c.quadraticCurveTo(cx + 4, 300, cx, 116);
      c.fill();
      c.fillStyle = i % 2 ? 'rgba(170,185,175,.85)' : 'rgba(150,165,158,.85)';
    }
  }

  function stall(c, x, i) {
    rect(c, x - 82, 196, 8, 252, '#6b7570');
    rect(c, x - 70, 210, 140, 228, '#7e8a84');
    strokeRect(c, x - 70, 210, 140, 228, '#55605b', 2);
    rect(c, x + 48, 318, 10, 14, '#c7c9c2');
    text(c, String(i), x, 236, 14, '#3f4743', MONO);
  }

  function curtain(c, x) {
    rect(c, x - 90, 48, 180, 6, '#3a2a20');
    for (let i = 0; i < 7; i++) {
      c.fillStyle = i % 2 ? '#4a1414' : '#3b0f10';
      c.beginPath();
      const cx = x - 88 + i * 25;
      c.moveTo(cx, 54); c.lineTo(cx + 26, 54);
      c.quadraticCurveTo(cx + 34, 260, cx + 24, 452); c.lineTo(cx - 4, 452);
      c.quadraticCurveTo(cx + 6, 260, cx, 54);
      c.fill();
    }
  }

  function wardrobe(c, x, open) {
    rect(c, x - 80, 176, 160, 274, '#3b2718');
    strokeRect(c, x - 80, 176, 160, 274, '#1d130b', 3);
    rect(c, x - 90, 166, 180, 14, '#2b1c11');
    if (open) {
      rect(c, x - 74, 186, 148, 256, '#050403');
    } else {
      for (const s of [-1, 1]) {
        const px = x + (s < 0 ? -74 : 2);
        rect(c, px, 186, 72, 256, '#4a3220');
        strokeRect(c, px + 10, 200, 52, 100, '#2b1c11', 2);
        strokeRect(c, px + 10, 316, 52, 110, '#2b1c11', 2);
      }
      rect(c, x - 10, 300, 6, 26, '#b49a5a');
      rect(c, x + 4, 300, 6, 26, '#b49a5a');
      // 바깥에 걸린 걸쇠
      rect(c, x - 14, 290, 28, 6, '#8d7a4a');
    }
  }

  function stairs(c, x, dir) {
    rect(c, x - 82, 190, 164, 260, '#070707');
    c.strokeStyle = '#2b2b27';
    c.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const sx = dir === 'up' ? x - 70 + i * 18 : x + 70 - i * 18;
      const sy = dir === 'up' ? 440 - i * 28 : 230 + i * 28;
      c.beginPath(); c.moveTo(sx - 14, sy); c.lineTo(sx + 14, sy); c.stroke();
    }
    rect(c, x - 46, 156, 92, 26, '#1d5233');
    text(c, dir === 'up' ? '↑ 2층' : '↓ 1층', x, 170, 14, '#c9e8d3', MONO);
  }

  function frontdoor(c, x) {
    rect(c, x - 104, 170, 208, 280, '#232624');
    for (const s of [-1, 1]) {
      const px = x + (s < 0 ? -98 : 2);
      const g = c.createLinearGradient(0, 180, 0, 450);
      g.addColorStop(0, '#26364c'); g.addColorStop(1, '#141c28');
      rect(c, px, 180, 96, 266, g);
      strokeRect(c, px, 180, 96, 266, '#3a3e3c', 4);
    }
    c.strokeStyle = '#8a8a80'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 30, 300); c.quadraticCurveTo(x, 330, x + 30, 300); c.stroke();
    c.beginPath(); c.moveTo(x - 30, 316); c.quadraticCurveTo(x, 346, x + 30, 316); c.stroke();
    rect(c, x - 8, 318, 16, 22, '#6d6a5e');
    text(c, '현 관', x, 150, 14, '#7b776c', MONO);
  }

  function trophy(c, x) {
    rect(c, x - 60, 230, 120, 220, '#2a2016');
    rect(c, x - 52, 238, 104, 150, 'rgba(120,140,160,.25)');
    rect(c, x - 30, 300, 14, 40, '#9a8040'); rect(c, x - 36, 340, 26, 8, '#6a5530');
    rect(c, x + 8, 290, 28, 36, '#bcb6a4');
    rect(c, x - 52, 312, 104, 3, '#3a2c1e');
  }

  function poster(c, x) {
    rect(c, x - 34, 196, 68, 92, '#cfc6ad');
    text(c, '친구를', x, 222, 13, '#222');
    text(c, '소중히', x, 244, 13, '#222');
    rect(c, x - 24, 221, 48, 2, '#8a1a14');
    text(c, '술래', x + 4, 210, 18, '#8a1a14', HAND);
  }

  function phone(c, x, ringing, t) {
    const sh = ringing ? Math.sin(t * 60) * 1.5 : 0;
    rect(c, x - 22 + sh, 366, 44, 18, '#1b1b1a');
    rect(c, x - 26 + sh, 360, 52, 8, '#262624');
  }

  function keybox(c, x, hasKey) {
    rect(c, x - 32, 236, 64, 86, '#4a3b2a');
    strokeRect(c, x - 32, 236, 64, 86, '#251c12', 2);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const kx = x - 22 + j * 15, ky = 254 + i * 22;
      rect(c, kx, ky, 2, 4, '#8a8578');
      if (i === 1 && j === 2 && !hasKey) continue;
      if ((i + j) % 3 !== 0) { rect(c, kx - 2, ky + 4, 6, 10, '#a39368'); }
    }
  }

  function podium(c, x) {
    rect(c, x - 48, 360, 96, 10, '#6e5236');
    rect(c, x - 42, 370, 84, 82, '#5a412b');
    rect(c, x - 30, 384, 60, 54, '#4a3524');
  }

  function blackboard(c, x, w, lines) {
    rect(c, x - w / 2 - 10, 116, w + 20, 206, '#4a3622');
    rect(c, x - w / 2, 124, w, 190, '#1f2e26');
    rect(c, x - w / 2, 314, w, 8, '#5a4128');
    (lines || []).forEach((l, i) => text(c, l, x, 170 + i * 52, 40, 'rgba(225,225,215,.75)', HAND));
  }

  function mirror(c, x, w) {
    rect(c, x - w / 2, 214, w, 112, '#8f9494');
    const g = c.createLinearGradient(x - w / 2, 220, x + w / 2, 320);
    g.addColorStop(0, '#5b6466'); g.addColorStop(1, '#2c3233');
    rect(c, x - w / 2 + 5, 219, w - 10, 102, g);
  }

  function sink(c, x) {
    mirror(c, x, 120);
    rect(c, x - 70, 360, 140, 18, '#b8bbb5');
    rect(c, x - 40, 378, 80, 20, '#9a9d97');
    rect(c, x - 4, 342, 8, 18, '#8a8d88');
  }

  function piano(c, x) {
    rect(c, x - 92, 300, 184, 150, '#16100c');
    rect(c, x - 92, 296, 184, 8, '#2a1f17');
    rect(c, x - 84, 372, 168, 18, '#d9d4c6');
    for (let k = 0; k < 24; k++) rect(c, x - 84 + k * 7, 372, 1, 18, '#3a3630');
    for (let k = 0; k < 24; k++) if (k % 7 !== 2 && k % 7 !== 6) rect(c, x - 81 + k * 7, 372, 4, 10, '#111');
    rect(c, x - 84 + 9 * 7, 374, 7, 18, '#a8a294'); // 눌린 건반
  }

  function lockers(c, x, w) {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
      const lx = x - w / 2 + i * (w / 6), ly = 300 + j * 50;
      rect(c, lx + 2, ly, w / 6 - 4, 46, '#6a5440');
      rect(c, lx + 8, ly + 6, 16, 6, '#3a2c20');
    }
  }

  function portrait(c, x, t, eyes) {
    rect(c, x - 34, 96, 68, 86, '#4a3620');
    rect(c, x - 28, 102, 56, 74, '#2a2420');
    c.fillStyle = '#5a5046';
    c.beginPath(); c.ellipse(x, 130, 14, 17, 0, 0, Math.PI * 2); c.fill();
    rect(c, x - 20, 150, 40, 26, '#3a332d');
    if (eyes) { // 눈이 따라온다
      const look = Math.max(-2, Math.min(2, eyes));
      rect(c, x - 6 + look, 128, 3, 2, '#111');
      rect(c, x + 3 + look, 128, 3, 2, '#111');
    }
  }

  function stand(c, x) {
    rect(c, x - 2, 340, 4, 112, '#2a2a2a');
    rect(c, x - 26, 320, 52, 26, '#333');
    rect(c, x - 14, 450, 28, 3, '#2a2a2a');
  }

  function shelf(c, x) {
    rect(c, x - 60, 170, 120, 280, '#2d241c');
    for (let i = 0; i < 4; i++) {
      rect(c, x - 56, 220 + i * 60, 112, 6, '#1a140f');
      rect(c, x - 50 + (i * 17) % 30, 186 + i * 60, 40, 34, '#5a4a36');
      rect(c, x + 2, 196 + i * 60, 30, 24, '#4a3f30');
    }
  }

  function instrumentCase(c, x) {
    c.fillStyle = '#1f1a16';
    c.beginPath();
    c.ellipse(x, 410, 22, 40, 0.15, 0, Math.PI * 2);
    c.fill();
    rect(c, x - 6, 300, 12, 80, '#1f1a16');
  }

  function fileCab(c, x) {
    rect(c, x - 34, 240, 68, 210, '#55595a');
    for (let i = 0; i < 4; i++) { strokeRect(c, x - 30, 246 + i * 50, 60, 46, '#3a3e3f', 2); rect(c, x - 10, 266 + i * 50, 20, 4, '#9a9e9f'); }
  }

  function smallDesk(c, x) {
    rect(c, x - 44, 388, 88, 8, '#7b6a52');
    rect(c, x - 40, 396, 4, 58, '#55595a');
    rect(c, x + 36, 396, 4, 58, '#55595a');
  }

  function medcab(c, x) {
    rect(c, x - 40, 250, 80, 200, '#c7cac4');
    strokeRect(c, x - 40, 250, 80, 200, '#80847f', 2);
    rect(c, x - 34, 258, 68, 90, 'rgba(120,140,150,.35)');
    rect(c, x - 6, 270, 12, 4, '#b3261e'); rect(c, x - 2, 266, 4, 12, '#b3261e');
  }

  // 아이템이 놓인 표면의 윗면 높이
  const SURFACE_Y = { floor: FEET - 6, desk: 390, officeDesk: 382, podium: 358, smallDesk: 386, medcab: 346, keybox: 290, stand: 318 };

  function surface(c, kind, x) {
    if (kind === 'desk') studentDesk(c, x, false);
    else if (kind === 'officeDesk') officeDesk(c, x);
    else if (kind === 'podium') podium(c, x);
    else if (kind === 'smallDesk') smallDesk(c, x);
    else if (kind === 'medcab') medcab(c, x);
    else if (kind === 'stand') stand(c, x);
  }

  function itemArt(c, o, y) {
    if (o.type === 'note') {
      c.save(); c.translate(o.x, y - 2); c.rotate(-0.08);
      rect(c, -14, -4, 28, 6, '#d8d0bb'); c.restore();
      if (o.flower) { // 말라 버린 국화
        rect(c, o.x + 20, y - 34, 2, 32, '#5a5a3a');
        c.fillStyle = '#b9a873'; c.beginPath(); c.arc(o.x + 21, y - 36, 6, 0, Math.PI * 2); c.fill();
      }
    } else if (o.item === 'battery') {
      rect(c, o.x - 10, y - 8, 20, 8, '#2f6a3a'); rect(c, o.x + 10, y - 6, 3, 4, '#aaa');
    } else if (o.item === 'roster') {
      c.save(); c.translate(o.x, y - 4); c.rotate(-0.05);
      rect(c, -20, -6, 40, 8, '#2d3f6a'); rect(c, -20, 0, 40, 2, '#d8d0bb'); c.restore();
    } else if (o.item === 'key23' || o.item === 'keyMusic') {
      rect(c, o.x - 3, y - 10, 6, 12, '#c8b26a');
    }
  }

  R.surfaceY = o => (o.surface === 'keybox' ? SURFACE_Y.keybox + 6 : SURFACE_Y[o.surface || 'floor']);

  // 오브젝트의 상호작용 표시 높이
  R.promptY = o => {
    if (o.type === 'item' || o.type === 'note') return R.surfaceY(o) - 34;
    if (o.art === 'blackboard') return 100;
    if (o.art === 'locker' || o.art === 'cabinet') return 236;
    if (o.type === 'door' || o.type === 'stairs' || o.art === 'door') return 146;
    if (o.type === 'wardrobe') return 150;
    if (o.art === 'frontdoor') return 128;
    return 200;
  };

  R.scene = function (c, sc, x0, x1, G) {
    drawShell(c, sc, x0, x1);
    const r = rng(hash(sc.name + 'w'));
    (sc.windows || []).forEach(wx => { const broken = r() < 0.25; if (wx > x0 - 200 && wx < x1 + 200) drawWindow(c, wx, sc.kind, broken); });

    if (sc.lamp) {
      const on = G.lampOn;
      rect(c, sc.lamp - 50, CEIL, 100, 9, on ? '#e8f0dd' : '#3a3a36');
    }

    (sc.deco || []).forEach(d => {
      if (d.x < x0 - 200 || d.x > x1 + 200) return;
      if (d.t === 'portrait') portrait(c, d.x, G.time, G.scene === 'music' && G.ghost.active ? (G.player.x - d.x) / 80 : 0);
    });

    const objs = sc.objects;
    for (const o of objs) {
      if (o.x < x0 - 250 || o.x > x1 + 250) continue;
      const taken = G.flags.has('took:' + o.id);
      switch (o.art || o.type) {
        case 'door': door(c, o.x, o.label, { crooked: o.crooked }); break;
        case 'roomdoor': door(c, o.x, null, { room: true }); break;
        case 'stairs': stairs(c, o.x, o.dir); break;
        case 'frontdoor': frontdoor(c, o.x); break;
        case 'trophy': trophy(c, o.x); break;
        case 'poster': poster(c, o.x); break;
        case 'blackboard': blackboard(c, o.x, o.w, G.ghost.active && o.chalkAfter ? o.chalkAfter : o.chalk); break;
        case 'mirror': mirror(c, o.x, o.w); break;
        case 'sink': sink(c, o.x); break;
        case 'lockers': lockers(c, o.x, o.w); break;
        case 'stall': stall(c, o.x, objs.filter(s => s.art === 'stall').indexOf(o) + 1); break;
        default: break;
      }
      if (o.type === 'item' && o.surface === 'keybox') keybox(c, o.x, !taken);
    }

    // 벽에서 떨어진 가구들 (앞쪽)
    (sc.deco || []).forEach(d => {
      if (d.x < x0 - 200 || d.x > x1 + 200) return;
      if (d.t === 'desk') studentDesk(c, d.x, d.fallen);
      else if (d.t === 'officeDesk') officeDesk(c, d.x);
      else if (d.t === 'fileCab') fileCab(c, d.x);
      else if (d.t === 'bed') bed(c, d.x);
      else if (d.t === 'stand') stand(c, d.x);
      else if (d.t === 'shelf') shelf(c, d.x);
      else if (d.t === 'case') instrumentCase(c, d.x);
    });

    for (const o of objs) {
      if (o.x < x0 - 250 || o.x > x1 + 250) continue;
      const taken = G.flags.has('took:' + o.id);
      switch (o.art || o.type) {
        case 'locker': locker(c, o.x); break;
        case 'cabinet': cabinet(c, o.x); break;
        case 'bigdesk': bigDesk(c, o.x); break;
        case 'bedCurtain': bedCurtain(c, o.x); break;
        case 'curtain': curtain(c, o.x); break;
        case 'piano': piano(c, o.x); break;
        case 'phone': phone(c, o.x, G.phoneRinging, G.time); break;
        case 'wardrobe': wardrobe(c, o.x, G.flags.has('wardrobe')); break;
        default: break;
      }
      if ((o.type === 'item' || o.type === 'note') && o.surface && o.surface !== 'floor' && o.surface !== 'keybox') {
        if (!(sc.deco || []).some(d => d.t === o.surface && d.x === o.x)) surface(c, o.surface, o.x);
      }
      if ((o.type === 'item' || o.type === 'note') && !taken && o.surface !== 'keybox') itemArt(c, o, R.surfaceY(o));
    }

    (sc.windows || []).forEach(wx => { if (wx > x0 - 200 && wx < x1 + 200) moonOnFloor(c, wx); });
  };

  // 앞을 지나가는 기둥 (시차)
  R.foreground = function (c, sc, camX, x0, x1) {
    if (sc.kind !== 'corridor') return;
    const off = camX * 0.35;
    for (let px = 300; px < sc.width + 600; px += 620) {
      const x = px - off;
      if (x < x0 - 100 || x > x1 + 100) continue;
      rect(c, x - 40, 0, 80, 540, '#040404');
      rect(c, x + 36, 0, 4, 540, 'rgba(60,60,55,.25)');
    }
  };

  // ───────── 인물 ─────────

  R.player = function (c, p) {
    const sw = p.moving ? Math.sin(p.step) * (p.running ? 0.75 : 0.45) : 0;
    const bob = p.moving ? Math.abs(Math.sin(p.step)) * 2 : 0;
    c.save();
    c.translate(p.x, FEET - bob);
    c.scale(p.dir, 1);
    const leg = (lx, a) => { c.save(); c.translate(lx, -46); c.rotate(a); rect(c, -4, 0, 8, 46, '#1b1d24'); rect(c, -4, 42, 12, 5, '#0d0d0f'); c.restore(); };
    leg(-3, sw); leg(4, -sw);
    // 뒤쪽 팔
    c.save(); c.translate(-6, -86); c.rotate(-sw * 0.8); rect(c, -3, 0, 6, 34, '#20232b'); c.restore();
    // 몸통 (교복 재킷)
    rect(c, -13, -92, 26, 48, '#262a33');
    rect(c, -2, -92, 4, 20, '#c8c2b4');
    // 머리
    c.fillStyle = '#c9b49a';
    c.beginPath(); c.arc(1, -103, 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#16120f';
    c.beginPath(); c.arc(-1, -106, 10.5, Math.PI * 0.9, Math.PI * 2.05); c.fill();
    rect(c, -11, -106, 6, 14, '#16120f');
    // 손전등 든 팔
    c.save(); c.translate(6, -84); c.rotate(-1.15 + (p.aim || 0)); rect(c, -3, 0, 6, 24, '#20232b'); rect(c, -4, 22, 8, 12, '#3a3a38'); c.restore();
    c.restore();
  };

  R.ghost = function (c, g, t, alpha) {
    if (alpha <= 0.01) return;
    const jx = Math.random() < 0.08 ? (Math.random() - 0.5) * 6 : 0;
    c.save();
    c.globalAlpha = alpha;
    c.translate(g.x + jx, FEET - 4 + Math.sin(t * 1.7) * 3);
    c.scale(g.dir, 1);
    rect(c, -7, -42, 4, 40, '#8f8d86');
    rect(c, 3, -42, 4, 40, '#8f8d86');
    c.fillStyle = '#16171c';
    c.beginPath(); c.moveTo(-20, -40); c.lineTo(20, -40); c.lineTo(14, -80); c.lineTo(-14, -80); c.fill();
    rect(c, -14, -122, 28, 44, '#b3b0a6');
    rect(c, -19, -120, 5, 90, '#a9a69c');
    rect(c, 14, -120, 5, 90, '#a9a69c');
    c.save();
    c.translate(2, -134);
    c.rotate(0.25 + (g.state === 'chase' ? Math.sin(t * 18) * 0.06 : 0));
    if (alpha > 0.3) { // 희미한 잔상에서는 얼굴을 그리지 않는다 (머리카락만 남는다)
      c.fillStyle = '#c2bfb5';
      c.beginPath(); c.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2); c.fill();
    }
    // 얼굴을 덮은 긴 머리카락 (뒤쪽으로 창백한 얼굴선만 보인다)
    c.fillStyle = '#050505';
    c.beginPath(); c.ellipse(3, -2, 13, 15, 0, 0, Math.PI * 2); c.fill();
    c.beginPath();
    c.moveTo(-8, -12); c.quadraticCurveTo(4, -22, 16, -6);
    c.lineTo(18, 50); c.lineTo(10, 42); c.lineTo(4, 58); c.lineTo(-2, 44); c.lineTo(-9, 52); c.lineTo(-10, 8);
    c.closePath();
    c.fill();
    c.restore();
    c.restore();
  };

  R.text = text;
  R.MONO = MONO;
  R.HAND = HAND;
})();
