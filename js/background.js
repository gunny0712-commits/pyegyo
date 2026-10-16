// 배경: 1점 투시로 그린 폐교 복도 + 손전등 조명.
// 정적인 복도는 오프스크린 캔버스에 한 번만 그리고, 매 프레임에는
// 형광등·인영·먼지·어둠 마스크만 다시 그린다.
(() => {
  'use strict';

  const cvs = document.getElementById('bg');
  const ctx = cvs.getContext('2d');
  const layer = document.createElement('canvas');
  const lctx = layer.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');

  // 월드 좌표 (복도 폭/높이/깊이)
  const WX = 1.5, FLOOR = -1, CEIL = 1.3, WAIN = -0.25, ZN = 0.6, ZF = 14;
  const LAMPS = [2.2, 4.6, 7, 9.4, 11.8];
  const FLICKER_LAMP = 2;            // z = 7 형광등이 깜빡인다
  const FIG = { x: 0.35, z: 8.1 };   // 그것이 서 있는 자리
  const DOORS = [
    { z0: 3.6, z1: 4.5, label: '2-1' },
    { z0: 7.0, z1: 7.8, label: '2-2' },
    { z0: 10.6, z1: 11.2, label: '2-3', crooked: true },
  ];
  const WINDOWS = [[1.2, 2.6], [3.4, 4.8], [5.6, 7.0], [7.8, 9.2], [10.0, 11.4]];
  const SCALE = 1.03;

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, F = 1;
  let dust = [];
  let last = 0;

  const S = {
    brightness: 0.5,
    reduceFlicker: false,
    dim: 1, dimTarget: 1, active: true,
    pointer: null,
    light: { x: 0, y: 0 },
    battery: 1, batteryUntil: 0, batteryNext: 12,
    lamp: { on: true, flickerUntil: 0, next: 3, tick: 0 },
    fig: { phase: 0, a: 0, until: 0, next: 18 },
  };

  const BG = {
    onFigure: null,
    onFlicker: null,
    setBrightness(v) { S.brightness = v; },
    setReduceFlicker(v) { S.reduceFlicker = v; },
    setDim(v) { S.dimTarget = v; },
    setPointer(x, y) { S.pointer = { x, y }; },
    setActive(v) { S.active = v; },
  };
  window.BG = BG;

  // ── 유틸 ──

  const P = (x, y, z) => [cx + (x / z) * F, cy - (y / z) * F];
  const fog = z => Math.exp(-(z - ZN) * 0.16);
  const tint = (rgb, z, k = 1) => {
    const f = fog(z) * k;
    return `rgb(${rgb.map(v => Math.round(v * f)).join(',')})`;
  };
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function poly(c, pts, fill) {
    c.beginPath();
    pts.forEach((p, i) => {
      const [sx, sy] = P(...p);
      i ? c.lineTo(sx, sy) : c.moveTo(sx, sy);
    });
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }

  function line(c, a, b, stroke, width = 1) {
    const [x0, y0] = P(...a), [x1, y1] = P(...b);
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }

  // 화면 흔들림 + 확대가 적용된 좌표로 변환 (마스크 구멍 위치 계산용)
  let camX = 0, camY = 0;
  const toScreen = ([x, y]) => [(x - W / 2) * SCALE + W / 2 + camX, (y - H / 2) * SCALE + H / 2 + camY];

  // ── 정적 복도 ──

  function drawStatic() {
    const c = lctx;
    const r = rng(1998);
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);

    const FLOOR_C = [92, 70, 52], CEIL_C = [88, 88, 82], WAIN_C = [50, 68, 56], WALL_C = [118, 120, 108];

    for (let z = ZN; z < ZF; z += 0.4) {
      const z1 = Math.min(z + 0.4, ZF), zm = (z + z1) / 2;
      poly(c, [[-WX, FLOOR, z], [WX, FLOOR, z], [WX, FLOOR, z1], [-WX, FLOOR, z1]], tint(FLOOR_C, zm, 0.92 + r() * 0.14));
      poly(c, [[-WX, CEIL, z], [WX, CEIL, z], [WX, CEIL, z1], [-WX, CEIL, z1]], tint(CEIL_C, zm, 0.8));
      for (const s of [-1, 1]) {
        const k = s < 0 ? 0.82 : 0.96;
        poly(c, [[s * WX, FLOOR, z], [s * WX, WAIN, z], [s * WX, WAIN, z1], [s * WX, FLOOR, z1]], tint(WAIN_C, zm, k));
        poly(c, [[s * WX, WAIN, z], [s * WX, CEIL, z], [s * WX, CEIL, z1], [s * WX, WAIN, z1]], tint(WALL_C, zm, k * (0.9 + r() * 0.1)));
      }
    }

    // 막다른 벽과 계단으로 이어지는 검은 입구
    poly(c, [[-WX, FLOOR, ZF], [WX, FLOOR, ZF], [WX, CEIL, ZF], [-WX, CEIL, ZF]], tint([70, 70, 64], ZF));
    poly(c, [[-0.55, FLOOR, ZF], [0.55, FLOOR, ZF], [0.55, 0.85, ZF], [-0.55, 0.85, ZF]], '#000');

    // 비상구 표지
    poly(c, [[-0.28, 1.0, ZF], [0.28, 1.0, ZF], [0.28, 1.22, ZF], [-0.28, 1.22, ZF]], 'rgb(30,120,64)');

    // 마룻바닥 판자 줄
    for (let x = -WX + 0.3; x < WX; x += 0.3) line(c, [x, FLOOR, ZN], [x, FLOOR, ZF], 'rgba(0,0,0,.35)');

    // 징두리 몰딩
    for (const s of [-1, 1]) line(c, [s * WX, WAIN, ZN], [s * WX, WAIN, ZF], 'rgba(15,15,10,.85)', 2);

    // 형광등 (꺼진 상태)
    LAMPS.forEach(z => {
      poly(c, [[-0.1, CEIL, z], [0.1, CEIL, z], [0.1, CEIL, z + 0.9], [-0.1, CEIL, z + 0.9]], tint([150, 150, 140], z, 0.5));
    });

    // 오른쪽 벽: 창문 + 바닥에 떨어진 달빛
    WINDOWS.forEach(([z0, z1], i) => {
      const zm = (z0 + z1) / 2;
      poly(c, [[WX, -0.05, z0 - 0.05], [WX, 1.05, z0 - 0.05], [WX, 1.05, z1 + 0.05], [WX, -0.05, z1 + 0.05]], tint([34, 34, 30], zm));
      poly(c, [[WX, 0, z0], [WX, 1, z0], [WX, 1, z1], [WX, 0, z1]], tint([48, 62, 84], zm));
      if (i === 2) { // 깨진 유리
        c.beginPath();
        const pts = [[0.55, z0 + 0.1], [0.95, z0 + 0.4], [0.7, zm], [0.98, z1 - 0.2], [0.35, z1 - 0.3], [0.5, zm - 0.1], [0.15, z0 + 0.5]];
        pts.forEach(([y, z], j) => { const [sx, sy] = P(WX, y, z); j ? c.lineTo(sx, sy) : c.moveTo(sx, sy); });
        c.closePath();
        c.fillStyle = '#040508';
        c.fill();
      }
      line(c, [WX, 0, zm], [WX, 1, zm], tint([30, 30, 26], zm), 2);
      line(c, [WX, 0.5, z0], [WX, 0.5, z1], tint([30, 30, 26], zm), 2);
      poly(c, [[WX, FLOOR, z0], [WX, FLOOR, z1], [WX - 1.4, FLOOR, z1 + 0.6], [WX - 1.4, FLOOR, z0 + 0.6]], `rgba(120,140,180,${0.09 * fog(zm)})`);
    });

    // 왼쪽 벽: 교실 문 + 반 팻말
    DOORS.forEach(d => {
      const zm = (d.z0 + d.z1) / 2;
      poly(c, [[-WX, FLOOR, d.z0], [-WX, 0.78, d.z0], [-WX, 0.78, d.z1], [-WX, FLOOR, d.z1]], tint([28, 22, 16], zm));
      poly(c, [[-WX, FLOOR, d.z0 + 0.04], [-WX, 0.72, d.z0 + 0.04], [-WX, 0.72, d.z1 - 0.04], [-WX, FLOOR, d.z1 - 0.04]], tint([84, 62, 42], zm));
      poly(c, [[-WX, 0.15, d.z0 + 0.12], [-WX, 0.58, d.z0 + 0.12], [-WX, 0.58, d.z1 - 0.12], [-WX, 0.15, d.z1 - 0.12]], tint([18, 22, 26], zm));

      const [x0, y0] = P(-WX, 1.08, d.z0);
      const [x1, y1] = P(-WX + 0.42, 0.86, d.z0);
      c.save();
      c.translate(x0, y0);
      if (d.crooked) c.rotate(0.22);
      c.fillStyle = tint([205, 198, 182], d.z0);
      c.fillRect(0, 0, x1 - x0, y1 - y0);
      c.fillStyle = d.crooked ? `rgba(120,20,16,${fog(d.z0) + 0.2})` : `rgba(20,20,20,${fog(d.z0)})`;
      c.font = `800 ${Math.max(6, (0.14 * F) / d.z0)}px "Nanum Myeongjo", serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(d.label, (x1 - x0) / 2, (y1 - y0) / 2 + 1);
      c.restore();
    });

    // 얼룩과 흘러내린 자국
    for (let i = 0; i < 18; i++) {
      const s = r() < 0.5 ? -1 : 1;
      const z = 1 + r() * 10, y = FLOOR + r() * (CEIL - FLOOR);
      const [sx, sy] = P(s * WX, y, z);
      const rad = ((0.12 + r() * 0.3) * F) / z;
      c.beginPath();
      c.ellipse(sx, sy, rad * 0.45, rad, 0, 0, Math.PI * 2);
      c.fillStyle = `rgba(14,10,6,${0.35 * fog(z)})`;
      c.fill();
    }
    for (let i = 0; i < 10; i++) {
      const s = r() < 0.5 ? -1 : 1;
      const z = 1 + r() * 9;
      line(c, [s * WX, CEIL, z], [s * WX, CEIL - 0.3 - r() * 0.9, z], `rgba(25,15,8,${0.5 * fog(z)})`, Math.max(1, (0.03 * F) / z));
    }

    // 바닥에 흩어진 시험지
    for (let i = 0; i < 11; i++) {
      const x = -1.2 + r() * 2.4, z = 1.1 + r() * 8, a = r() * Math.PI;
      const cs = Math.cos(a), sn = Math.sin(a), w = 0.1, h = 0.14;
      const pts = [[-w, -h], [w, -h], [w, h], [-w, h]].map(([dx, dz]) => [x + dx * cs - dz * sn, FLOOR, z + dx * sn + dz * cs]);
      poly(c, pts, tint([175, 168, 150], z, 0.75));
    }
  }

  // ── 동적 요소 ──

  function lampPos(z) {
    return P(0, CEIL, z + 0.45);
  }

  function drawLamp(now) {
    const z = LAMPS[FLICKER_LAMP];
    const on = S.lamp.on && S.fig.phase !== 1;
    if (!on) return;
    const [lx, ly] = lampPos(z);
    poly(ctx, [[-0.1, CEIL, z], [0.1, CEIL, z], [0.1, CEIL, z + 0.9], [-0.1, CEIL, z + 0.9]], 'rgb(225,235,215)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const r = (F * 1.8) / z;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
    g.addColorStop(0, 'rgba(190,210,180,.22)');
    g.addColorStop(1, 'rgba(190,210,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
    const [fx, fy] = P(0, FLOOR, z + 0.6);
    ctx.beginPath();
    ctx.ellipse(fx, fy, (F * 1.1) / z, (F * 0.25) / z, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160,180,150,.07)';
    ctx.fill();
    ctx.restore();

    // 비상구 불빛
    const [ex, ey] = P(0, 1.11, ZF);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, (F * 0.9) / ZF);
    eg.addColorStop(0, 'rgba(60,220,110,.35)');
    eg.addColorStop(1, 'rgba(60,220,110,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(ex - 100, ey - 100, 200, 200);
    ctx.restore();
  }

  function drawFigure() {
    if (S.fig.a <= 0.01) return;
    const s = F / FIG.z;
    const [bx, by] = P(FIG.x, FLOOR, FIG.z);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(s, s);           // 이제 1 = 월드 1단위, 위쪽이 -y
    ctx.fillStyle = `rgba(3,3,3,${S.fig.a})`;
    ctx.fillRect(-0.09, -0.55, 0.06, 0.55);       // 다리
    ctx.fillRect(0.03, -0.55, 0.06, 0.55);
    ctx.beginPath();                              // 교복 치마/몸통
    ctx.moveTo(-0.18, -0.5); ctx.lineTo(0.18, -0.5); ctx.lineTo(0.13, -1.35); ctx.lineTo(-0.13, -1.35);
    ctx.fill();
    ctx.fillRect(-0.2, -1.33, 0.05, 0.85);        // 지나치게 긴 팔
    ctx.fillRect(0.15, -1.33, 0.05, 0.85);
    ctx.save();                                   // 기울어진 머리와 늘어진 머리카락
    ctx.translate(0, -1.48);
    ctx.rotate(0.28);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.11, 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-0.13, 0, 0.26, 0.38);
    ctx.restore();
    ctx.restore();
  }

  function hole(x, y, r, a) {
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.55, `rgba(0,0,0,${a * 0.82})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function update(t, dt) {
    // 손전등은 포인터를 부드럽게 따라온다. 포인터가 없으면 천천히 복도를 훑는다.
    const target = S.pointer || { x: W / 2 + Math.sin(t * 0.4) * W * 0.2, y: H * 0.55 + Math.sin(t * 0.7) * H * 0.1 };
    const k = 1 - Math.pow(0.001, dt);
    S.light.x += (target.x - S.light.x) * k;
    S.light.y += (target.y - S.light.y) * k;

    S.dim += (S.dimTarget - S.dim) * (1 - Math.pow(0.05, dt));

    // 손전등 배터리 깜빡임
    if (!S.reduceFlicker && t > S.batteryNext) {
      S.batteryUntil = t + 0.25 + Math.random() * 0.35;
      S.batteryNext = t + 10 + Math.random() * 14;
    }
    S.battery = t < S.batteryUntil ? 0.25 + Math.random() * 0.6 : 1;

    // 형광등
    const L = S.lamp;
    if (S.reduceFlicker) {
      L.on = true;
    } else if (t < L.flickerUntil) {
      if (t > L.tick) { L.on = Math.random() > 0.5; L.tick = t + 0.04 + Math.random() * 0.08; }
    } else if (t > L.next && S.fig.phase === 0) {
      L.flickerUntil = t + 0.3 + Math.random() * 0.8;
      L.next = t + 3 + Math.random() * 7;
      BG.onFlicker && BG.onFlicker();
    } else if (t > L.flickerUntil && L.flickerUntil > 0) {
      L.on = Math.random() > 0.15;
      L.flickerUntil = 0;
    }

    // 그것: 불이 꺼졌다 켜지면 서 있다
    const fg = S.fig;
    if (fg.phase === 0 && t > fg.next && t > L.flickerUntil) {
      fg.phase = 1;
      fg.until = t + (S.reduceFlicker ? 0 : 0.4);
    } else if (fg.phase === 1 && t > fg.until) {
      fg.phase = 2;
      fg.until = t + 2.4;
      L.on = true;
      BG.onFigure && BG.onFigure();
    } else if (fg.phase === 2 && t > fg.until) {
      fg.phase = 0;
      fg.next = t + 22 + Math.random() * 20;
      if (!S.reduceFlicker) L.flickerUntil = t + 0.5;
    }
    const want = fg.phase === 2 ? 1 : 0;
    fg.a = S.reduceFlicker ? fg.a + (want - fg.a) * Math.min(1, dt * 2) : (fg.phase === 2 ? 1 : (L.on ? 0 : fg.a * 0.5));

    dust.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < 0) p.x += W; if (p.x > W) p.x -= W;
      if (p.y < 0) p.y += H; if (p.y > H) p.y -= H;
    });
  }

  function frame(now) {
    if (!S.active) { requestAnimationFrame(frame); return; }
    const t = now / 1000;
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    update(t, dt);

    camX = S.reduceFlicker ? 0 : Math.sin(t * 0.6) * 3;
    camY = S.reduceFlicker ? 0 : Math.sin(t * 1.2) * 2;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    ctx.translate(W / 2 + camX, H / 2 + camY);
    ctx.scale(SCALE, SCALE);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(layer, 0, 0, W, H);
    drawLamp(t);
    drawFigure();
    ctx.restore();

    // 손전등에 걸리는 먼지
    ctx.fillStyle = 'rgba(225,215,190,.45)';
    dust.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });

    // 어둠 마스크
    const amb = 0.985 - S.brightness * 0.22;
    const R = (Math.min(W, H) * 0.26 + Math.max(W, H) * 0.05) * (0.75 + 0.25 * S.battery);
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = `rgba(0,0,0,${amb})`;
    mctx.fillRect(0, 0, W, H);
    mctx.globalCompositeOperation = 'destination-out';
    hole(S.light.x, S.light.y, R, S.battery);
    if (S.lamp.on && S.fig.phase !== 1) {
      const [lx, ly] = toScreen(lampPos(LAMPS[FLICKER_LAMP]));
      hole(lx, ly + F * 0.12, (F * 2.2) / LAMPS[FLICKER_LAMP], 0.75);
    }
    const [ex, ey] = toScreen(P(0, 1.11, ZF));
    hole(ex, ey, (F * 1.2) / ZF, 0.7);
    WINDOWS.forEach(([z0, z1]) => {
      const zm = (z0 + z1) / 2;
      const [wx, wy] = toScreen(P(WX, 0.5, zm));
      hole(wx, wy, (F * 0.9) / zm, 0.22);
    });
    ctx.drawImage(mask, 0, 0, W, H);

    // 손전등의 따뜻한 빛
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(S.light.x, S.light.y, 0, S.light.x, S.light.y, R * 0.8);
    g.addColorStop(0, `rgba(255,210,150,${0.07 * S.battery})`);
    g.addColorStop(1, 'rgba(255,210,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (S.dim > 0.005) {
      ctx.fillStyle = `rgba(0,0,0,${S.dim})`;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(frame);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    [cvs, layer, mask].forEach(c => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    cx = W / 2;
    cy = H * 0.5;
    F = H * 0.62;
    if (!S.pointer) { S.light.x = W / 2; S.light.y = H * 0.55; }
    dust = Array.from({ length: 70 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 6,
      r: 0.4 + Math.random() * 1.3,
    }));
    drawStatic();
  }

  window.addEventListener('resize', resize);
  resize();
  // 팻말 글꼴이 늦게 로드되면 복도를 다시 그린다
  if (document.fonts) document.fonts.ready.then(drawStatic);
  requestAnimationFrame(frame);
})();
