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
    // 에피소드 2 · 백운호텔
    forest:    { wall: '#0e1422', wain: '#0e1422', floor: '#1d1f22', ceil: '#0a0e18' },
    lobby:     { wall: '#4a2627', wain: '#2b1d16', floor: '#3a3631', ceil: '#120d0c' },
    hotelHall: { wall: '#433d2b', wain: '#2a2018', floor: '#4a1d1d', ceil: '#110f0b' },
    room:      { wall: '#4b4438', wain: '#33281f', floor: '#3b2b2a', ceil: '#12100d' },
    kitchen:   { wall: '#565b58', wain: '#3c4341', floor: '#2c2f31', ceil: '#111313' },
    mgr:       { wall: '#3b2f28', wain: '#2a1f18', floor: '#30241b', ceil: '#100c0a' },
    basement:  { wall: '#3d3e3a', wain: '#2e2f2c', floor: '#242522', ceil: '#0e0e0d' },
    maze:      { wall: '#373935', wain: '#2a2c29', floor: '#21221f', ceil: '#0c0c0b' },
    boiler:    { wall: '#3f3c36', wain: '#2e2b26', floor: '#252320', ceil: '#0e0d0b' },
    burned:    { wall: '#251d17', wain: '#17110d', floor: '#1e1814', ceil: '#0b0807' },
    stairwell: { wall: '#474945', wain: '#373935', floor: '#2d2e2b', ceil: '#101010' },
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

  function drawShell(c, sc, x0, x1, G) {
    const p = PAL[sc.kind];
    const w = sc.width;
    if (sc.kind === 'forest') { drawForest(c, sc, x0, x1, G); return; }
    rect(c, 0, 0, w, CEIL, p.ceil);
    const g = c.createLinearGradient(0, CEIL, 0, 330);
    g.addColorStop(0, shade(p.wall, 0.55));
    g.addColorStop(1, p.wall);
    rect(c, 0, CEIL, w, 330 - CEIL, g);

    if (['lobby', 'hotelHall', 'room', 'mgr'].includes(sc.kind)) { // 벽지 줄무늬
      for (let x = 0; x < w; x += 26) rect(c, x, CEIL, 9, 330 - CEIL, 'rgba(0,0,0,.12)');
      rect(c, 0, 96, w, 4, 'rgba(0,0,0,.25)');
    }
    if (sc.kind === 'toilet' || sc.kind === 'kitchen') { // 타일
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
    if (sc.kind === 'lobby') { // 대리석 체크 무늬
      for (let x = 0; x < w; x += 60) for (let k = 0; k < 3; k++) if ((x / 60 + k) % 2) rect(c, x + k * 12, FLOOR + k * 30, 60, 30, 'rgba(0,0,0,.22)');
    } else if (sc.kind === 'hotelHall' || sc.kind === 'room') { // 카펫 무늬
      c.fillStyle = 'rgba(0,0,0,.25)';
      for (let x = 0; x < w; x += 40) for (let yy = FLOOR + 14; yy < 540; yy += 30) { c.beginPath(); c.moveTo(x + 20, yy - 8); c.lineTo(x + 30, yy); c.lineTo(x + 20, yy + 8); c.lineTo(x + 10, yy); c.fill(); }
      rect(c, 0, FLOOR + 2, w, 4, 'rgba(160,120,60,.18)');
    } else {
      let y = FLOOR + 6, step = 6;
      while (y < 540) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); step *= 1.35; y += step; }
    }

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

    if (['basement', 'maze', 'boiler'].includes(sc.kind)) { // 천장 배관
      rect(c, 0, CEIL + 8, w, 12, '#2e2c28');
      rect(c, 0, CEIL + 26, w, 8, '#3a3328');
      for (let x = 60; x < w; x += 180) rect(c, x, CEIL, 6, 40, '#1d1c1a');
      for (let i = 0; i < w / 160; i++) { // 바닥 물웅덩이
        const px = (i * 173 + 40) % w;
        c.beginPath(); c.ellipse(px, FLOOR + 40 + (i % 3) * 18, 50, 6, 0, 0, Math.PI * 2);
        c.fillStyle = 'rgba(90,110,120,.12)'; c.fill();
      }
    }
    if (sc.kind === 'burned') { // 그을음
      for (let i = 0; i < w / 70; i++) {
        const px = (i * 97) % w, h = 120 + (i * 53) % 200;
        const g2 = c.createLinearGradient(0, CEIL, 0, CEIL + h);
        g2.addColorStop(0, 'rgba(0,0,0,.75)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
        rect(c, px - 40, CEIL, 90, h, g2);
      }
      for (let x = 140; x < w; x += 330) rect(c, x, 0, 70 + (x % 50), CEIL + 6, '#020202'); // 무너진 천장
    }
    if (sc.kind === 'stairwell') { // 비스듬히 내려가는 계단 난간
      c.strokeStyle = 'rgba(20,20,18,.8)'; c.lineWidth = 5;
      for (let x = -200; x < w; x += 600) {
        c.beginPath(); c.moveTo(x, 120); c.lineTo(x + 520, 420); c.stroke();
        c.beginPath(); c.moveTo(x, 150); c.lineTo(x + 520, 450); c.stroke();
        for (let k = 0; k < 520; k += 40) rect(c, x + k, 120 + k * 0.577, 3, 30, 'rgba(20,20,18,.8)');
      }
      for (let x = 300; x < w; x += 600) { rect(c, x - 30, 70, 60, 22, '#1d5233'); text(c, `${Math.max(1, 3 - Math.floor(x / 600))}F`, x, 82, 13, '#c9e8d3', MONO); }
    }

    // 천장 조명 틀
    if (!['basement', 'maze', 'boiler', 'burned', 'stairwell', 'lobby'].includes(sc.kind)) for (let lx = 200; lx < w; lx += 400) rect(c, lx - 40, CEIL, 80, 7, '#2a2a27');
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

  function stairs(c, x, dir, sign) {
    rect(c, x - 82, 190, 164, 260, '#070707');
    c.strokeStyle = '#2b2b27';
    c.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const sx = dir === 'up' ? x - 70 + i * 18 : x + 70 - i * 18;
      const sy = dir === 'up' ? 440 - i * 28 : 230 + i * 28;
      c.beginPath(); c.moveTo(sx - 14, sy); c.lineTo(sx + 14, sy); c.stroke();
    }
    rect(c, x - 46, 156, 92, 26, '#1d5233');
    text(c, sign || (dir === 'up' ? '↑ 2층' : '↓ 1층'), x, 170, 14, '#c9e8d3', MONO);
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

  // ───────── 에피소드 2 · 백운호텔 ─────────

  function drawForest(c, sc, x0, x1, G) {
    const w = sc.width;
    const sky = c.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, '#05070d'); sky.addColorStop(1, '#141b2a');
    rect(c, 0, 0, w, FLOOR, sky);
    c.fillStyle = '#c9cfd8';
    c.beginPath(); c.arc(360, 90, 26, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#141b2a';
    c.beginPath(); c.arc(372, 84, 24, 0, Math.PI * 2); c.fill();
    const r = rng(77);
    for (let layer = 0; layer < 2; layer++) { // 소나무 숲
      c.fillStyle = layer ? '#05070a' : '#0a0f17';
      for (let x = -40; x < 980; x += 34 + r() * 30) {
        const h = 140 + r() * 160 - layer * 30, base = FLOOR + 4;
        c.beginPath(); c.moveTo(x, base - h); c.lineTo(x + 34, base); c.lineTo(x - 34, base); c.fill();
      }
    }
    // 호텔 건물
    rect(c, 940, 60, 560, FLOOR - 60, '#1a1a1c');
    for (let fx = 970; fx < 1480; fx += 70) for (let fy = 90; fy < 330; fy += 80) {
      rect(c, fx, fy, 38, 46, fx === 1180 && fy === 250 ? '#2a1a12' : '#0b0c10');
    }
    rect(c, 1180, 250, 38, 46, '#0b0c10');
    if (Math.sin(G.time * 0.7) > 0.96) rect(c, 1186, 256, 26, 34, 'rgba(230,220,200,.5)'); // 304호 창문의 그림자
    // 간판
    rect(c, 980, 26, 220, 34, '#111');
    const flick = Math.sin(G.time * 23) > -0.2 || Math.random() > 0.9;
    text(c, '백', 1010, 44, 24, flick ? '#e23a2a' : '#3a1210', `800 ${SOFT}`.replace(/^800 /, ''));
    text(c, '운  호  텔', 1110, 44, 22, '#2a2622');
    // 주차장 바닥
    rect(c, 0, FLOOR, w, 90, '#1c1d20');
    for (let x = 80; x < 900; x += 160) rect(c, x, FLOOR + 30, 6, 40, 'rgba(200,200,180,.15)');
    c.fillStyle = 'rgba(80,70,50,.35)'; // 낙엽
    for (let i = 0; i < 60; i++) { c.beginPath(); c.ellipse(r() * w, FLOOR + 8 + r() * 80, 5, 2, r() * 3, 0, Math.PI * 2); c.fill(); }
  }

  function entrance(c, x) {
    rect(c, x - 110, 186, 220, 16, '#26262a');
    rect(c, x - 96, 202, 192, 248, '#121318');
    for (const s of [-1, 1]) {
      const px = x + (s < 0 ? -92 : 2);
      const g = c.createLinearGradient(0, 210, 0, 450);
      g.addColorStop(0, '#1e2a3a'); g.addColorStop(1, '#0c1018');
      rect(c, px, 208, 90, 240, g);
      strokeRect(c, px, 208, 90, 240, '#3a3a3e', 3);
    }
    c.strokeStyle = 'rgba(200,210,220,.35)'; c.lineWidth = 1.5; // 깨진 유리
    c.beginPath(); c.moveTo(x - 60, 260); c.lineTo(x - 30, 300); c.lineTo(x - 70, 340); c.moveTo(x - 30, 300); c.lineTo(x - 10, 290); c.stroke();
    text(c, 'HOTEL BAEKUN', x, 194, 10, '#6a6a6a', MONO);
  }

  function patrolCar(c, x, t, dead) {
    rect(c, x - 110, 392, 220, 50, '#d8d8d4');
    rect(c, x - 110, 418, 220, 24, '#141a2c');
    c.fillStyle = '#d8d8d4';
    c.beginPath(); c.moveTo(x - 64, 392); c.lineTo(x - 40, 352); c.lineTo(x + 46, 352); c.lineTo(x + 76, 392); c.fill();
    rect(c, x - 36, 358, 36, 30, '#1b2230'); rect(c, x + 6, 358, 38, 30, '#1b2230');
    rect(c, x - 26, 344, 22, 9, dead ? '#3a1010' : '#b3261e');
    rect(c, x + 4, 344, 22, 9, dead ? '#10183a' : '#2a50c0');
    text(c, '경 찰', x - 30, 430, 12, '#e8e8e0', MONO);
    for (const wx of [x - 66, x + 66]) { c.fillStyle = '#0a0a0a'; c.beginPath(); c.arc(wx, 444, 18, 0, Math.PI * 2); c.fill(); c.fillStyle = '#4a4a4a'; c.beginPath(); c.arc(wx, 444, 7, 0, Math.PI * 2); c.fill(); }
    rect(c, x + 102, 400, 8, 8, dead ? '#2a2a20' : '#d8d0a0');
  }

  function hdoor(c, x, label, burnt) {
    rect(c, x - 52, 206, 104, 244, burnt ? '#0d0a08' : '#1c140e');
    rect(c, x - 46, 212, 92, 238, burnt ? '#1e1610' : '#5a3a26');
    if (!burnt) { strokeRect(c, x - 36, 226, 72, 90, '#3e2818', 2); strokeRect(c, x - 36, 330, 72, 100, '#3e2818', 2); }
    else { c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.ellipse(x, 300, 40, 90, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#b49a5a';
    c.beginPath(); c.arc(x + 32, 336, 4, 0, Math.PI * 2); c.fill();
    if (label) {
      const w = Math.max(44, label.length * 15 + 14);
      rect(c, x - w / 2, 180, w, 22, burnt ? '#3a3020' : '#a8925a');
      c.font = `800 13px ${SOFT}`; c.fillStyle = '#1a1208'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(label, x, 192);
    }
  }

  function elevator(c, x, power, floor) {
    rect(c, x - 70, 196, 140, 254, '#2a2a2c');
    rect(c, x - 62, 206, 60, 244, '#5f6266'); rect(c, x + 2, 206, 60, 244, '#5f6266');
    rect(c, x - 2, 206, 4, 244, '#2a2a2c');
    rect(c, x - 30, 170, 60, 20, '#111');
    text(c, power ? `▲ ${floor}` : '-', x, 180, 13, power ? '#e8a040' : '#3a3a3a', MONO);
    rect(c, x + 80, 300, 14, 26, '#3a3a3c');
    c.fillStyle = power ? '#e8a040' : '#222'; c.beginPath(); c.arc(x + 87, 313, 4, 0, Math.PI * 2); c.fill();
  }

  function frontdesk(c, x) {
    rect(c, x - 110, 384, 430, 10, '#4a3020');
    rect(c, x - 104, 394, 418, 58, '#3a2416');
    for (let k = 0; k < 6; k++) strokeRect(c, x - 96 + k * 70, 400, 60, 44, '#26170e', 2);
    text(c, 'RECEPTION', x + 105, 422, 11, '#8a7040', MONO);
    c.fillStyle = '#b49a5a'; c.beginPath(); c.arc(x + 240, 378, 7, Math.PI, 0); c.fill(); // 호출 벨
  }

  function keyrack(c, x) {
    rect(c, x - 40, 226, 80, 100, '#3a2618');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const kx = x - 28 + j * 18, ky = 240 + i * 28;
      rect(c, kx, ky, 2, 4, '#8a8578');
      if (!(i === 2 && j === 1)) rect(c, kx - 2, ky + 4, 6, 12, '#a39368');
    }
  }

  function chandelier(c, x, power) {
    rect(c, x - 1, CEIL, 2, 40, '#3a3020');
    c.strokeStyle = '#5a4a2a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(x - 60, CEIL + 60); c.quadraticCurveTo(x, CEIL + 90, x + 60, CEIL + 60); c.stroke();
    for (let k = -2; k <= 2; k++) {
      rect(c, x + k * 28 - 2, CEIL + 50 + Math.abs(k) * -4, 4, 14, power ? '#f0dca0' : '#4a4436');
      rect(c, x + k * 28 - 1, CEIL + 66, 2, 18, 'rgba(200,200,210,.25)');
    }
  }

  function sofa(c, x) {
    rect(c, x - 90, 380, 180, 52, '#4a1a1a');
    rect(c, x - 96, 360, 192, 30, '#3a1414');
    rect(c, x - 100, 372, 20, 64, '#3a1414'); rect(c, x + 80, 372, 20, 64, '#3a1414');
    rect(c, x - 80, 436, 6, 16, '#1a0f0a'); rect(c, x + 74, 436, 6, 16, '#1a0f0a');
  }

  function sconce(c, x, power) {
    rect(c, x - 4, 210, 8, 22, '#5a4a2a');
    c.fillStyle = power ? '#e8c890' : '#3a3428';
    c.beginPath(); c.moveTo(x - 14, 208); c.lineTo(x + 14, 208); c.lineTo(x + 8, 186); c.lineTo(x - 8, 186); c.fill();
  }

  function counter(c, x) {
    rect(c, x - 66, 380, 132, 8, '#8a9094');
    rect(c, x - 62, 388, 124, 64, '#5d6366');
    rect(c, x - 2, 392, 4, 56, '#4a4f52');
  }

  function stove(c, x) {
    rect(c, x - 70, 376, 140, 76, '#3a3d40');
    rect(c, x - 70, 370, 140, 8, '#26282a');
    for (const k of [-40, 0, 40]) { c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.arc(x + k, 366, 10, Math.PI, 0); c.stroke(); }
    rect(c, x - 60, 300, 120, 50, '#2a2c2e'); // 후드
  }

  function pans(c, x) {
    rect(c, x - 90, 160, 180, 4, '#4a4a48');
    for (let k = 0; k < 5; k++) {
      const px = x - 72 + k * 36;
      rect(c, px, 164, 2, 26, '#4a4a48');
      c.fillStyle = '#2e3032'; c.beginPath(); c.arc(px + 1, 204, 14 - (k % 2) * 4, 0, Math.PI * 2); c.fill();
    }
  }

  function fridge(c, x) {
    rect(c, x - 80, 180, 160, 270, '#8a9094');
    strokeRect(c, x - 80, 180, 160, 270, '#4a4f52', 3);
    rect(c, x - 68, 192, 136, 246, '#7a8084');
    rect(c, x + 46, 290, 12, 60, '#3a3f42');
    text(c, '냉장 창고', x, 214, 12, '#2a2e30', MONO);
  }

  function safeBox(c, x, open) {
    rect(c, x - 54, 330, 108, 122, '#262828');
    strokeRect(c, x - 54, 330, 108, 122, '#111', 3);
    if (open) { rect(c, x - 44, 340, 88, 102, '#060606'); return; }
    rect(c, x - 30, 350, 60, 40, '#141616');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) rect(c, x - 24 + j * 18, 354 + i * 12, 12, 8, '#3a3e3e');
    rect(c, x + 28, 400, 10, 30, '#8a8a80');
  }

  function roomWardrobe(c, x, burnt) {
    const body = burnt ? '#1a120c' : '#4a3020';
    rect(c, x - 60, 200, 120, 250, body);
    strokeRect(c, x - 60, 200, 120, 250, '#1a110a', 3);
    rect(c, x - 1, 206, 2, 238, '#1a110a');
    if (!burnt) { strokeRect(c, x - 50, 216, 42, 220, '#2e1e12', 2); strokeRect(c, x + 8, 216, 42, 220, '#2e1e12', 2); }
    rect(c, x - 10, 320, 4, 18, '#b49a5a'); rect(c, x + 6, 320, 4, 18, '#b49a5a');
  }

  function hotelBed(c, x) {
    rect(c, x - 120, 404, 240, 26, '#c9c0ae');
    rect(c, x - 120, 396, 70, 12, '#e3dccc');
    rect(c, x - 40, 400, 160, 30, '#6a2a2a');
    rect(c, x - 130, 330, 14, 122, '#3a2416');
    rect(c, x + 116, 380, 10, 72, '#3a2416');
    rect(c, x - 124, 430, 248, 10, '#2a1a10');
  }

  function nightstand(c, x, power) {
    rect(c, x - 30, 404, 60, 48, '#4a3020');
    strokeRect(c, x - 26, 412, 52, 18, '#2e1e12', 2);
    rect(c, x - 3, 372, 6, 32, '#5a4a2a');
    c.fillStyle = power ? '#e8c890' : '#6a5a40';
    c.beginPath(); c.moveTo(x - 18, 374); c.lineTo(x + 18, 374); c.lineTo(x + 12, 350); c.lineTo(x - 12, 350); c.fill();
  }

  function tv(c, x, t) {
    rect(c, x - 50, 404, 100, 48, '#2a1e14');
    rect(c, x - 44, 326, 88, 78, '#1a1a1a');
    rect(c, x - 36, 334, 66, 56, '#262a2a');
    c.fillStyle = 'rgba(200,200,190,.18)';
    c.beginPath(); c.ellipse(x - 6, 362, 10, 14, 0, 0, Math.PI * 2); c.fill(); // 안쪽 손바닥 자국
  }

  function pipeDoor(c, x, color, label) {
    const col = { red: '#8a2420', blue: '#244a8a', yellow: '#9a8420', gray: '#4a4a46' }[color] || '#4a4a46';
    rect(c, 0 + x - 300, 120, 600, 0, col);
    rect(c, x - 58, 120, 116, 16, col); // 문 위로 지나가는 관
    rect(c, x - 10, 136, 20, 70, col);
    rect(c, x - 56, 206, 112, 244, '#2a2c2a');
    rect(c, x - 48, 214, 96, 236, '#4a4d48');
    for (let k = 0; k < 4; k++) rect(c, x - 48, 240 + k * 52, 96, 3, '#3a3d38');
    rect(c, x + 30, 320, 10, 26, '#8a8a80');
    if (label) { rect(c, x - 34, 180, 68, 22, '#cfc7b3'); text(c, label, x, 191, 12, '#222', MONO); }
    else { rect(c, x - 24, 178, 48, 24, col); }
  }

  function mazeMarks(c, n) { // 지나온 통로마다 벽에 분필로 그은 줄
    c.strokeStyle = 'rgba(225,225,215,.55)'; c.lineWidth = 3;
    for (let i = 0; i < n; i++) { c.beginPath(); c.moveTo(232 + i * 14, 236); c.lineTo(226 + i * 14, 280); c.stroke(); }
  }

  function boilerTank(c, x, power, t) {
    c.fillStyle = '#4a3f32';
    c.beginPath(); c.ellipse(x, 300, 110, 150, 0, 0, Math.PI * 2); c.fill();
    rect(c, x - 110, 300, 220, 150, '#4a3f32');
    rect(c, x - 30, 360, 60, 40, power ? '#c85a20' : '#1a120c');
    c.fillStyle = '#d8d0b0'; c.beginPath(); c.arc(x + 60, 220, 16, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#111'; c.lineWidth = 2;
    const a = power ? -0.6 + Math.sin(t * 3) * 0.1 : 1.2;
    c.beginPath(); c.moveTo(x + 60, 220); c.lineTo(x + 60 + Math.cos(a) * 12, 220 + Math.sin(a) * 12); c.stroke();
  }

  function breakerPanel(c, x, power) {
    rect(c, x - 70, 200, 140, 170, '#5a5f60');
    strokeRect(c, x - 70, 200, 140, 170, '#2a2e30', 3);
    text(c, '배 전 반', x, 216, 12, '#1a1e20', MONO);
    for (let k = 0; k < 5; k++) {
      const bx = x - 52 + k * 26;
      rect(c, bx, 240, 18, 60, '#1a1e20');
      const on = power && [1, 0, 1, 1, 0][k];
      rect(c, bx + 3, on ? 244 : 272, 12, 24, on ? '#c8c2a0' : '#6a6a66');
      text(c, String(k + 1), bx + 9, 312, 11, '#1a1e20', MONO);
    }
    c.fillStyle = power ? '#4ac060' : '#5a1a14'; c.beginPath(); c.arc(x, 344, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d8b030'; c.lineWidth = 3; // 경고 표시
    c.beginPath(); c.moveTo(x + 40, 340); c.lineTo(x + 52, 360); c.lineTo(x + 28, 360); c.closePath(); c.stroke();
  }

  function chainDoor(c, x, open) {
    rect(c, x - 60, 196, 120, 254, '#1a2a1e');
    rect(c, x - 52, 204, 104, 246, '#3a4a3e');
    rect(c, x - 34, 166, 68, 24, '#1d6a3a');
    text(c, '비상구', x, 178, 13, '#d8f0e0', MONO);
    if (open) return;
    c.strokeStyle = '#8a8a7a'; c.lineWidth = 4;
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - 56, 280 + k * 30); c.lineTo(x + 56, 310 + k * 22); c.stroke(); }
    rect(c, x - 12, 300, 24, 28, '#9a8040');
  }

  function exitDoor(c, x) {
    rect(c, x - 60, 196, 120, 254, '#2a2c2a');
    rect(c, x - 52, 204, 104, 246, '#5a5d58');
    rect(c, x - 40, 320, 80, 10, '#9a9d98');
    rect(c, x - 40, 160, 80, 28, '#1d8a4a');
    text(c, 'EXIT  →', x, 174, 13, '#e8fff0', MONO);
  }

  function debris(c, x) {
    c.fillStyle = '#1a1612';
    c.beginPath(); c.moveTo(x - 100, FLOOR); c.lineTo(x - 70, 300); c.lineTo(x - 20, 250); c.lineTo(x + 30, 180); c.lineTo(x + 90, 230); c.lineTo(x + 100, FLOOR); c.fill();
    for (let k = 0; k < 6; k++) rect(c, x - 80 + k * 30, 260 + (k * 37) % 120, 50, 8, '#2a221a');
    rect(c, x - 60, 200, 140, 8, '#3a3026');
  }

  // 아이템이 놓인 표면의 윗면 높이
  const SURFACE_Y = { floor: FEET - 6, desk: 390, officeDesk: 382, podium: 358, smallDesk: 386, medcab: 346, keybox: 290, stand: 318, frontdesk: 382, counter: 380, nightstand: 402 };

  function surface(c, kind, x) {
    if (kind === 'desk') studentDesk(c, x, false);
    else if (kind === 'officeDesk') officeDesk(c, x);
    else if (kind === 'podium') podium(c, x);
    else if (kind === 'smallDesk') smallDesk(c, x);
    else if (kind === 'medcab') medcab(c, x);
    else if (kind === 'stand') stand(c, x);
    else if (kind === 'counter') counter(c, x);
    else if (kind === 'nightstand') nightstand(c, x, false);
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
    } else if (/key/i.test(o.item)) {
      rect(c, o.x - 3, y - 10, 6, 12, '#c8b26a');
      rect(c, o.x - 6, y - 14, 12, 5, '#c8b26a');
    } else if (o.item === 'doll') { // 토끼 인형
      c.fillStyle = '#d9cfc0';
      c.beginPath(); c.ellipse(o.x, y - 10, 9, 11, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(o.x, y - 26, 7, 0, Math.PI * 2); c.fill();
      rect(c, o.x - 5, y - 44, 3, 14, '#d9cfc0'); rect(c, o.x + 2, y - 44, 3, 14, '#d9cfc0');
      rect(c, o.x - 3, y - 27, 2, 2, '#222'); rect(c, o.x + 2, y - 27, 2, 2, '#222');
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
    if (['hdoor', 'elevator', 'pipeDoor', 'chainDoor', 'exitDoor', 'entrance'].includes(o.art)) return 150;
    if (o.art === 'car') return 300;
    if (o.art === 'none' || o.art === 'frontdesk') return 300;
    return 200;
  };

  R.scene = function (c, sc, x0, x1, G) {
    drawShell(c, sc, x0, x1, G);
    const r = rng(hash(sc.name + 'w'));
    (sc.windows || []).forEach(wx => { const broken = r() < 0.25; if (wx > x0 - 200 && wx < x1 + 200) drawWindow(c, wx, sc.kind, broken); });

    (sc.sconces || []).forEach(x => sconce(c, x, G.flags.has('power')));
    if (sc.kind === 'maze') mazeMarks(c, G.vars.maze || 0);
    if (sc.lamp && (!sc.lampFlag || G.flags.has(sc.lampFlag))) {
      const on = G.lampOn;
      rect(c, sc.lamp - 50, CEIL, 100, 9, on ? '#e8f0dd' : '#3a3a36');
    }

    (sc.deco || []).forEach(d => {
      if (d.x < x0 - 200 || d.x > x1 + 200) return;
      if (d.t === 'portrait') portrait(c, d.x, G.time, d.eyes && G.ghost.active ? (G.player.x - d.x) / 80 : 0);
      else if (d.t === 'chandelier') chandelier(c, d.x, G.flags.has('power'));
    });

    const objs = sc.objects;
    for (const o of objs) {
      if (o.x < x0 - 250 || o.x > x1 + 250) continue;
      const taken = G.flags.has('took:' + o.id);
      switch (o.art || o.type) {
        case 'door': door(c, o.x, o.label, { crooked: o.crooked }); break;
        case 'roomdoor': door(c, o.x, null, { room: true }); break;
        case 'stairs': stairs(c, o.x, o.dir, o.sign); break;
        case 'hdoor': hdoor(c, o.x, o.label, o.burnt); break;
        case 'elevator': elevator(c, o.x, G.flags.has('power'), G.scene === 'hall3' ? 3 : 1); break;
        case 'keyrack': keyrack(c, o.x); break;
        case 'pipeDoor': pipeDoor(c, o.x, o.color, o.label); break;
        case 'breaker': breakerPanel(c, o.x, G.flags.has('power')); break;
        case 'safe': safeBox(c, o.x, G.flags.has('took:' + o.id)); break;
        case 'chainDoor': chainDoor(c, o.x, o.open); break;
        case 'exitDoor': exitDoor(c, o.x); break;
        case 'debris': debris(c, o.x); break;
        case 'tv': tv(c, o.x, G.time); break;
        case 'entrance': entrance(c, o.x); break;
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
      else if (d.t === 'sofa') sofa(c, d.x);
      else if (d.t === 'counter') counter(c, d.x);
      else if (d.t === 'stove') stove(c, d.x);
      else if (d.t === 'pans') pans(c, d.x);
      else if (d.t === 'hbed') hotelBed(c, d.x);
      else if (d.t === 'nightstand') nightstand(c, d.x, G.flags.has('power'));
      else if (d.t === 'boilerTank') boilerTank(c, d.x, G.flags.has('power'), G.time);
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
        case 'phone': if (!o.surface) phone(c, o.x, G.phoneRinging, G.time); break;
        case 'wardrobe': wardrobe(c, o.x, G.flags.has('wardrobe')); break;
        case 'frontdesk': frontdesk(c, o.x); break;
        case 'fridge': fridge(c, o.x); break;
        case 'roomWardrobe': roomWardrobe(c, o.x, o.burnt); break;
        case 'car': patrolCar(c, o.x, G.time, G.flags.has('carDead')); break;
        default: break;
      }
      if (o.surface && o.surface !== 'floor' && o.surface !== 'keybox' && o.surface !== 'frontdesk') {
        if (!(sc.deco || []).some(d => d.t === o.surface && d.x === o.x)) surface(c, o.surface, o.x);
      }
      if (o.art === 'phone' && o.surface) phone(c, o.x, G.phoneRinging, G.time);
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

  R.player = function (c, p, look) {
    if (look === 'police') return policePlayer(c, p);
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

  R.ghost = function (c, g, t, alpha, look) {
    if (alpha <= 0.01) return;
    if (look === 'manager') return managerGhost(c, g, t, alpha);
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

  function policePlayer(c, p) {
    const sw = p.moving ? Math.sin(p.step) * (p.running ? 0.75 : 0.45) : 0;
    const bob = p.moving ? Math.abs(Math.sin(p.step)) * 2 : 0;
    c.save();
    c.translate(p.x, FEET - bob);
    c.scale(p.dir, 1);
    const leg = (lx, a) => { c.save(); c.translate(lx, -46); c.rotate(a); rect(c, -4, 0, 9, 46, '#171c2a'); rect(c, -4, 42, 13, 5, '#070708'); c.restore(); };
    leg(-3, sw); leg(4, -sw);
    c.save(); c.translate(-6, -88); c.rotate(-sw * 0.8); rect(c, -3, 0, 7, 34, '#1e2538'); c.restore();
    rect(c, -14, -94, 28, 50, '#1e2538');            // 근무복
    rect(c, -14, -90, 28, 30, '#6a7a3a');             // 형광 조끼 (어둡게)
    rect(c, -14, -74, 28, 4, '#b8c0b0');              // 반사띠
    rect(c, -14, -48, 28, 5, '#0d0f14');              // 벨트
    rect(c, 9, -50, 6, 12, '#0d0f14');                // 무전기
    c.fillStyle = '#c9b49a';
    c.beginPath(); c.arc(1, -104, 10, 0, Math.PI * 2); c.fill();
    rect(c, -12, -116, 26, 8, '#171c2a');             // 경찰 모자
    rect(c, -6, -112, 26, 3, '#0d0f14');              // 챙
    rect(c, -2, -115, 5, 4, '#c8b26a');               // 모표
    rect(c, -11, -108, 5, 10, '#16120f');
    c.save(); c.translate(6, -86); c.rotate(-1.15 + (p.aim || 0)); rect(c, -3, 0, 7, 24, '#1e2538'); rect(c, -4, 22, 8, 13, '#2a2a2a'); c.restore();
    c.restore();
  }

  function managerGhost(c, g, t, alpha) {
    const jx = Math.random() < 0.06 ? (Math.random() - 0.5) * 6 : 0;
    c.save();
    c.globalAlpha = alpha;
    c.translate(g.x + jx, FEET - 2);
    c.scale(g.dir, 1);
    const stride = g.state === 'chase' ? Math.sin(t * 9) * 0.3 : Math.sin(t * 3) * 0.12;
    const leg = (lx, a) => { c.save(); c.translate(lx, -60); c.rotate(a); rect(c, -4, 0, 9, 60, '#0b0b0d'); rect(c, -5, 56, 14, 5, '#000'); c.restore(); };
    leg(-4, stride); leg(5, -stride);
    rect(c, -17, -136, 34, 80, '#0e0e11');            // 연미복
    rect(c, -6, -136, 12, 40, '#a8a49a');             // 셔츠
    rect(c, -8, -134, 16, 5, '#5a0e0e');              // 나비넥타이
    rect(c, -22, -132, 6, 82, '#0e0e11');             // 긴 팔
    rect(c, 16, -132, 6, 82, '#0e0e11');
    rect(c, -22, -52, 6, 10, '#a9a69c'); rect(c, 16, -52, 6, 10, '#a9a69c'); // 창백한 손
    c.strokeStyle = '#8a7a40'; c.lineWidth = 2;      // 열쇠 꾸러미
    c.beginPath(); c.arc(19, -36, 7, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 4; k++) rect(c, 14 + k * 3, -30, 2, 10, '#9a8a50');
    c.save();
    c.translate(0, -150);
    c.rotate(0.18 + (g.state === 'chase' ? Math.sin(t * 16) * 0.05 : 0));
    if (alpha > 0.3) {
      c.fillStyle = '#b8b4aa';
      c.beginPath(); c.ellipse(0, 0, 11, 14, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#000';                            // 텅 빈 눈과 입
      c.beginPath(); c.ellipse(-4, -2, 3, 4, 0, 0, Math.PI * 2); c.ellipse(5, -2, 3, 4, 0, 0, Math.PI * 2); c.fill();
      rect(c, -4, 7, 9, 2, '#000');
    }
    rect(c, -12, -16, 24, 8, '#08080a');              // 넘긴 머리
    c.restore();
    c.restore();
  }

  // ───────── 점프스케어: 잡혔을 때 화면 가득 튀어나오는 얼굴 ─────────
  // 얼굴은 (0,0) 중심, 반지름 약 400의 좌표계에서 그린다.

  function girlFace(c, t, jit) {
    c.fillStyle = '#020202'; // 뒤로 늘어진 머리카락
    c.beginPath(); c.ellipse(0, 40, 440, 560, 0, 0, Math.PI * 2); c.fill();
    const g = c.createRadialGradient(-30, -40, 30, 0, 20, 380);
    g.addColorStop(0, '#dedbd2'); g.addColorStop(0.6, '#a19e95'); g.addColorStop(1, '#2e2d2a');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(0, 30, 265, 355, 0, 0, Math.PI * 2); c.fill();
    const r = rng(1998); // 핏줄
    c.strokeStyle = 'rgba(60,40,60,.45)'; c.lineWidth = 2.5;
    for (let i = 0; i < 14; i++) {
      let x = (r() - 0.5) * 380, y = (r() - 0.5) * 420 + 40;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; c.lineTo(x, y); }
      c.stroke();
    }
    for (const sd of [-1, 1]) { // 텅 빈 눈구멍
      const ex = sd * 108, ey = -30;
      const eg = c.createRadialGradient(ex, ey, 10, ex, ey, 130);
      eg.addColorStop(0, '#000'); eg.addColorStop(0.55, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = eg;
      c.beginPath(); c.ellipse(ex, ey, 130, 100, sd * 0.12, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f4f2ea';
      c.beginPath(); c.arc(ex + jit * 0.4, ey + 4, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5c0707'; // 피눈물
      c.beginPath(); c.moveTo(ex - 12, ey + 50); c.lineTo(ex + 12, ey + 50); c.lineTo(ex + 5, ey + 300); c.lineTo(ex - 6, ey + 300); c.fill();
    }
    c.fillStyle = '#000'; // 세로로 찢어진 입
    c.beginPath(); c.ellipse(0, 235, 62, 120 + Math.sin(t * 30) * 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(120,20,20,.6)';
    c.beginPath(); c.ellipse(0, 250, 34, 70, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#030303'; // 얼굴 위로 흘러내린 젖은 머리카락
    const strands = [[-250, 90, 360], [-190, 60, 470], [-120, 40, 260], [150, 70, 430], [215, 80, 520], [255, 100, 380]];
    for (const [x, w, len] of strands) {
      c.beginPath();
      c.moveTo(x - w / 2, -420);
      c.quadraticCurveTo(x - w / 2 + 20, -100, x - 10, len);
      c.lineTo(x + 6, len - 30);
      c.quadraticCurveTo(x + w / 2 + 10, -100, x + w / 2, -420);
      c.fill();
    }
    c.beginPath(); c.ellipse(0, -330, 280, 120, 0, Math.PI, 0); c.fill();
  }

  function managerFace(c, t, jit) {
    c.fillStyle = '#0a0a0c'; // 연미복 깃
    c.beginPath(); c.moveTo(-420, 600); c.lineTo(-160, 330); c.lineTo(160, 330); c.lineTo(420, 600); c.fill();
    rect(c, -60, 330, 120, 200, '#9c988e');
    c.fillStyle = '#4a0808';
    c.beginPath(); c.moveTo(-70, 350); c.lineTo(0, 380); c.lineTo(70, 350); c.lineTo(70, 410); c.lineTo(0, 380); c.lineTo(-70, 410); c.fill();
    const g = c.createRadialGradient(-40, -60, 30, 0, 0, 380);
    g.addColorStop(0, '#d2cbb8'); g.addColorStop(0.6, '#958d7a'); g.addColorStop(1, '#2a2620');
    c.fillStyle = g; // 길고 앙상한 얼굴
    c.beginPath(); c.ellipse(0, 0, 230, 370, 0, 0, Math.PI * 2); c.fill();
    const burn = c.createRadialGradient(150, 60, 20, 150, 60, 260); // 불에 탄 반쪽
    burn.addColorStop(0, 'rgba(20,8,4,.95)'); burn.addColorStop(0.5, 'rgba(60,20,8,.8)'); burn.addColorStop(1, 'rgba(60,20,8,0)');
    c.fillStyle = burn;
    c.beginPath(); c.ellipse(0, 0, 230, 370, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = `rgba(230,110,30,${0.35 + Math.sin(t * 20) * 0.15})`; c.lineWidth = 3; // 아직 타는 균열
    for (const [x, y] of [[120, -60], [170, 40], [110, 140], [190, 180]]) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y + 24); c.lineTo(x + 12, y + 50); c.stroke();
    }
    c.fillStyle = '#060606'; // 빗어 넘긴 머리
    c.beginPath(); c.ellipse(0, -280, 240, 140, 0, Math.PI, 0); c.fill();
    rect(c, -240, -290, 480, 40, '#060606');
    for (const sd of [-1, 1]) { // 깊이 꺼진 눈
      const ex = sd * 90, ey = -90;
      const eg = c.createRadialGradient(ex, ey, 8, ex, ey, 110);
      eg.addColorStop(0, '#000'); eg.addColorStop(0.6, '#000'); eg.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = eg;
      c.beginPath(); c.ellipse(ex, ey, 110, 80, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ff5a1a';
      c.beginPath(); c.arc(ex + jit * 0.4, ey, 7, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,90,26,.25)';
      c.beginPath(); c.arc(ex + jit * 0.4, ey, 20, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = 'rgba(0,0,0,.35)'; // 움푹 꺼진 볼
    c.beginPath(); c.ellipse(-140, 70, 50, 110, 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(140, 70, 50, 110, -0.2, 0, Math.PI * 2); c.fill();
    const open = 70 + Math.sin(t * 24) * 6; // 귀까지 찢어진 웃음
    c.fillStyle = '#000';
    c.beginPath();
    c.moveTo(-215, 120); c.quadraticCurveTo(0, 190, 215, 120);
    c.quadraticCurveTo(0, 190 + open * 1.6, -215, 120);
    c.fill();
    c.fillStyle = '#e3dccb';
    for (let k = -9; k <= 9; k++) {
      const x = k * 21, top = 120 + 70 * (1 - (x / 215) ** 2) - 2;
      rect(c, x - 7, top, 14, 26 - Math.abs(k));
      const bot = 120 + (70 + open * 0.8) * (1 - (x / 215) ** 2);
      rect(c, x - 7, bot - 22 + Math.abs(k), 14, 22 - Math.abs(k));
    }
  }

  // el: 잡힌 뒤 지난 시간(초) · after: 게임오버 화면 뒤에 희미하게 남는 단계
  R.scare = function (c, W, H, el, look, reduced, after) {
    const D = Math.min(W, H);
    const face = look === 'manager' ? managerFace : girlFace;
    if (after) {
      c.save();
      c.globalAlpha = 0.16;
      c.translate(W / 2, H / 2);
      c.scale(D / 820, D / 820);
      face(c, el, 0);
      c.restore();
      return;
    }
    c.save();
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    const pop = Math.min(1, el / 0.08);
    const grow = reduced ? 0.7 + Math.min(el, 1.5) * 0.25 : 0.95 + Math.min(el, 1.5) * 0.3;
    const sc = (D / 900) * grow * (0.6 + 0.4 * pop);
    const jit = reduced ? 0 : (Math.random() - 0.5) * 24;
    const jx = reduced ? 0 : (Math.random() - 0.5) * 34 * (1.4 - Math.min(el, 1.2));
    const jy = reduced ? 0 : (Math.random() - 0.5) * 24 * (1.4 - Math.min(el, 1.2));
    const draw = (dx, alpha) => {
      c.save();
      c.globalAlpha = alpha;
      c.translate(W / 2 + jx + dx, H / 2 + jy);
      c.scale(sc, sc);
      face(c, el, jit);
      c.restore();
    };
    if (!reduced) { // 색이 어긋난 잔상
      draw(-18, 0.35);
      draw(18, 0.35);
    }
    draw(0, reduced ? Math.min(1, el / 0.4) : 1);
    if (!reduced) {
      for (let i = 0; i < 7; i++) { // 찢어지는 화면
        const y = Math.random() * H, h = 3 + Math.random() * 30;
        c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,.85)' : 'rgba(220,220,210,.12)';
        c.fillRect(0, y, W, h);
      }
      if (el < 0.45 && Math.random() < 0.35) { // 짧은 반전
        c.globalCompositeOperation = 'difference';
        c.fillStyle = '#fff';
        c.fillRect(0, 0, W, H);
        c.globalCompositeOperation = 'source-over';
      }
    }
    const v = c.createRadialGradient(W / 2, H / 2, D * 0.25, W / 2, H / 2, D * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(70,0,0,.85)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    c.restore();
  };

  R.text = text;
  R.MONO = MONO;
  R.HAND = HAND;
})();
