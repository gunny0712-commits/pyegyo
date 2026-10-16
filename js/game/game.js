// 본편 엔진: 이동·조사·숨기, 손전등, 그것(추적자) AI, 퍼즐 오버레이, 체크포인트, 엔딩.
// 스토리별 맵·대사·이벤트는 js/game/stories/*.js 에서 hooks로 넘겨받는다.
(() => {
  'use strict';
  const GAME = window.GAME;
  const { DIFF, R } = GAME;
  const $ = s => document.querySelector(s);

  const cvs = $('#game');
  const ctx = cvs.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');

  const el = {
    root: $('#screen-game'),
    chapter: $('#hud-chapter'), objective: $('#hud-objective'), obj: $('#hud-obj'),
    battery: $('#bar-battery'), stamina: $('#bar-stamina'),
    items: $('#hud-items'), place: $('#hud-place'), hint: $('#hud-hint'),
    sub: $('#subtitle'), veil: $('#hide-veil'), veilText: $('#hide-text'), fade: $('#game-fade'),
    note: $('#ov-note'), noteTitle: $('#note-title'), noteBody: $('#note-body'),
    book: $('#ov-book'), bookList: $('#book-list'),
    pause: $('#ov-pause'), dead: $('#ov-dead'), deadText: $('#dead-text'), deadRetry: $('#btn-retry'),
    ending: $('#ov-ending'), endingLines: $('#ending-lines'), endingFoot: $('#ending-foot'),
    keypad: $('#ov-keypad'), kpTitle: $('#keypad-title'), kpDisplay: $('#keypad-display'), kpKeys: $('#keypad-keys'),
    breaker: $('#ov-breaker'), brRow: $('#breaker-row'),
  };

  let W = 0, H = 0, DPR = 1, S = 1, offY = 0, viewW = 960;
  let ST = null;       // 현재 스토리
  let SCENES = {};
  let G = null;        // 현재 게임 상태
  let opts = {};
  let settings = { brightness: 0.5, reduceFlicker: false };
  let raf = 0, last = 0;
  let sayChain = Promise.resolve();
  const keys = new Set();
  const mouse = { x: 0, y: 0, active: false };

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const diff = () => DIFF[G.meta.difficulty] || DIFF.explore;
  const fill = s => s.replace(/\{name\}/g, G.meta.name);
  const realWait = ms => new Promise(r => setTimeout(r, ms));
  const forbidden = id => ST.forbidden.includes(id);
  const visible = o => (!o.showIf || G.flags.has(o.showIf)) && (!o.hideIf || !G.flags.has(o.hideIf));

  // ───────── 상태 ─────────

  function freshState(meta) {
    return {
      meta,
      scene: ST.start.scene, time: 0, playTime: 0,
      player: { x: ST.start.x, dir: 1, moving: false, running: false, stamina: 100, exhausted: false, step: 0, hidden: null, aim: 0.12 },
      flash: { on: true, battery: 100 }, flashWas: true,
      items: new Set(), notes: new Set(), flags: new Set(), vars: {},
      objective: ST.order[0],
      ghost: { active: false, scene: null, x: 0, dir: -1, state: 'offscreen', roamAt: 0, followAt: 0, followTo: null },
      final: null, phantom: null,
      cam: 0, lampOn: true, lampNext: 2, lampFlickerUntil: 0, lampTick: 0,
      phoneRinging: false, lock: 0, overlay: null, transitioning: false, dead: false,
      blackout: 0, shake: 0, enteredAt: 0, prompt: null, timers: [], checkpoint: null,
    };
  }

  function build(meta, snap) {
    const s = freshState(meta);
    if (!snap) return s;
    s.scene = snap.scene;
    s.player.x = snap.x;
    s.player.dir = snap.dir || 1;
    s.flash.battery = snap.battery ?? 100;
    s.items = new Set(snap.items);
    s.notes = new Set(snap.notes);
    s.flags = new Set(snap.flags);
    s.objective = snap.objective;
    s.playTime = snap.playTime || 0;
    if (snap.ghost) {
      s.ghost.active = true;
      s.ghost.scene = farScene(s.scene);
      s.ghost.roamAt = 12;
    }
    return s;
  }

  function snapshot() {
    return {
      scene: G.scene, x: Math.round(G.player.x), dir: G.player.dir,
      battery: Math.round(G.flash.battery),
      items: [...G.items], notes: [...G.notes], flags: [...G.flags],
      objective: G.objective, ghost: G.ghost.active, playTime: Math.round(G.playTime),
    };
  }

  function checkpoint() {
    if (!G || G.dead) return;
    G.checkpoint = snapshot();
    opts.onSave && opts.onSave(G.checkpoint, ST.chapters[G.objective]);
  }

  // ───────── 시간·자막·HUD ─────────

  function wait(sec) {
    const g = G;
    return new Promise(r => g.timers.push({ at: g.time + sec, r }));
  }

  const lock = () => { G.lock++; };
  const unlock = () => { G.lock = Math.max(0, G.lock - 1); };

  function say(text, who = 'me', dur) {
    const g = G;
    const d = dur ?? clamp(1.4 + text.length * 0.07, 2, 5);
    sayChain = sayChain.then(async () => {
      if (G !== g || g.dead) return;
      el.sub.className = `subtitle show ${who}`;
      el.sub.textContent = fill(text);
      await wait(d);
      if (G !== g) return;
      el.sub.classList.remove('show');
      await wait(0.25);
    });
    return sayChain;
  }

  let hintTimer = 0;
  function hint(text, sec = 6) {
    el.hint.textContent = text;
    el.hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => el.hint.classList.remove('show'), sec * 1000);
  }

  function setObjective(id) {
    if (ST.order.indexOf(id) <= ST.order.indexOf(G.objective)) return;
    G.objective = id;
    renderObjective(true);
    checkpoint();
  }

  function renderObjective(flash) {
    el.chapter.textContent = ST.chapters[G.objective];
    el.objective.textContent = ST.objectives[G.objective];
    if (flash) { el.obj.classList.remove('new'); void el.obj.offsetWidth; el.obj.classList.add('new'); }
  }

  function renderItems() {
    const chips = Object.keys(ST.items).filter(k => G.items.has(k)).map(k => `<span class="chip">${ST.items[k].name}</span>`);
    chips.push(`<span class="chip chip-note">쪽지 ${G.notes.size}/${Object.keys(ST.notes).length}</span>`);
    el.items.innerHTML = chips.join('');
  }

  function showPlace() {
    el.place.textContent = SCENES[G.scene].name;
    el.place.classList.remove('show');
    void el.place.offsetWidth;
    el.place.classList.add('show');
  }

  // ───────── 맵 그래프 ─────────

  const exits = id => SCENES[id].objects.filter(o => (o.type === 'door' || o.type === 'stairs') && o.to && o.to !== id);
  const neighbors = id => exits(id).map(o => o.to).filter(t => !forbidden(t));
  const doorTo = (id, to) => exits(id).find(o => o.to === to);

  function bfs(from) {
    const dist = { [from]: 0 }, prev = {}, q = [from];
    while (q.length) {
      const c = q.shift();
      for (const n of neighbors(c)) if (!(n in dist)) { dist[n] = dist[c] + 1; prev[n] = c; q.push(n); }
    }
    return { dist, prev };
  }

  function farScene(from) {
    const start = forbidden(from) ? neighbors(from)[0] || Object.keys(SCENES).find(k => !forbidden(k)) : from;
    const { dist } = bfs(start);
    return Object.keys(dist).filter(k => !forbidden(k)).sort((a, b) => dist[b] - dist[a])[0] || start;
  }

  function nextScene(from) {
    const ns = neighbors(from);
    if (Math.random() < 0.55 && !forbidden(G.scene)) {
      const { prev } = bfs(G.scene);
      if (prev[from]) return prev[from];
    }
    return ns.length ? pick(ns) : from;
  }

  // ───────── 상호작용 ─────────

  function nearest() {
    const p = G.player;
    let best = null, bd = 1e9;
    for (const o of SCENES[G.scene].objects) {
      if (!visible(o)) continue;
      if ((o.type === 'item' || o.type === 'note') && G.flags.has('took:' + o.id)) continue;
      const d = Math.abs(o.x - p.x);
      if (d < (o.w || 80) / 2 + 26 && d < bd) { best = o; bd = d; }
    }
    return best;
  }

  const needsItem = o => o.lock && !G.flags.has('unlocked:' + o.id);
  const needsFlag = o => o.needFlag && !G.flags.has(o.needFlag);

  function promptLabel(o) {
    if (G.player.hidden) return '나오기';
    if (o.type === 'door' && needsFlag(o)) return o.prompt ? `${o.prompt} · 작동 안 함` : '잠김';
    if (o.type === 'door' && needsItem(o)) return G.items.has(o.lock) ? '열쇠로 열기' : '잠김';
    if (o.prompt) return o.prompt;
    switch (o.type) {
      case 'door': return o.art === 'roomdoor' || o.label === '복도' ? '나가기' : '들어가기';
      case 'stairs': return o.dir === 'up' ? '올라가기' : '내려가기';
      case 'hide': return '숨기';
      case 'item': return '줍기';
      case 'note': return '읽기';
      default: return '살펴보기';
    }
  }

  function interact() {
    if (!G || G.lock || G.transitioning || G.dead || G.overlay) return;
    if (G.player.hidden) { unhide(); return; }
    const o = G.prompt;
    if (!o) return;
    switch (o.type) {
      case 'door': case 'stairs': useDoor(o); break;
      case 'hide': hide(o); break;
      case 'item': takeItem(o); break;
      case 'note': readNote(o); break;
      case 'use': ST.hooks.use[o.use](api, o); break;
      default: inspect(o);
    }
  }

  function useDoor(o) {
    const hooks = ST.hooks;
    if (needsFlag(o)) {
      SFX.locked();
      if (!(hooks.locked && hooks.locked(api, o))) say('잠겨 있다.');
      return;
    }
    if (needsItem(o)) {
      if (!G.items.has(o.lock)) {
        SFX.locked();
        if (!(hooks.locked && hooks.locked(api, o))) say('잠겨 있다.');
        return;
      }
      G.flags.add('unlocked:' + o.id);
      SFX.unlock();
      say(`${ST.items[o.lock].name}로 문을 열었다.`);
    }
    go(o.to, o.toX);
  }

  async function go(to, toX) {
    if (G.transitioning) return;
    const g0 = G;
    G.transitioning = true;
    lock();
    SFX.doorOpen();
    el.fade.classList.add('on');
    await wait(0.35);
    if (G !== g0) return;

    const from = G.scene;
    const gh = G.ghost;
    if (to !== from && gh.active && gh.scene === from && gh.state !== 'leave' && (gh.state === 'chase' || Math.abs(gh.x - G.player.x) < 380)) {
      gh.followAt = G.time + diff().follow * rand(0.85, 1.2);
      gh.followTo = to;
    }
    if (G.phoneRinging) { G.phoneRinging = false; SFX.phone(false); }
    if (G.final && to !== from) {
      // 막판 추격자를 떼어 놓고 나가면, 진짜 그것이 그 문으로 따라 나온다
      G.final = null;
      if (gh.active) Object.assign(gh, { scene: from, state: 'offscreen', followAt: G.time + diff().follow, followTo: to });
    }
    G.phantom = null;

    G.scene = to;
    G.player.x = toX;
    G.player.dir = toX < SCENES[to].width / 2 ? 1 : -1;
    G.enteredAt = G.time;
    snapCamera();
    el.fade.classList.remove('on');
    showPlace();
    G.transitioning = false;
    unlock();
    onEnterScene(to, from);
  }

  function hide(o) {
    const p = G.player, g = G.ghost;
    g.sawHide = g.active && g.scene === G.scene && g.state === 'chase' && Math.abs(g.x - p.x) < 320 ? o.id : null;
    p.hidden = o.id;
    p.x = o.x;
    G.flashWas = G.flash.on;
    G.flash.on = false;
    SFX.doorOpen();
    el.veilText.textContent = `${o.name}에 숨어 있다 · E 나오기`;
    el.veil.classList.add('on');
  }

  function unhide() {
    G.player.hidden = null;
    G.flash.on = G.flashWas && G.flash.battery > 0;
    SFX.doorOpen();
    el.veil.classList.remove('on');
  }

  function takeItem(o) {
    G.flags.add('took:' + o.id);
    SFX.pickup();
    if (o.item === 'battery') {
      G.flash.battery = Math.min(100, G.flash.battery + 45);
      say('건전지다. 손전등에 갈아 끼웠다.');
      return;
    }
    G.items.add(o.item);
    renderItems();
    ST.hooks.take && ST.hooks.take(api, o);
  }

  function readNote(o) {
    G.flags.add('took:' + o.id);
    G.notes.add(o.note);
    SFX.paper();
    renderItems();
    openNote(o.note, () => ST.hooks.note && ST.hooks.note(api, o));
  }

  async function inspect(o) {
    if (ST.hooks.inspect && await ST.hooks.inspect(api, o)) return;
    if (!o.lines) return;
    lock();
    for (const l of o.lines) await say(l);
    unlock();
  }

  function onEnterScene(to, from) {
    ST.hooks.enter && ST.hooks.enter(api, to, from);
    const g = G.ghost;
    if (!(g.active && (g.scene === to || g.followAt))) checkpoint();
  }

  async function caught(fromHide) {
    if (G.dead) return;
    G.dead = true;
    lock();
    if (G.player.hidden) { G.player.hidden = null; el.veil.classList.remove('on'); }
    SFX.scare();
    SFX.stopLoops();
    G.shake = 1;
    const g0 = G;
    await realWait(fromHide ? 900 : 1100);
    if (G !== g0) return;
    G.overlay = 'dead';
    el.deadText.textContent = pick(ST.lines.dead);
    const perma = diff().permadeath;
    el.deadRetry.hidden = perma;
    $('#dead-perma').hidden = !perma;
    el.dead.classList.add('on');
    if (perma) opts.onPermadeath && opts.onPermadeath();
    (perma ? $('#btn-dead-exit') : el.deadRetry).focus();
  }

  function retry() {
    const snap = G.checkpoint;
    const meta = G.meta;
    resetUI();
    G = build(meta, snap);
    G.checkpoint = snap;
    sayChain = Promise.resolve();
    afterLoad();
  }

  async function ending({ lines, title, metas = [], trueEnd }) {
    SFX.stopLoops();
    G.overlay = 'ending';
    el.ending.classList.add('on');
    el.endingLines.innerHTML = '';
    el.endingFoot.innerHTML = '';
    const g0 = G;
    for (const [t, cls] of lines) {
      await realWait(2300);
      if (G !== g0) return;
      const p = document.createElement('p');
      if (cls) p.className = cls;
      p.textContent = fill(t);
      el.endingLines.appendChild(p);
      SFX.type();
    }
    await realWait(2400);
    if (G !== g0) return;
    const mins = Math.floor(G.playTime / 60), secs = Math.floor(G.playTime % 60);
    el.endingFoot.innerHTML = `
      <p class="ending-title">${title}</p>
      <p class="ending-meta">플레이 시간 ${mins}분 ${secs}초 · 쪽지 ${G.notes.size}/${Object.keys(ST.notes).length}</p>
      ${metas.map(m => `<p class="ending-meta">${m}</p>`).join('')}
      <button class="btn" id="btn-ending-exit">타이틀로</button>`;
    $('#btn-ending-exit').addEventListener('click', () => { SFX.click(); opts.onClear && opts.onClear(ST.id, trueEnd); });
    $('#btn-ending-exit').focus();
  }

  // ───────── 퍼즐 오버레이 ─────────

  let kp = null;
  function keypad({ title, code, onWrong }) {
    return new Promise(resolve => {
      G.overlay = 'keypad';
      kp = { val: '', code, onWrong, fails: 0, resolve };
      el.kpTitle.textContent = title;
      renderKeypad();
      el.keypad.classList.add('on');
      el.kpKeys.querySelector('button').focus();
    });
  }
  function renderKeypad(state) {
    const n = kp.code.length;
    el.kpDisplay.textContent = (kp.val + '_'.repeat(n - kp.val.length)).split('').join(' ');
    el.kpDisplay.className = `keypad-display${state ? ' ' + state : ''}`;
  }
  function keypadPress(k) {
    if (!kp) return;
    if (k === 'back') kp.val = kp.val.slice(0, -1);
    else if (k === 'ok') return keypadSubmit();
    else if (kp.val.length < kp.code.length) kp.val += k;
    SFX.beep();
    renderKeypad();
    if (kp.val.length === kp.code.length) setTimeout(keypadSubmit, 250);
  }
  function keypadSubmit() {
    if (!kp || kp.val.length < kp.code.length) return;
    if (kp.val === kp.code) { renderKeypad('ok'); setTimeout(() => closeKeypad(true), 500); return; }
    kp.fails++;
    SFX.locked();
    renderKeypad('err');
    const n = kp.fails;
    const cb = kp.onWrong;
    setTimeout(() => { if (kp) { kp.val = ''; renderKeypad(); } }, 600);
    cb && cb(n);
  }
  function closeKeypad(ok) {
    if (!kp) return;
    el.keypad.classList.remove('on');
    G.overlay = null;
    const r = kp.resolve;
    kp = null;
    r(ok);
  }

  let br = null;
  function breakers({ answer, onWrong }) {
    return new Promise(resolve => {
      G.overlay = 'breaker';
      br = { state: answer.map(() => 0), answer, onWrong, resolve };
      el.brRow.innerHTML = answer.map((_, i) => `<button class="brk" data-i="${i}" aria-pressed="false"><i></i><span>${i + 1}</span></button>`).join('');
      el.breaker.classList.add('on');
      el.brRow.querySelector('button').focus();
    });
  }
  function toggleBreaker(i) {
    if (!br) return;
    br.state[i] = br.state[i] ? 0 : 1;
    SFX.breaker();
    const b = el.brRow.children[i];
    b.classList.toggle('up', !!br.state[i]);
    b.setAttribute('aria-pressed', String(!!br.state[i]));
  }
  function breakerGo() {
    if (!br) return;
    if (br.state.every((v, i) => v === br.answer[i])) { closeBreakers(true); return; }
    const cb = br.onWrong;
    closeBreakers(false);
    cb && cb();
  }
  function closeBreakers(ok) {
    if (!br) return;
    el.breaker.classList.remove('on');
    G.overlay = null;
    const r = br.resolve;
    br = null;
    r(ok);
  }

  el.kpKeys.addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) keypadPress(b.dataset.k); });
  $('#btn-keypad-close').addEventListener('click', () => closeKeypad(false));
  el.brRow.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) toggleBreaker(+b.dataset.i); });
  $('#btn-breaker-go').addEventListener('click', breakerGo);
  $('#btn-breaker-close').addEventListener('click', () => closeBreakers(false));

  // ───────── 스토리에 넘겨주는 API ─────────

  const api = {
    get G() { return G; },
    say, wait, hint, lock, unlock, setObjective, checkpoint, go, ending, keypad, breakers,
    objective: () => G.objective,
    scene: () => G.scene,
    diff: () => diff(),
    flag: f => G.flags.has(f),
    setFlag: f => G.flags.add(f),
    unsetFlag: f => G.flags.delete(f),
    has: item => G.items.has(item),
    give(item) { G.items.add(item); renderItems(); },
    shake(v) { G.shake = v; },
    blackout(v) { G.blackout = v; },
    ring(on) { G.phoneRinging = on; SFX.phone(on); },
    activateGhost(scene, delay = 9) {
      Object.assign(G.ghost, { active: true, scene, state: 'offscreen', roamAt: G.time + delay, followAt: 0 });
    },
    // 큰 소리를 냈다: 그것이 이 방으로 온다
    alertGhost() {
      const g = G.ghost;
      if (!g.active || g.scene === G.scene) return;
      const nb = neighbors(G.scene);
      if (!nb.length) return;
      Object.assign(g, { scene: nb.includes(g.scene) ? g.scene : nb[0], state: 'offscreen', followAt: G.time + 3, followTo: G.scene });
    },
    chaser({ x, speed, keys: jingle }) { G.final = { x, dir: 1, state: 'chase', speed, jingle }; },
    stopChaser() { if (G.final) G.final.state = 'idle'; },
  };

  // ───────── 그것 ─────────

  function detect() {
    const p = G.player, g = G.ghost, D = diff();
    if (p.hidden) return false;
    const dx = p.x - g.x, adx = Math.abs(dx);
    const facing = Math.sign(dx) === g.dir || adx < 110;
    if (facing && adx < (G.flash.on ? 560 : 230) * D.sight) return true;
    if (p.moving && p.running && adx < 650 * D.hear) return true;
    if (p.moving && adx < 140 * D.hear) return true;
    return false;
  }

  function moveGhost(g, target, speed, dt) {
    const d = target - g.x;
    if (Math.abs(d) < 1) return;
    g.dir = Math.sign(d);
    g.x += g.dir * Math.min(Math.abs(d), speed * dt);
  }

  function arrive(fromScene, state) {
    const g = G.ghost, p = G.player;
    const d = doorTo(G.scene, fromScene);
    const x = d ? d.x : 60;
    if (state === 'wander' && (G.time - G.enteredAt < 3 || (!p.hidden && Math.abs(p.x - x) < 170))) {
      g.roamAt = G.time + 4;
      return;
    }
    Object.assign(g, {
      scene: G.scene, x, dir: x < SCENES[G.scene].width / 2 ? 1 : -1,
      state, target: null, lost: 0, pauseUntil: 0, searchUntil: 0, lingered: false,
      leaveAt: G.time + rand(18, 30),
    });
    if (state === 'chase' && p.hidden) { g.state = 'search'; g.lastSeen = x + g.dir * 220; }
    SFX.doorOpen();
    if (ST.sound === 'hotel') SFX.keys();
    if (state === 'wander' && Math.random() < 0.7) { SFX.whisper(); say(pick(ST.lines.arrive), 'her'); }
  }

  function startChase() {
    const g = G.ghost;
    g.state = 'chase';
    g.lost = 0;
    SFX.stinger();
    G.shake = 0.4;
    say(pick(ST.lines.spot), 'her', 1.8);
  }

  function ghostUpdate(dt) {
    const g = G.ghost, p = G.player, D = diff();
    if (!g.active || G.dead) return;

    if (g.scene !== G.scene) {
      if (g.followAt) {
        if (G.time < g.followAt) return;
        g.followAt = 0;
        if (g.followTo === G.scene && !forbidden(G.scene)) { arrive(g.scene, 'chase'); return; }
        if (!forbidden(g.followTo)) g.scene = g.followTo;
        g.roamAt = G.time + D.roam * 0.5;
        return;
      }
      if (G.time >= g.roamAt) {
        g.roamAt = G.time + D.roam * rand(0.6, 1.3);
        const next = nextScene(g.scene);
        if (next === G.scene) arrive(g.scene, 'wander');
        else {
          g.scene = next;
          const d = doorTo(G.scene, next);
          if (d) SFX.ghostSteps(clamp((d.x - p.x) / 600, -1, 1), 0.8);
        }
      }
      return;
    }

    const adx = Math.abs(p.x - g.x);
    const sees = detect();
    const width = SCENES[G.scene].width;

    switch (g.state) {
      case 'wander':
        if (sees) { startChase(); break; }
        if (g.pauseUntil) {
          if (G.time > g.pauseUntil) g.pauseUntil = 0;
        } else if (g.target == null || Math.abs(g.target - g.x) < 6) {
          g.pauseUntil = G.time + rand(0.8, 2.2);
          g.target = p.hidden && Math.random() < 0.35 ? p.x + rand(-30, 30) : rand(120, width - 120);
        } else moveGhost(g, g.target, 55, dt);
        if (p.hidden && adx < 40 && !g.lingered) {
          g.lingered = true;
          g.pauseUntil = G.time + 3;
          say(pick(ST.lines.linger), 'her');
        }
        if (G.time > g.leaveAt) {
          const ex = exits(G.scene).filter(o => !forbidden(o.to));
          if (ex.length) { g.state = 'leave'; g.exit = pick(ex); } else g.leaveAt = G.time + 20;
        }
        break;

      case 'chase':
        if (p.hidden) {
          if (g.sawHide === p.hidden) { moveGhost(g, p.x, D.chase, dt); if (adx < 30) caught(true); }
          else { g.state = 'search'; g.lastSeen = p.x; g.searchUntil = 0; }
          break;
        }
        moveGhost(g, p.x, D.chase, dt);
        if (sees) g.lost = 0;
        else if ((g.lost += dt) > 4) { g.state = 'search'; g.lastSeen = p.x; g.searchUntil = 0; }
        if (adx < 38) caught(false);
        break;

      case 'search':
        if (sees) { startChase(); break; }
        if (Math.abs(g.lastSeen - g.x) > 8) moveGhost(g, g.lastSeen, 90, dt);
        else {
          if (!g.searchUntil) g.searchUntil = G.time + 4;
          g.dir = Math.floor(G.time / 0.9) % 2 ? 1 : -1;
          if (G.time > g.searchUntil) { g.state = 'wander'; g.target = null; g.leaveAt = Math.min(g.leaveAt, G.time + 10); }
        }
        break;

      case 'leave':
        if (sees) { startChase(); break; }
        moveGhost(g, g.exit.x, 70, dt);
        if (Math.abs(g.exit.x - g.x) < 8) {
          g.scene = g.exit.to;
          g.state = 'offscreen';
          g.roamAt = G.time + D.roam * rand(0.5, 1);
          SFX.doorOpen();
        }
        break;
      default:
        g.state = 'wander';
    }
  }

  // ───────── 업데이트 ─────────

  function snapCamera() {
    const sc = SCENES[G.scene];
    G.cam = sc.width <= viewW ? (sc.width - viewW) / 2 : clamp(G.player.x - viewW / 2, 0, sc.width - viewW);
  }

  const lampActive = sc => sc.lamp && (!sc.lampFlag || G.flags.has(sc.lampFlag));

  function update(dt) {
    G.time += dt;
    G.playTime += dt;
    for (let i = G.timers.length - 1; i >= 0; i--) {
      if (G.time >= G.timers[i].at) G.timers.splice(i, 1)[0].r();
    }

    const sc = SCENES[G.scene];
    const p = G.player, D = diff();

    let mv = 0;
    if (!G.lock && !p.hidden && !G.dead) {
      if (keys.has('ArrowLeft') || keys.has('KeyA')) mv -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) mv += 1;
    }
    p.moving = mv !== 0;
    const wantRun = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('TouchRun');
    if (p.exhausted && p.stamina > 30) p.exhausted = false;
    p.running = p.moving && wantRun && !p.exhausted;
    if (p.running) {
      p.stamina -= 24 * dt;
      if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; say('숨이 차…', 'me', 1.6); }
    } else p.stamina = Math.min(100, p.stamina + (p.moving ? 10 : 18) * dt);
    if (p.moving) {
      p.dir = mv;
      const sp = p.running ? 230 : 125;
      p.x = clamp(p.x + mv * sp * dt, 40, sc.width - 40);
      const prev = p.step;
      p.step += (dt * sp) / 14;
      if (Math.floor(prev / Math.PI) !== Math.floor(p.step / Math.PI)) SFX.step(p.running);
    }

    if (mouse.active) {
      const hx = (p.x + p.dir * 30 - G.cam) * S, hy = offY + (R.FEET - 72) * S;
      p.aim = clamp(Math.atan2(mouse.y - hy, Math.abs(mouse.x - hx) + 1), -0.45, 0.6);
    }

    if (G.flash.on) {
      G.flash.battery -= D.drain * dt;
      if (G.flash.battery <= 0) { G.flash.battery = 0; G.flash.on = false; say('손전등이 꺼졌다. 건전지가…'); }
    }

    // 깜빡이는 천장 조명
    if (lampActive(sc)) {
      if (settings.reduceFlicker) G.lampOn = true;
      else if (G.time < G.lampFlickerUntil) {
        if (G.time > G.lampTick) { G.lampOn = Math.random() > 0.5; G.lampTick = G.time + rand(0.04, 0.12); }
      } else if (G.time > G.lampNext) {
        G.lampFlickerUntil = G.time + rand(0.3, 1.1);
        G.lampNext = G.time + rand(3, 9);
        SFX.buzz();
      } else if (G.lampFlickerUntil) { G.lampOn = Math.random() > 0.2; G.lampFlickerUntil = 0; }
    }

    ghostUpdate(dt);

    const f = G.final;
    if (f && f.state === 'chase' && !G.dead) {
      moveGhost(f, p.x, f.speed, dt);
      if (f.jingle && Math.random() < dt * 1.2) SFX.keys();
      if (Math.abs(p.x - f.x) < 36) caught(false);
    }
    if (G.phantom) { G.phantom.x += 70 * dt; G.phantom.a = Math.max(0, G.phantom.a - dt * 0.3); }

    const target = sc.width <= viewW ? (sc.width - viewW) / 2 : clamp(p.x - viewW / 2 + p.dir * 80, 0, sc.width - viewW);
    G.cam += (target - G.cam) * (1 - Math.pow(0.02, dt));
    G.shake = Math.max(0, G.shake - dt * 1.5);

    G.prompt = !G.lock && !G.transitioning && !G.dead ? nearest() : null;
    if (p.hidden) G.prompt = sc.objects.find(o => o.id === p.hidden);

    mixAudio();
    el.battery.style.width = `${G.flash.battery}%`;
    el.battery.parentElement.classList.toggle('low', G.flash.battery < 20);
    el.stamina.style.width = `${p.stamina}%`;
  }

  function mixAudio() {
    const g = G.ghost, p = G.player;
    const f = G.final;
    if (G.dead) return;
    let near = Infinity, chasing = false;
    if (g.active && g.scene === G.scene) { near = Math.abs(g.x - p.x); chasing = g.state === 'chase'; }
    if (f && f.state === 'chase') { near = Math.abs(f.x - p.x); chasing = true; }
    const present = near < Infinity;
    SFX.musicBox(present && !chasing ? clamp(1 - near / 900, 0.05, 1) * 0.6 : 0);
    const rate = chasing ? 150 : present && (near < 450 || p.hidden) ? 110 : 0;
    SFX.heartbeat(rate, chasing ? 1 : 0.6);
    el.root.classList.toggle('danger', chasing);
  }

  // ───────── 그리기 ─────────

  function hole(x, y, r, a) {
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.5, `rgba(0,0,0,${a * 0.7})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function cone(x, y, len, ang, half, a) {
    const g = mctx.createRadialGradient(x, y, 0, x, y, len);
    g.addColorStop(0, `rgba(0,0,0,${a})`);
    g.addColorStop(0.6, `rgba(0,0,0,${a * 0.8})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.moveTo(x, y);
    mctx.arc(x, y, len, ang - half, ang + half);
    mctx.closePath();
    mctx.fill();
  }

  function render() {
    const sc = SCENES[G.scene];
    const p = G.player;
    const look = ST.look;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    const k = settings.reduceFlicker ? 0.3 : 1;
    const sx = (Math.random() - 0.5) * 16 * G.shake * k, sy = (Math.random() - 0.5) * 10 * G.shake * k;
    const tx = x => (x - G.cam) * S + sx, ty = y => offY + y * S + sy;
    const x0 = G.cam, x1 = G.cam + viewW;
    const g = G.ghost;
    const ghostHere = g.active && g.scene === G.scene;

    const world = () => {
      ctx.save();
      ctx.translate(sx, offY + sy);
      ctx.scale(S, S);
      ctx.translate(-G.cam, 0);
    };

    world();
    ctx.beginPath(); ctx.rect(0, 0, sc.width, 540); ctx.clip();
    R.scene(ctx, sc, x0, x1, G);
    if (!p.hidden) R.player(ctx, p, look.player);
    if (ghostHere) R.ghost(ctx, g, G.time, 1, look.ghost);
    if (G.final) R.ghost(ctx, G.final, G.time, 1, look.ghost);
    R.foreground(ctx, sc, G.cam, x0, x1);
    ctx.restore();

    // 어둠
    const amb = G.blackout ? 0.995 : 0.965 - settings.brightness * 0.14 - (G.flags.has('power') && sc.powered !== false && ST.id === 'hotel' && sc.kind !== 'burned' && sc.kind !== 'stairwell' ? 0.06 : 0);
    mctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    mctx.globalCompositeOperation = 'source-over';
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = `rgba(0,0,0,${amb})`;
    mctx.fillRect(0, 0, W, H);
    mctx.globalCompositeOperation = 'destination-out';
    if (!G.blackout) {
      (sc.windows || []).forEach(wx => {
        if (wx < x0 - 300 || wx > x1 + 300) return;
        hole(tx(wx), ty(sc.kind === 'corridor' ? 130 : 170), 150 * S, 0.32);
        hole(tx(wx + 50), ty(500), 110 * S, 0.16);
      });
      (sc.lights || []).forEach(l => hole(tx(l.x), ty(l.y), l.r * S, l.a));
      if (G.flags.has('power')) (sc.sconces || []).forEach(x => hole(tx(x), ty(200), 140 * S, 0.45));
      if (lampActive(sc) && G.lampOn) hole(tx(sc.lamp), ty(220), 330 * S, 0.75);
      if (!p.hidden) hole(tx(p.x), ty(430), 120 * S, G.flash.on ? 0.45 : 0.3);
      if (G.flash.on && !p.hidden) {
        const b = G.flash.battery;
        let pw = (0.7 + 0.3 * Math.min(1, b / 30)) * (b < 15 && Math.random() < 0.12 ? 0.25 : 1);
        if (((g.state === 'chase' && ghostHere) || G.final) && Math.random() < 0.05 && !settings.reduceFlicker) pw *= 0.3;
        const hx = tx(p.x + p.dir * 30), hy = ty(R.FEET - 72);
        const ang = p.dir > 0 ? p.aim : Math.PI - p.aim;
        cone(hx, hy, 580 * S * pw, ang, 0.34, pw);
        cone(hx, hy, 640 * S * pw, ang, 0.56, 0.35 * pw);
      }
    }
    ctx.drawImage(mask, 0, 0, W, H);

    // 어둠 속에서도 희미하게 보이는 것들
    world();
    if (ghostHere) R.ghost(ctx, g, G.time, 0.13, look.ghost);
    if (G.final) R.ghost(ctx, G.final, G.time, 0.13, look.ghost);
    if (G.phantom) R.ghost(ctx, G.phantom, G.time, G.phantom.a * 0.6, look.ghost);
    ctx.restore();

    // 아이템 반짝임
    const pulse = 0.25 + 0.2 * Math.sin(G.time * 3);
    for (const o of sc.objects) {
      if ((o.type !== 'item' && o.type !== 'note') || G.flags.has('took:' + o.id) || !visible(o)) continue;
      if (o.x < x0 - 50 || o.x > x1 + 50) continue;
      ctx.fillStyle = `rgba(255,240,200,${pulse})`;
      ctx.beginPath();
      ctx.arc(tx(o.x), ty(R.surfaceY(o) - 6), 2.2 * S, 0, Math.PI * 2);
      ctx.fill();
    }

    // 상호작용 안내
    if (G.prompt && !G.overlay) {
      const o = G.prompt;
      const label = promptLabel(o);
      const bad = label === '잠김' || label.endsWith('작동 안 함');
      const px = tx(o.x), py = ty(R.promptY(o));
      ctx.font = `${Math.round(12 * Math.max(1, S * 0.8))}px ${R.MONO}`;
      const w = ctx.measureText(`E  ${label}`).width + 18;
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(px - w / 2, py - 13, w, 26);
      ctx.strokeStyle = bad ? 'rgba(179,38,30,.7)' : 'rgba(214,207,191,.35)';
      ctx.strokeRect(px - w / 2, py - 13, w, 26);
      ctx.fillStyle = bad ? '#d98b84' : '#d6cfbf';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`E  ${label}`, px, py + 1);
    }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = now / 1000;
    const dt = Math.min(0.05, t - last || 0.016);
    last = t;
    if (!G) return;
    if (!G.overlay && !document.querySelector('dialog[open]')) update(dt);
    render();
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    [cvs, mask].forEach(c => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    S = Math.min(H / 540, W / 640);
    offY = (H - 540 * S) / 2;
    viewW = W / S;
    if (G) snapCamera();
  }

  // ───────── 오버레이 ─────────

  let noteDone = null;
  function openNote(id, done) {
    const n = ST.notes[id];
    G.overlay = 'note';
    noteDone = done || null;
    el.noteTitle.textContent = n.title;
    el.noteBody.className = `note-body${n.hand ? ' hand' : ''}`;
    el.noteBody.innerHTML = n.body.map(l => `<p>${fill(l) || '&nbsp;'}</p>`).join('');
    el.note.classList.add('on');
  }
  function closeNote() {
    el.note.classList.remove('on');
    G.overlay = el.book.classList.contains('on') ? 'book' : null;
    const d = noteDone;
    noteDone = null;
    d && d();
  }

  function openBook() {
    G.overlay = 'book';
    const list = Object.keys(ST.notes).map(id => G.notes.has(id)
      ? `<li><button data-note="${id}">${ST.notes[id].title}</button></li>`
      : '<li class="missing">— 찾지 못한 쪽지 —</li>');
    el.bookList.innerHTML = list.join('');
    el.book.classList.add('on');
    const first = el.bookList.querySelector('button');
    (first || $('#btn-book-close')).focus();
  }
  function closeBook() { el.book.classList.remove('on'); G.overlay = null; }

  function openPause() {
    G.overlay = 'pause';
    el.pause.classList.add('on');
    $('#btn-resume').focus();
  }
  function closePause() { el.pause.classList.remove('on'); G.overlay = null; }

  function resetUI() {
    [el.note, el.book, el.pause, el.dead, el.ending, el.keypad, el.breaker].forEach(o => o.classList.remove('on'));
    kp = null;
    br = null;
    el.veil.classList.remove('on');
    el.sub.className = 'subtitle';
    el.fade.classList.remove('on');
    el.root.classList.remove('danger');
    keys.clear();
    SFX.stopLoops();
  }

  el.bookList.addEventListener('click', e => {
    const b = e.target.closest('button[data-note]');
    if (b) { SFX.paper(); openNote(b.dataset.note); }
  });
  $('#btn-book-close').addEventListener('click', closeBook);
  el.note.addEventListener('click', closeNote);
  $('#btn-resume').addEventListener('click', () => { SFX.click(); closePause(); });
  $('#btn-pause-book').addEventListener('click', () => { closePause(); openBook(); });
  $('#btn-pause-settings').addEventListener('click', () => opts.openSettings && opts.openSettings());
  $('#btn-pause-exit').addEventListener('click', () => { SFX.click(); opts.onExit && opts.onExit(); });
  el.deadRetry.addEventListener('click', () => { SFX.click(); retry(); });
  $('#btn-dead-exit').addEventListener('click', () => { SFX.click(); opts.onExit && opts.onExit(); });

  // ───────── 입력 ─────────

  const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'ShiftLeft', 'ShiftRight'];
  const ACT_KEYS = ['KeyE', 'Space', 'ArrowUp', 'KeyW', 'Enter'];

  function toggleFlash() {
    if (G.player.hidden || G.blackout) return;
    if (!G.flash.on && G.flash.battery <= 0) { say('불이 들어오지 않는다.'); return; }
    G.flash.on = !G.flash.on;
    SFX.flashClick();
  }

  document.addEventListener('keydown', e => {
    if (!G || !el.root.classList.contains('active') || document.querySelector('dialog[open]')) return;
    const c = e.code;

    if (G.overlay === 'keypad') {
      if (/^\d$/.test(e.key)) keypadPress(e.key);
      else if (e.key === 'Backspace') keypadPress('back');
      else if (e.key === 'Escape') closeKeypad(false);
      else if (e.key === 'Enter') { e.preventDefault(); keypadSubmit(); }
      return;
    }
    if (G.overlay === 'breaker') {
      if (/^[1-9]$/.test(e.key) && +e.key <= br.answer.length) toggleBreaker(+e.key - 1);
      else if (e.key === 'Escape') closeBreakers(false);
      return;
    }

    if (MOVE_KEYS.includes(c) || ACT_KEYS.includes(c) || c === 'Tab') e.preventDefault();

    if (G.overlay === 'note') { if (c === 'Escape' || ACT_KEYS.includes(c)) closeNote(); return; }
    if (G.overlay === 'book') { if (c === 'Escape' || c === 'KeyQ' || c === 'Tab') closeBook(); return; }
    if (G.overlay === 'pause') { if (c === 'Escape') closePause(); return; }
    if (G.overlay) return;

    if (MOVE_KEYS.includes(c)) keys.add(c);
    if (e.repeat) return;
    if (c === 'Escape') openPause();
    else if (c === 'KeyF') toggleFlash();
    else if (c === 'KeyQ' || c === 'Tab') openBook();
    else if (ACT_KEYS.includes(c)) interact();
  });
  document.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  cvs.addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = e.pointerType === 'mouse'; });

  // 터치 조작
  document.querySelectorAll('#touch [data-k]').forEach(b => {
    const k = b.dataset.k;
    const down = e => {
      e.preventDefault();
      if (!G || G.overlay) return;
      if (k === 'act') interact();
      else if (k === 'flash') toggleFlash();
      else if (k === 'menu') openPause();
      else keys.add(k);
    };
    const up = () => keys.delete(k);
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });

  window.addEventListener('resize', resize);

  // ───────── 공개 API ─────────

  function afterLoad() {
    snapCamera();
    renderObjective(false);
    renderItems();
    showPlace();
    if (!G.flags.has('intro')) { G.flags.add('intro'); ST.hooks.intro(api); }
    else onEnterScene(G.scene, null);
  }

  window.Game = {
    start(save, options) {
      opts = options || {};
      ST = GAME.STORIES[save.story || 'school'];
      SCENES = ST.scenes;
      SFX.setTheme(ST.sound);
      resize();
      resetUI();
      sayChain = Promise.resolve();
      G = build({ name: save.name, difficulty: save.difficulty }, save.state || null);
      if (save.state) G.checkpoint = save.state;
      afterLoad();
      if (!raf) { last = performance.now() / 1000; raf = requestAnimationFrame(frame); }
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      resetUI();
      G = null;
    },
    setSettings(s) {
      settings = { brightness: s.brightness / 100, reduceFlicker: s.reduceFlicker };
    },
  };
})();
