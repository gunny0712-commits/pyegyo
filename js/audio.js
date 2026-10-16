// 사운드: 외부 파일 없이 Web Audio로 전부 합성한다.
// 브라우저 정책상 사용자 입력(클릭/키) 이후 SFX.start()를 호출해야 소리가 난다.
(() => {
  'use strict';

  let ac = null;
  let master = null;
  let noiseBuf = null;
  let volume = 0.7;

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeNoise() {
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noise(loop = false) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = loop;
    return s;
  }

  function filter(type, freq, q = 1) {
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  function gain(v = 0) {
    const g = ac.createGain();
    g.gain.value = v;
    return g;
  }

  // 짧게 올라갔다 사라지는 엔벨로프
  function env(g, t, attack, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function out(pan = 0) {
    if (!ac.createStereoPanner) return master;
    const p = ac.createStereoPanner();
    p.pan.value = pan;
    p.connect(master);
    return p;
  }

  function lfo(freq, depth, target) {
    const o = ac.createOscillator();
    o.frequency.value = freq;
    const g = gain(depth);
    o.connect(g).connect(target);
    o.start();
  }

  // ── 배경음 ──

  function drone() {
    const lp = filter('lowpass', 170, 4);
    const g = gain(0.05);
    [[48, 'sawtooth'], [48.4, 'sawtooth'], [72.3, 'sine'], [96.9, 'triangle']].forEach(([f, type]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    });
    lfo(0.05, 80, lp.frequency);
    lp.connect(g).connect(master);
  }

  function wind() {
    const s = noise(true);
    const bp = filter('bandpass', 450, 0.7);
    const g = gain(0.02);
    lfo(0.07, 0.015, g.gain);
    lfo(0.11, 250, bp.frequency);
    s.connect(bp).connect(g).connect(master);
    s.start();
  }

  // ── 멀리서 들리는 소리 ──

  function creak(len = 1.2, pan = rand(-0.8, 0.8)) {
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(70, 110), t);
    for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(rand(55, 130), t + (len / 8) * i);
    const g = gain();
    env(g, t, 0.2, 0.05, len);
    o.connect(filter('bandpass', 900, 6)).connect(g).connect(out(pan));
    o.start(t);
    o.stop(t + len + 0.4);
  }

  function footsteps() {
    const n = 3 + Math.floor(Math.random() * 4);
    const lp = filter('lowpass', 380);
    lp.connect(out(rand(-1, 1)));
    let t = ac.currentTime;
    for (let i = 0; i < n; i++) {
      t += rand(0.5, 0.62);
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(80, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.12);
      const g = gain();
      env(g, t, 0.005, 0.14 * (1 - i / (n + 2)), 0.18);
      o.connect(g).connect(lp);
      o.start(t);
      o.stop(t + 0.3);
    }
  }

  function scheduleAmbience() {
    setTimeout(() => {
      (Math.random() < 0.5 ? creak : footsteps)();
      scheduleAmbience();
    }, rand(9000, 22000));
  }

  // ── 공개 API ──

  const SFX = {
    start() {
      if (ac) { ac.resume(); return; }
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      ac = new Ctx();
      master = gain(volume);
      master.connect(ac.destination);
      noiseBuf = makeNoise();
      drone();
      wind();
      scheduleAmbience();
    },

    setVolume(v) {
      volume = v;
      if (master) master.gain.setTargetAtTime(v, ac.currentTime, 0.05);
    },

    hover() {
      if (!ac) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1500, t);
      o.frequency.exponentialRampToValueAtTime(1100, t + 0.05);
      const g = gain();
      env(g, t, 0.003, 0.025, 0.06);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.1);
    },

    click() {
      if (!ac) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.3);
      const g = gain();
      env(g, t, 0.005, 0.25, 0.3);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.4);

      const n = noise();
      const ng = gain();
      env(ng, t, 0.002, 0.08, 0.08);
      n.connect(filter('lowpass', 600)).connect(ng).connect(master);
      n.start(t);
      n.stop(t + 0.15);
    },

    type() {
      if (!ac) return;
      const t = ac.currentTime;
      const n = noise();
      const g = gain();
      env(g, t, 0.001, rand(0.025, 0.045), 0.02);
      n.connect(filter('highpass', rand(2200, 3200))).connect(g).connect(master);
      n.start(t, Math.random());
      n.stop(t + 0.04);
    },

    // 형광등 지직거림
    buzz() {
      if (!ac) return;
      const t = ac.currentTime;
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 100;
      const g = gain();
      env(g, t, 0.01, 0.03, rand(0.1, 0.3));
      o.connect(filter('bandpass', 1500, 2)).connect(g).connect(out(-0.2));
      o.start(t);
      o.stop(t + 0.5);
    },

    // 무언가 나타났을 때
    stinger() {
      if (!ac) return;
      const t = ac.currentTime;
      const lp = filter('lowpass', 300, 3);
      lp.frequency.exponentialRampToValueAtTime(2400, t + 1.4);
      const g = gain();
      env(g, t, 0.05, 0.06, 2.6);
      [233, 247, 262, 116.5].forEach(f => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(lp);
        o.start(t);
        o.stop(t + 3);
      });
      lp.connect(g).connect(master);

      const b = ac.createOscillator();
      b.frequency.setValueAtTime(55, t);
      b.frequency.exponentialRampToValueAtTime(30, t + 1.5);
      const bg = gain();
      env(bg, t, 0.01, 0.3, 1.5);
      b.connect(bg).connect(master);
      b.start(t);
      b.stop(t + 1.8);
    },

    // 교문 / 문 열림
    door() {
      if (!ac) return;
      creak(2.2, 0);
      const t = ac.currentTime + 1.6;
      const b = ac.createOscillator();
      b.frequency.setValueAtTime(70, t);
      b.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      const g = gain();
      env(g, t, 0.01, 0.35, 1.4);
      b.connect(g).connect(master);
      b.start(t);
      b.stop(t + 1.6);
    },
  };

  // ── 본편 효과음 ──

  function thump(t, freq, peak, len, dest = master) {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + len);
    const g = gain();
    env(g, t, 0.005, peak, len);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + len + 0.1);
  }

  function noiseHit(t, type, freq, peak, len, dest = master) {
    const n = noise();
    const g = gain();
    env(g, t, 0.003, peak, len);
    n.connect(filter(type, freq, 1.2)).connect(g).connect(dest);
    n.start(t, Math.random());
    n.stop(t + len + 0.05);
  }

  // 오르골: "꼭꼭 숨어라" 느낌의 단조 선율 (그것이 가까울수록 커진다)
  const MELODY = [659, 659, 523, 659, 0, 659, 523, 0, 587, 587, 494, 587, 523, 0, 0, 0];
  let mbGain = null, mbTimer = null, mbNext = 0, mbIdx = 0;
  function musicBoxLoop() {
    while (mbNext < ac.currentTime + 0.4) {
      const f = MELODY[mbIdx % MELODY.length];
      if (f) {
        [1, 2.01].forEach((m, i) => {
          const o = ac.createOscillator();
          o.frequency.value = f * m * (1 + (Math.random() - 0.5) * 0.006);
          const g = gain();
          env(g, mbNext, 0.004, i ? 0.03 : 0.09, 1.1);
          o.connect(g).connect(mbGain);
          o.start(mbNext);
          o.stop(mbNext + 1.3);
        });
      }
      mbIdx++;
      mbNext += 0.42 + Math.random() * 0.04;
    }
  }

  let hbRate = 0, hbTimer = null, hbGain = null;
  function heartbeatLoop() {
    if (!hbRate) { hbTimer = null; return; }
    const t = ac.currentTime + 0.05;
    thump(t, 60, 0.5, 0.16, hbGain);
    thump(t + 0.16, 52, 0.35, 0.16, hbGain);
    hbTimer = setTimeout(heartbeatLoop, 60000 / hbRate);
  }

  let ringTimer = null;

  Object.assign(SFX, {
    step(run) {
      if (!ac) return;
      noiseHit(ac.currentTime, 'lowpass', run ? 700 : 450, run ? 0.07 : 0.035, 0.07);
    },
    ghostSteps(pan = 0, vol = 1) {
      if (!ac) return;
      const lp = filter('lowpass', 300);
      const g = gain(vol);
      lp.connect(g).connect(out(pan));
      let t = ac.currentTime;
      for (let i = 0; i < 4; i++) { t += 0.7; thump(t, 70, 0.12, 0.2, lp); }
    },
    doorOpen() {
      if (!ac) return;
      const t = ac.currentTime;
      noiseHit(t, 'bandpass', 1400, 0.06, 0.45);
      thump(t + 0.35, 90, 0.18, 0.2);
    },
    locked() {
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0; i < 3; i++) noiseHit(t + i * 0.09, 'bandpass', 2400, 0.08, 0.05);
    },
    pickup() {
      if (!ac) return;
      const t = ac.currentTime;
      [880, 1320].forEach((f, i) => {
        const o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = gain();
        env(g, t + i * 0.09, 0.005, 0.05, 0.5);
        o.connect(g).connect(master);
        o.start(t + i * 0.09);
        o.stop(t + 0.8);
      });
    },
    paper() {
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0; i < 4; i++) noiseHit(t + i * 0.06, 'highpass', 3000, 0.04, 0.06);
    },
    flashClick() {
      if (!ac) return;
      noiseHit(ac.currentTime, 'highpass', 4000, 0.06, 0.02);
    },
    knock(n = 3) {
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0; i < n; i++) { thump(t + i * 0.55, 140, 0.35, 0.12); noiseHit(t + i * 0.55, 'bandpass', 900, 0.1, 0.06); }
    },
    piano() {
      if (!ac) return;
      const t = ac.currentTime;
      [277, 293.7].forEach(f => {
        const o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = gain();
        env(g, t, 0.01, 0.12, 2.5);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + 2.6);
      });
    },
    phone(on) {
      if (!ac) return;
      clearInterval(ringTimer);
      ringTimer = null;
      if (!on) return;
      const ring = () => {
        const t = ac.currentTime;
        const o = ac.createOscillator();
        o.type = 'square';
        o.frequency.value = 440;
        const m = ac.createOscillator();
        m.frequency.value = 20;
        const mg = gain(0.5);
        m.connect(mg);
        const g = gain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.02);
        g.gain.setValueAtTime(0.025, t + 1);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.05);
        mg.connect(g.gain);
        o.connect(filter('bandpass', 1200, 1)).connect(g).connect(out(0.3));
        o.start(t); m.start(t);
        o.stop(t + 1.1); m.stop(t + 1.1);
      };
      ring();
      ringTimer = setInterval(ring, 2200);
    },
    whisper() {
      if (!ac) return;
      const t = ac.currentTime;
      const n = noise();
      const bp = filter('bandpass', 1800, 4);
      bp.frequency.setValueAtTime(1200, t);
      bp.frequency.linearRampToValueAtTime(2600, t + 0.6);
      bp.frequency.linearRampToValueAtTime(1500, t + 1.4);
      const g = gain();
      env(g, t, 0.2, 0.12, 1.3);
      n.connect(bp).connect(g).connect(out(rand(-0.6, 0.6)));
      n.start(t);
      n.stop(t + 1.7);
    },
    scare() {
      if (!ac) return;
      SFX.stinger();
      const t = ac.currentTime;
      noiseHit(t, 'bandpass', 2000, 0.35, 0.9);
      [370, 392, 415].forEach(f => {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 1.2);
        const g = gain();
        env(g, t, 0.01, 0.08, 1.2);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + 1.4);
      });
    },
    musicBox(vol) {
      if (!ac) return;
      if (!mbGain) { mbGain = gain(0); mbGain.connect(out(0)); }
      mbGain.gain.setTargetAtTime(vol, ac.currentTime, 0.3);
      if (vol > 0 && !mbTimer) { mbNext = ac.currentTime + 0.1; mbTimer = setInterval(musicBoxLoop, 150); }
      if (vol <= 0 && mbTimer) setTimeout(() => { if (mbGain.gain.value < 0.01) { clearInterval(mbTimer); mbTimer = null; } }, 1500);
    },
    heartbeat(rate, vol = 1) {
      if (!ac) return;
      if (!hbGain) { hbGain = gain(1); hbGain.connect(master); }
      hbGain.gain.setTargetAtTime(vol, ac.currentTime, 0.2);
      const was = hbRate;
      hbRate = rate;
      if (rate && !was && !hbTimer) heartbeatLoop();
    },
    stopLoops() {
      SFX.musicBox(0);
      SFX.heartbeat(0);
      SFX.phone(false);
    },
  });

  window.SFX = SFX;
})();
