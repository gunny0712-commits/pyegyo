// 게임 입장 전 UI: 경고 → 타이틀 → 학생증(새 게임) → 인트로 → 본편 진입
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ── 저장소 ──

  const KEY_SETTINGS = 'wolha.settings';
  const KEY_SAVE = 'wolha.save';
  const KEY_CLEARED = 'wolha.cleared';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* 저장 불가 환경 */ } },
  };

  const DIFFICULTY = {
    tour: { name: '견학', desc: '손전등 배터리가 넉넉하다. 그것은 천천히 걷는다.' },
    explore: { name: '탐험', desc: '권장. 배터리는 아껴 써야 하고, 숨을 곳은 많지 않다.' },
    nightmare: { name: '악몽', desc: '저장할 수 없다. 그것은 발소리를 듣는다.' },
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = Object.assign(
    { volume: 70, brightness: 50, noise: true, reduceFlicker: reduceMotion },
    store.get(KEY_SETTINGS, {}),
  );

  function applySettings() {
    SFX.setVolume(settings.volume / 100);
    BG.setBrightness(settings.brightness / 100);
    BG.setReduceFlicker(settings.reduceFlicker);
    document.body.classList.toggle('no-noise', !settings.noise);
    document.body.classList.toggle('reduce-flicker', settings.reduceFlicker);
    Game.setSettings(settings);
    store.set(KEY_SETTINGS, settings);
  }

  // ── 화면 전환 ──

  const fade = $('#fade');
  let current = 'warning';
  let busy = false;

  function show(id) {
    if (busy) return Promise.resolve();
    busy = true;
    fade.classList.add('on');
    return wait(800).then(() => {
      $$('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
      current = id;
      document.body.dataset.screen = id;
      BG.setDim(id === 'title' ? 0 : 0.6);
      BG.setActive(id !== 'game');
      fade.classList.remove('on');
      onEnter(id);
      return wait(800);
    }).then(() => { busy = false; });
  }

  const STORY_TITLE = { school: '폐교', hotel: '체크아웃' };

  // 예전 형식({ trueEnd })은 에피소드 1 기록으로 읽는다
  function getCleared() {
    const c = store.get(KEY_CLEARED, {}) || {};
    return 'trueEnd' in c ? { school: { trueEnd: c.trueEnd } } : c;
  }

  function onEnter(id) {
    if (id === 'title') {
      const cleared = getCleared().school;
      $('.title-sub').textContent = cleared ? (cleared.trueEnd ? '술래의 사과' : '숨바꼭질은 끝났다') : '남겨진 교실';
      refreshContinue();
      selectBtn(menuBtns.find(b => !b.disabled));
    }
    if (id === 'story') {
      const cleared = getCleared();
      $$('[data-cleared]').forEach(b => {
        const c = cleared[b.dataset.cleared];
        b.textContent = c ? (c.trueEnd ? '진 엔딩 클리어' : '클리어') : '';
      });
      $('.story-card').focus();
    }
    if (id === 'newgame') openNewGame();
    if (id === 'police') openPolice();
    if (id === 'intro') runIntro();
  }

  function flash() {
    const el = $('#flash');
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }

  // ── 0. 경고 ──

  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    SFX.start();
    applySettings();
    SFX.click();
    show('title');
  }
  $('#screen-warning').addEventListener('click', enter);

  // ── 1. 타이틀 ──

  const menuBtns = $$('#menu button');
  const title = $('#title');

  function selectBtn(btn) {
    if (!btn) return;
    menuBtns.forEach(b => b.classList.toggle('sel', b === btn));
    btn.focus({ preventScroll: true });
  }

  menuBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (btn.disabled || btn.classList.contains('sel')) return;
      SFX.hover();
      selectBtn(btn);
    });
    btn.addEventListener('focus', () => menuBtns.forEach(b => b.classList.toggle('sel', b === btn)));
    btn.addEventListener('click', () => {
      if (busy) return;
      SFX.click();
      act(btn.dataset.action);
    });
  });

  function moveSelection(dir) {
    const list = menuBtns.filter(b => !b.disabled);
    let i = list.indexOf(document.activeElement);
    i = i < 0 ? 0 : (i + dir + list.length) % list.length;
    selectBtn(list[i]);
    SFX.hover();
  }

  function refreshContinue() {
    const save = store.get(KEY_SAVE, null);
    const btn = $('#btn-continue');
    btn.disabled = !save;
    $('#save-info').textContent = save
      ? `${STORY_TITLE[save.story || 'school']} · ${save.name} · ${save.chapter} · ${new Date(save.savedAt).toLocaleDateString('ko-KR')}`
      : '';
  }

  async function act(action) {
    if (action === 'new') {
      if (store.get(KEY_SAVE, null)) {
        const ok = await confirmBox('새로 시작할까요?', '이전 기록은 사라집니다.<br>그곳은 당신을 기억하겠지만.');
        if (!ok) return;
      }
      show('story');
    } else if (action === 'continue') {
      const save = store.get(KEY_SAVE, null);
      if (save) startGame(save);
    } else if (action === 'settings') {
      openSettings();
    } else if (action === 'credits') {
      $('#dlg-credits').showModal();
    }
  }

  // 벽에 휘갈겨진 낙서가 잠깐씩 보인다
  const NOTES = ['3반 교실엔 들어가지 마', '아직 여기 있어', '누가 불 껐어?', '출석부에 내 이름이 없어', '뒤 돌아보지 마', '같이 놀자', '나가는 문은 없어'];
  const note = $('#note');
  async function scrawl() {
    await wait(6000 + Math.random() * 8000);
    if (current === 'title' && !document.querySelector('dialog[open]')) {
      note.textContent = pick(NOTES);
      const narrow = window.innerWidth < 640;
      note.style.left = `${narrow ? 8 + Math.random() * 30 : 52 + Math.random() * 22}%`;
      note.style.top = `${narrow ? 8 + Math.random() * 20 : 12 + Math.random() * 60}%`;
      note.style.transform = `rotate(${-10 + Math.random() * 14}deg)`;
      note.classList.add('show');
      await wait(4200);
      note.classList.remove('show');
    }
    scrawl();
  }
  scrawl();

  function glitchTitle(ms = 320) {
    if (settings.reduceFlicker) return;
    title.classList.add('glitch');
    setTimeout(() => title.classList.remove('glitch'), ms);
  }
  (function glitchLoop() {
    setTimeout(() => { if (current === 'title') glitchTitle(); glitchLoop(); }, 7000 + Math.random() * 9000);
  })();

  BG.onFlicker = () => { if (current === 'title') SFX.buzz(); };

  // 복도 끝에 그것이 나타났을 때
  BG.onFigure = () => {
    if (current !== 'title') return;
    SFX.stinger();
    glitchTitle(600);
    const btn = pick(menuBtns.filter(b => !b.disabled));
    btn.textContent = pick(['돌아가', '나가', '보고있어']);
    btn.classList.add('possessed');
    setTimeout(() => { btn.textContent = btn.dataset.label; btn.classList.remove('possessed'); }, 700);
  };

  // 손전등은 포인터를 따라간다
  window.addEventListener('pointermove', e => BG.setPointer(e.clientX, e.clientY));
  window.addEventListener('pointerdown', e => BG.setPointer(e.clientX, e.clientY));

  // ── 확인 창 ──

  function confirmBox(head, msg) {
    const dlg = $('#dlg-confirm');
    $('#confirm-title').textContent = head;
    $('#confirm-msg').innerHTML = msg;
    dlg.returnValue = '';
    dlg.showModal();
    return new Promise(res => dlg.addEventListener('close', () => res(dlg.returnValue === 'ok'), { once: true }));
  }

  // ── 설정 ──

  const inVolume = $('#set-volume');
  const inBright = $('#set-brightness');
  const inNoise = $('#set-noise');
  const inFlicker = $('#set-flicker');

  function syncSettingsUI() {
    inVolume.value = settings.volume;
    inBright.value = settings.brightness;
    inNoise.checked = settings.noise;
    inFlicker.checked = settings.reduceFlicker;
    $('#out-volume').textContent = settings.volume;
    $('#out-brightness').textContent = settings.brightness;
    $('#calib').style.setProperty('--b', (0.4 + settings.brightness / 50).toFixed(2));
  }

  function openSettings() {
    syncSettingsUI();
    $('#dlg-settings').showModal();
  }

  inVolume.addEventListener('input', () => { settings.volume = +inVolume.value; applySettings(); syncSettingsUI(); });
  inVolume.addEventListener('change', () => SFX.hover());
  inBright.addEventListener('input', () => { settings.brightness = +inBright.value; applySettings(); syncSettingsUI(); });
  inNoise.addEventListener('change', () => { settings.noise = inNoise.checked; applySettings(); });
  inFlicker.addEventListener('change', () => { settings.reduceFlicker = inFlicker.checked; applySettings(); });

  $('#btn-wipe').addEventListener('click', async () => {
    const dlg = $('#dlg-settings');
    dlg.close();
    const ok = await confirmBox('기록을 지울까요?', '저장된 진행 상황이 모두 삭제됩니다.');
    if (ok) { store.del(KEY_SAVE); refreshContinue(); }
    openSettings();
  });

  $$('dialog').forEach(d => d.addEventListener('close', () => {
    if (current === 'title' && !document.querySelector('dialog[open]')) selectBtn(menuBtns.find(b => b.classList.contains('sel') && !b.disabled) || menuBtns[0]);
  }));

  // ── 2. 학생증 ──

  const form = $('#form-new');
  const inName = $('#in-name');

  function openNewGame() {
    form.reset();
    inName.classList.remove('err');
    inName.placeholder = '이름을 적으세요';
    $('#student-no').textContent = `1998-0203-${String(1 + Math.floor(Math.random() * 38)).padStart(2, '0')}`;
    updateDiff();
    setTimeout(() => inName.focus(), 50);
  }

  function updateDiff() {
    const v = form.difficulty.value;
    $('#diff-desc').textContent = DIFFICULTY[v].desc;
  }
  $$('input[name=difficulty]').forEach(r => r.addEventListener('change', () => { SFX.hover(); updateDiff(); }));
  inName.addEventListener('input', () => { if (Math.random() < 0.6) SFX.type(); });

  $('#btn-back').addEventListener('click', () => { SFX.click(); show('story'); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (busy) return;
    const name = inName.value.trim();
    if (!name) {
      inName.classList.add('err');
      inName.placeholder = '이름이 필요해.';
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      SFX.buzz();
      inName.focus();
      return;
    }
    const save = {
      story: 'school',
      name,
      studentNo: $('#student-no').textContent,
      difficulty: form.difficulty.value,
      chapter: '프롤로그',
      savedAt: Date.now(),
    };
    if (save.difficulty !== 'nightmare') store.set(KEY_SAVE, save);
    else store.del(KEY_SAVE);
    pending = save;
    SFX.door();
    show('intro');
  });

  // ── 2-2. 에피소드 선택 · 출동 지령서 ──

  $$('.story-card').forEach(c => {
    c.addEventListener('mouseenter', () => SFX.hover());
    c.addEventListener('click', () => { if (busy) return; SFX.click(); show(c.dataset.story === 'hotel' ? 'police' : 'newgame'); });
  });
  $('#btn-story-back').addEventListener('click', () => { SFX.click(); show('title'); });

  const POLICE_DIFF = {
    tour: '손전등 배터리가 넉넉하다. 지배인은 느리게 걷는다.',
    explore: '권장. 배터리는 아껴 써야 하고, 지배인은 열쇠 소리를 따라온다.',
    nightmare: '저장할 수 없다. 한 번 붙잡히면 끝이다.',
  };
  const policeForm = $('#form-police');
  const inOfficer = $('#in-officer');

  function openPolice() {
    policeForm.reset();
    inOfficer.classList.remove('err');
    inOfficer.placeholder = '경찰관 이름';
    $('#case-no').textContent = `2026-1102-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    updatePoliceDiff();
    setTimeout(() => inOfficer.focus(), 50);
  }
  function updatePoliceDiff() { $('#diff-desc-police').textContent = POLICE_DIFF[policeForm.difficulty.value]; }
  $$('#form-police input[name=difficulty]').forEach(r => r.addEventListener('change', () => { SFX.hover(); updatePoliceDiff(); }));
  inOfficer.addEventListener('input', () => { if (Math.random() < 0.6) SFX.type(); });
  $('#btn-police-back').addEventListener('click', () => { SFX.click(); show('story'); });

  policeForm.addEventListener('submit', e => {
    e.preventDefault();
    if (busy) return;
    const name = inOfficer.value.trim();
    if (!name) {
      inOfficer.classList.add('err');
      inOfficer.placeholder = '이름을 적어야 출동할 수 있다.';
      policeForm.classList.remove('shake');
      void policeForm.offsetWidth;
      policeForm.classList.add('shake');
      SFX.buzz();
      inOfficer.focus();
      return;
    }
    const save = { story: 'hotel', name, difficulty: policeForm.difficulty.value, chapter: '프롤로그 · 신고', savedAt: Date.now() };
    if (save.difficulty !== 'nightmare') store.set(KEY_SAVE, save);
    else store.del(KEY_SAVE);
    pending = save;
    SFX.door();
    show('intro');
  });

  // ── 3. 인트로 ──

  let pending = null;
  let introToken = 0;
  let introDone = false;

  function introLines(name, story) {
    if (story === 'hotel') return [
      { text: '새벽 2시 14분. 백운파출소에 전화가 걸려 왔다.' },
      { text: '"여기… 백운호텔인데요. 문이 안 열려요. 살려 주세요."' },
      { text: '통화는 거기서 끊겼다.' },
      { text: '백운호텔은 2004년 겨울, 불이 난 뒤로 문을 닫은 곳이다.', red: true },
      { text: `${name} 순경은 순찰차를 몰고 숲길로 들어섰다.` },
    ];
    return [
      { text: '1998년 3월, 월하고등학교는 문을 닫았다.' },
      { text: '이유를 말해 주는 사람은 아무도 없었다.' },
      { text: '스무 해가 지나 졸업앨범을 펼쳤을 때,' },
      { text: '내 사진 아래 적힌 이름은, 내 이름이 아니었다.', red: true },
      { text: `내 이름은 ${name}. 그래서 나는, 다시 그 교문 앞에 섰다.` },
    ];
  }

  async function runIntro() {
    const tok = ++introToken;
    introDone = false;
    const box = $('#intro-text');
    box.innerHTML = '';
    await wait(600);
    for (const line of introLines(pending.name, pending.story)) {
      if (tok !== introToken) return;
      const p = document.createElement('p');
      if (line.red) p.classList.add('red');
      box.appendChild(p);
      for (const ch of line.text) {
        if (tok !== introToken) return;
        p.textContent += ch;
        if (ch.trim()) SFX.type();
        await wait('.,…'.includes(ch) ? 280 : 60);
      }
      await wait(1000);
      p.classList.add('done');
    }
    await wait(900);
    if (tok === introToken) finishIntro();
  }

  function finishIntro() {
    if (introDone || current !== 'intro') return;
    introDone = true;
    introToken++;
    flash();
    SFX.stinger();
    startGame(pending);
  }

  $('#btn-skip').addEventListener('click', finishIntro);

  // ── 4. 본편 ──

  function startGame(save) {
    pending = save;
    show('game').then(() => {
      window.dispatchEvent(new CustomEvent('game:start', { detail: save }));
    });
    // 화면이 검게 덮인 뒤 본편을 시작한다
    setTimeout(() => Game.start(save, {
      onSave(state, chapter) {
        if (save.difficulty === 'nightmare') return;
        Object.assign(save, { state, chapter, savedAt: Date.now() });
        store.set(KEY_SAVE, save);
      },
      onPermadeath() { store.del(KEY_SAVE); },
      onClear(storyId, trueEnd) {
        store.del(KEY_SAVE);
        const cleared = getCleared();
        cleared[storyId] = { trueEnd: trueEnd || !!(cleared[storyId] && cleared[storyId].trueEnd) };
        store.set(KEY_CLEARED, cleared);
        exitGame();
      },
      onExit: exitGame,
      openSettings,
    }), 800);
  }

  function exitGame() {
    show('title').then(() => Game.stop());
  }

  // ── 키보드 ──

  document.addEventListener('keydown', e => {
    if (current === 'warning') { enter(); return; }
    if (busy || document.querySelector('dialog[open]')) return;

    if (current === 'title' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      moveSelection(e.key === 'ArrowDown' ? 1 : -1);
    } else if (current === 'intro' && ['Escape', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      finishIntro();
    } else if (current === 'newgame' && e.key === 'Escape') {
      show('story');
    } else if (current === 'police' && e.key === 'Escape') {
      show('story');
    } else if (current === 'story' && e.key === 'Escape') {
      show('title');
    }
  });

  syncSettingsUI();
  applySettings();
})();
