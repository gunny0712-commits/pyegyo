// 에피소드 1 · 폐교 — 남겨진 교실
// 맵(장면)·아이템·쪽지·목표와 스토리 이벤트(hooks). 엔진은 js/game/game.js.
(() => {
  'use strict';
  const GAME = window.GAME;

  const desk = (x, extra = {}) => ({ t: 'desk', x, ...extra });

  const scenes = {
    hall1: {
      name: '1층 복도', kind: 'corridor', width: 2200,
      windows: [260, 620, 1090, 1400, 1650, 1960],
      objects: [
        { id: 'h1-front', type: 'inspect', art: 'frontdoor', x: 120, w: 200,
          lines: ['현관문이… 밖에서 잠겼다?', '들어올 때는 분명 열려 있었는데.'] },
        { id: 'h1-office', type: 'door', x: 420, label: '교무실', to: 'office', toX: 180 },
        { id: 'h1-locker1', type: 'hide', art: 'locker', x: 760, name: '사물함' },
        { id: 'h1-trophy', type: 'inspect', art: 'trophy', x: 980, w: 120,
          lines: ['1997 전국 학생 합창대회 장려상.', '단체 사진 속, 한 아이의 얼굴만 긁혀 있다.'] },
        { id: 'h1-nurse', type: 'door', x: 1250, label: '보건실', to: 'nurse', toX: 180 },
        { id: 'h1-locker2', type: 'hide', art: 'locker', x: 1500, name: '사물함' },
        { id: 'h1-bat', type: 'item', item: 'battery', x: 1660, surface: 'floor' },
        { id: 'h1-admin', type: 'inspect', art: 'door', label: '행정실', x: 1840, w: 120,
          lines: ['잠겨 있다. 열쇠 구멍이 녹으로 막혔다.'] },
        { id: 'h1-stairs', type: 'stairs', dir: 'up', x: 2080, to: 'hall2', toX: 220 },
      ],
    },

    office: {
      name: '교무실', kind: 'office', width: 1300,
      windows: [420, 760, 1060],
      deco: [{ t: 'officeDesk', x: 300 }, { t: 'officeDesk', x: 520 }, { t: 'officeDesk', x: 900 }, { t: 'fileCab', x: 1230 }],
      objects: [
        { id: 'o-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall1', toX: 420 },
        { id: 'o-phone', type: 'inspect', art: 'phone', x: 540, w: 70,
          lines: ['낡은 내선 전화기. 선이 끊겨 있다.'] },
        { id: 'o-hide', type: 'hide', art: 'bigdesk', x: 720, name: '책상 아래' },
        { id: 'o-note', type: 'note', note: 'n1', x: 900, surface: 'officeDesk' },
        { id: 'o-key', type: 'item', item: 'key23', x: 1110, surface: 'keybox' },
      ],
    },

    nurse: {
      name: '보건실', kind: 'nurse', width: 1000,
      windows: [520, 800],
      deco: [{ t: 'bed', x: 560 }],
      objects: [
        { id: 'n-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall1', toX: 1250 },
        { id: 'n-bed', type: 'hide', art: 'bedCurtain', x: 340, name: '커튼 뒤' },
        { id: 'n-note', type: 'note', note: 'n2', x: 700, surface: 'smallDesk' },
        { id: 'n-bat', type: 'item', item: 'battery', x: 830, surface: 'medcab' },
        { id: 'n-mirror', type: 'inspect', art: 'mirror', x: 930, w: 80,
          lines: ['거울에 비친 내 뒤로… 아무도 없다.', '없어야 한다.'] },
      ],
    },

    hall2: {
      name: '2층 복도', kind: 'corridor', width: 2600, lamp: 1600,
      windows: [560, 840, 1150, 1760, 2040, 2270],
      objects: [
        { id: 'h2-stairs', type: 'stairs', dir: 'down', x: 120, to: 'hall1', toX: 1980 },
        { id: 'h2-c21', type: 'door', x: 380, label: '2-1', to: 'c21', toX: 180 },
        { id: 'h2-locker1', type: 'hide', art: 'locker', x: 700, name: '사물함' },
        { id: 'h2-c22', type: 'door', x: 980, label: '2-2', to: 'c22', toX: 180 },
        { id: 'h2-locker2', type: 'hide', art: 'locker', x: 1300, name: '사물함' },
        { id: 'h2-poster', type: 'inspect', art: 'poster', x: 1440, w: 70,
          lines: ['"친구를 소중히" 표어.', '누군가 "친구"에 줄을 긋고 "술래"라고 고쳐 썼다.'] },
        { id: 'h2-c23', type: 'door', x: 1580, label: '2-3', to: 'c23', toX: 180, lock: 'key23', crooked: true },
        { id: 'h2-toilet', type: 'door', x: 1900, label: '화장실', to: 'toilet', toX: 180 },
        { id: 'h2-locker3', type: 'hide', art: 'locker', x: 2150, name: '사물함' },
        { id: 'h2-music', type: 'door', x: 2400, label: '음악실', to: 'music', toX: 180, lock: 'keyMusic' },
      ],
    },

    c21: {
      name: '2학년 1반', kind: 'classroom', width: 1200,
      windows: [560, 820, 1060],
      deco: [desk(470), desk(610, { fallen: true }), desk(760), desk(900)],
      objects: [
        { id: 'c21-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall2', toX: 380 },
        { id: 'c21-board', type: 'inspect', art: 'blackboard', x: 330, w: 300,
          chalk: ['3월 6일 (금)', '주번 : 한소연'],
          lines: ['날짜가 1998년 3월 6일에 멈춰 있다.', '주번 이름만 누군가 손바닥으로 문질러 지우려 한 자국.'] },
        { id: 'c21-note', type: 'note', note: 'n3', x: 760, surface: 'desk' },
        { id: 'c21-hide', type: 'hide', art: 'cabinet', x: 1080, name: '청소함' },
      ],
    },

    c22: {
      name: '2학년 2반', kind: 'classroom', width: 1200,
      windows: [560, 820, 1060],
      deco: [desk(470), desk(600), desk(900, { fallen: true })],
      objects: [
        { id: 'c22-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall2', toX: 980 },
        { id: 'c22-board', type: 'inspect', art: 'blackboard', x: 330, w: 300,
          chalk: ['자 습', '떠든 사람 :'],
          lines: ['"떠든 사람" 밑에 이름이 빼곡하다.', '전부 같은 글씨로, 전부 같은 이름. …한소연.'] },
        { id: 'c22-bat', type: 'item', item: 'battery', x: 600, surface: 'desk' },
        { id: 'c22-hide', type: 'hide', art: 'cabinet', x: 760, name: '청소함' },
        { id: 'c22-lockers', type: 'inspect', art: 'lockers', x: 1060, w: 180,
          lines: ['교실 뒤 사물함.', '이름표가 하나도 빠짐없이 떼어져 있다.'] },
      ],
    },

    c23: {
      name: '2학년 3반', kind: 'classroom', width: 1400,
      windows: [700, 960, 1220],
      deco: [desk(820), desk(1100, { fallen: true })],
      objects: [
        { id: 'c23-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall2', toX: 1580 },
        { id: 'c23-board', type: 'inspect', art: 'blackboard', x: 340, w: 300,
          chalk: ['찾아줘  찾아줘', '찾아줘  찾아줘  찾아줘'],
          chalkAfter: ['이번엔', '네가 숨어'],
          lines: ['칠판 가득, 같은 글씨.', '…분필 가루가 아직 떨어지고 있다.'] },
        { id: 'c23-roster', type: 'item', item: 'roster', x: 600, surface: 'podium' },
        { id: 'c23-note', type: 'note', note: 'n4', x: 960, surface: 'desk', flower: true },
        { id: 'c23-hide', type: 'hide', art: 'cabinet', x: 1280, name: '청소함' },
      ],
    },

    toilet: {
      name: '화장실', kind: 'toilet', width: 1100,
      windows: [],
      objects: [
        { id: 't-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall2', toX: 1900 },
        { id: 't-sink', type: 'inspect', art: 'sink', x: 310, w: 140,
          lines: ['수도꼭지에서 물이 한 방울씩 떨어진다.', '이십 년 동안 닫혀 있던 학교인데.'] },
        { id: 't-stall1', type: 'hide', art: 'stall', x: 560, name: '첫째 칸' },
        { id: 't-stall2', type: 'hide', art: 'stall', x: 740, name: '둘째 칸' },
        { id: 't-stall3', type: 'use', use: 'stall', art: 'stall', x: 920, prompt: '열어 보기' },
      ],
    },

    music: {
      name: '음악실', kind: 'music', width: 1300,
      windows: [640, 980],
      deco: [{ t: 'portrait', x: 300, eyes: true }, { t: 'portrait', x: 560, eyes: true }, { t: 'portrait', x: 820, eyes: true }, { t: 'stand', x: 640 }, { t: 'stand', x: 1000 }],
      objects: [
        { id: 'm-door', type: 'door', art: 'roomdoor', x: 100, to: 'hall2', toX: 2400 },
        { id: 'm-piano', type: 'inspect', art: 'piano', x: 430, w: 180,
          lines: ['건반 하나가 눌린 채 올라오지 않는다.', '…방금, 소리가 났던가.'] },
        { id: 'm-bat', type: 'item', item: 'battery', x: 640, surface: 'stand' },
        { id: 'm-hide', type: 'hide', art: 'curtain', x: 860, name: '커튼 뒤' },
        { id: 'm-prep', type: 'door', x: 1170, label: '준비실', to: 'storage', toX: 180 },
      ],
    },

    storage: {
      name: '음악준비실', kind: 'storage', width: 1000,
      windows: [],
      deco: [{ t: 'shelf', x: 330 }, { t: 'case', x: 470 }, { t: 'shelf', x: 590 }, { t: 'case', x: 660 }],
      objects: [
        { id: 's-door', type: 'door', art: 'roomdoor', x: 100, to: 'music', toX: 1170 },
        { id: 's-wardrobe', type: 'use', use: 'wardrobe', art: 'wardrobe', x: 840, prompt: '열기' },
      ],
    },
  };

  const notes = {
    n1: {
      title: '담임 수첩',
      body: [
        '1998. 3. 6.',
        '야자 감독 중 2-3 한소연 귀가 확인 안 됨.',
        '아이들은 "먼저 집에 갔다"고 한다. 다들 눈을 피한다.',
        '',
        '3. 9. 경찰 다녀감.',
        '교장 선생님께서 일을 크게 만들지 말라 하심.',
        '',
        '3. 14. 출석부에서 이름을 빼라는 지시.',
        '…내가 할 수 있는 일이 없다.',
      ],
    },
    n2: {
      title: '보건 일지',
      body: [
        '3월 4일. 2-3 한소연. 두통 호소.',
        '"선생님, 숨바꼭질 하면 술래는 꼭 찾아 줘야 하는 거죠?"',
        '이상한 질문. 반에 어울리는 친구가 없다고 함. 상담 권유.',
        '',
        '3월 5일. 오늘은 얼굴이 밝았다.',
        '친구들이 같이 놀자고 했다며 웃었다.',
      ],
    },
    n3: {
      title: '구겨진 쪽지',
      hand: true,
      body: [
        '오늘 야자 끝나고 학교에서 숨바꼭질 ㄱ?',
        '한소연도 끼워 주자 ㅋㅋ 걔 진짜 잘 숨을 듯',
        '',
        '술래는 {name}',
        '열 세고 대충 찾는 척하다가 다 같이 튀자',
        '',
        '아무한테도 말하지 마',
      ],
    },
    n4: {
      title: '소연이의 일기',
      hand: true,
      body: [
        '3월 5일',
        '오늘 처음으로 같이 놀자는 말을 들었다.',
        '',
        '나는 음악준비실 장롱에 숨을 거다. 거기는 아무도 안 온다.',
        '음악실 열쇠는 내가 화장실 당번이라 맨 끝 칸에 숨겨 뒀다.',
        '',
        '술래는 {name}.',
        '꼭 찾아 줘.',
      ],
    },
  };

  // ── 이벤트 ──

  async function phantomEvent(api) {
    api.setFlag('seen2');
    await api.wait(0.8);
    api.G.phantom = { x: 720, dir: 1, a: 0.9, state: 'wander' };
    SFX.stinger();
    await api.wait(2.6);
    api.G.phantom = null;
    api.say('…방금, 누가 2-2반으로 들어갔어?');
  }

  async function phoneEvent(api) {
    await api.wait(1.5);
    if (api.scene() !== 'office' || api.flag('phoneRing')) return;
    api.setFlag('phoneRing');
    api.ring(true);
    await api.wait(10);
    if (api.G.phoneRinging) api.ring(false);
  }

  async function phoneCall(api) {
    api.ring(false);
    api.lock();
    await api.say('…여보세요?');
    SFX.whisper();
    await api.say('……{name}?', 'her', 2.6);
    await api.say('왜 안 찾으러 와?', 'her', 2.6);
    await api.say('끊겼다. 전화선은 처음부터 끊겨 있었는데.');
    api.unlock();
  }

  async function rosterEvent(api) {
    api.lock();
    api.setFlag('roster');
    await api.say('2학년 3반 출석부.');
    await api.say('내 번호 칸에… "한소연"이라는 이름이 적혀 있다.');
    await api.say('그리고 소연이의 칸에는, 내 이름이.');
    api.blackout(1);
    SFX.buzz();
    SFX.stinger();
    await api.wait(1.4);
    await api.say('이번엔 네가 숨어.', 'her', 2.6);
    await api.say('내가 찾을게.', 'her', 2.4);
    SFX.musicBox(0.5);
    for (const n of ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉']) await api.say(`${n}…`, 'her', 0.7);
    await api.say('열.', 'her', 1.6);
    SFX.musicBox(0);
    api.blackout(0);
    api.activateGhost('hall2', 9);
    api.unlock();
    api.setObjective('o4');
    await api.say('…숨어야 해. 그리고 그 애가 숨은 곳을 찾아야 해.');
    api.hint('그것이 다가오면 사물함·청소함에 숨으세요(E). 손전등(F)을 끄면 덜 눈에 띕니다. 달리면 발소리가 들립니다.', 12);
  }

  async function storageEvent(api) {
    if (!api.flag('storageIn')) {
      api.setFlag('storageIn');
      api.say('먼지 냄새. 안쪽에 낡은 장롱이 보인다.');
    }
    if (!api.G.ghost.active) return;
    const g0 = api.G;
    await api.wait(2.2);
    if (api.G !== g0 || api.scene() !== 'storage' || api.flag('wardrobe')) return;
    api.chaser({ x: 100, speed: 48 });
    SFX.doorOpen();
    api.say('거기야…?', 'her');
  }

  async function stall(api, o) {
    if (api.flag('took:' + o.id)) { api.say('비어 있다.'); return; }
    if (!api.flag('roster')) { SFX.locked(); api.say('안에서 잠겨 있다.'); return; }
    if (!api.flag('knocked')) {
      api.setFlag('knocked');
      api.lock();
      SFX.knock(3);
      await api.say('똑. 똑. 똑.', 'sys', 2);
      await api.say('…들어 있어요.', 'her', 2.4);
      await api.say('……다시 열어 볼까.');
      api.unlock();
      return;
    }
    api.setFlag('took:' + o.id);
    api.give('keyMusic');
    SFX.doorOpen();
    SFX.pickup();
    api.say('아무도 없다. 물탱크 위에 열쇠가 하나.');
    api.say('꼬리표에는 "음악실".');
    api.setObjective('o6');
  }

  async function wardrobe(api) {
    api.lock();
    api.setFlag('wardrobe');
    api.stopChaser();
    SFX.doorOpen();
    await api.say('…찾았다.', 'me', 2.2);
    const trueEnd = api.G.notes.size === 4;
    api.ending({
      trueEnd,
      title: trueEnd ? '진 엔딩 · 술래의 사과' : '엔딩 · 찾았다',
      metas: trueEnd ? [] : ['흩어진 쪽지를 모두 모으면, 다른 결말을 볼 수 있다.'],
      lines: [
        ['장롱 문은 바깥에서만 열리는 낡은 것이었다.'],
        ['안에는 작은 명찰 하나가 놓여 있었다.'],
        ['한소연.', 'red'],
        ['…찾았다.', 'her'],
        ...(trueEnd ? [
          ['1998년 3월 5일 밤. 술래였던 나는 열까지 세었다.'],
          ['그리고 약속대로, 아무도 찾지 않고 집에 갔다.'],
          ['미안해, 소연아. 이십 년이나 걸려서.'],
          ['괜찮아. 결국 찾아 줬잖아.', 'her'],
          ['창밖이 밝아 온다. 현관문은, 열려 있었다.'],
        ] : [
          ['이십 년 만에, 숨바꼭질이 끝났다.'],
          ['그런데 왜일까. 그 애가 기다린 사람이 나였다는 걸, 나는 알고 있었다.'],
          ['창밖이 밝아 온다.'],
        ]),
      ],
    });
  }

  GAME.STORIES.school = {
    id: 'school',
    title: '폐교',
    scenes,
    notes,
    items: {
      key23: { name: '2-3 교실 열쇠' },
      roster: { name: '출석부' },
      keyMusic: { name: '음악실 열쇠' },
    },
    objectives: {
      o1: '2학년 3반 교실로 가 보자',
      o2: '교무실에서 2-3 교실 열쇠를 찾자',
      o3: '2학년 3반으로 돌아가자',
      o4: '그것을 피해, 소연이가 숨은 곳을 찾자',
      o5: '음악실 열쇠를 찾자',
      o6: '음악실로 가자',
      o7: '음악준비실을 살펴보자',
    },
    order: ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7'],
    chapters: {
      o1: '프롤로그', o2: '1장 · 열쇠', o3: '1장 · 열쇠',
      o4: '2장 · 술래', o5: '2장 · 술래', o6: '3장 · 음악준비실', o7: '3장 · 음악준비실',
    },
    start: { scene: 'hall1', x: 240 },
    forbidden: ['storage'],
    look: { player: 'student', ghost: 'girl' },
    sound: 'school',
    lines: {
      arrive: ['꼭꼭 숨어라…', '머리카락 보일라…', '어디 있니…', '다 숨었니…?'],
      spot: ['찾았다…?', '거기 있구나.', '보인다.'],
      linger: ['여기…?', '숨소리가 들려…', '…아닌가.'],
      dead: ['찾았다.', '머리카락 보였어.', '이번엔 네가 술래야.'],
    },

    hooks: {
      async intro(api) {
        await api.wait(1);
        api.say('…교문은 열려 있었다. 누군가 열어 둔 것처럼.');
        api.say('2학년 3반. 거기부터 가 보자.');
        api.hint('← → 이동 · Shift 달리기 · E 조사 · F 손전등 · Q 쪽지 · Esc 메뉴', 10);
        api.checkpoint();
      },

      locked(api, o) {
        if (o.id === 'h2-c23') {
          api.say('잠겨 있다.');
          api.say('교무실에 열쇠가 있을지도 몰라.');
          if (api.objective() === 'o1') api.setObjective('o2');
          return true;
        }
        if (o.id === 'h2-music') {
          api.say('잠겨 있다. 음악실 열쇠가 필요해.');
          if (api.objective() === 'o4') api.setObjective('o5');
          return true;
        }
        return false;
      },

      take(api, o) {
        if (o.item === 'key23') {
          api.say('"2-3" 꼬리표가 달린 열쇠.');
          if (!api.flag('roster')) api.setObjective('o3');
          phoneEvent(api);
        } else if (o.item === 'roster') {
          rosterEvent(api);
        }
      },

      note(api, o) {
        if (o.note === 'n4' && api.objective() === 'o4') api.say('음악준비실… 그리고 화장실 맨 끝 칸.');
        if (o.note === 'n3') api.say('…술래가, 나였어?');
      },

      async inspect(api, o) {
        if (o.id === 'o-phone' && api.G.phoneRinging) { phoneCall(api); return true; }
        if (o.id === 'm-piano') SFX.piano();
        if (o.id === 'n-mirror' && api.G.ghost.active && !api.flag('mirrorScare')) {
          api.lock();
          for (const l of o.lines) await api.say(l);
          api.unlock();
          api.setFlag('mirrorScare');
          SFX.stinger();
          api.shake(0.6);
          api.say('…거울 속 내 어깨 너머로, 젖은 머리카락이.');
          return true;
        }
        return false;
      },

      enter(api, to) {
        if (to === 'hall2' && !api.flag('seen2') && !api.G.ghost.active) phantomEvent(api);
        if (to === 'music' && api.objective() === 'o6') api.setObjective('o7');
        if (to === 'storage') storageEvent(api);
      },

      use: { stall, wardrobe },
    },
  };
})();
