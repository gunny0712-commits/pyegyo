// 에피소드 2 · 체크아웃 — 숲속의 백운호텔
// 신고를 받고 출동한 경찰이 2004년 화재 이후 버려진 호텔에 갇힌다.
// 퍼즐: 금고 비밀번호(1224) · 지하 통로 미로(빨강→파랑→파랑→노랑) · 배전반 차단기(1·3·4번)
(() => {
  'use strict';
  const GAME = window.GAME;

  const SAFE_CODE = '1224';
  const MAZE_PATH = ['red', 'blue', 'blue', 'yellow'];
  const BREAKERS = [1, 0, 1, 1, 0];
  const PIPE_NAME = { red: '빨간', blue: '파란', yellow: '노란' };

  const scenes = {
    lot: {
      name: '백운호텔 주차장', kind: 'forest', width: 1500,
      lights: [{ x: 360, y: 90, r: 220, a: 0.35 }],
      objects: [
        { id: 'lot-path', type: 'inspect', art: 'none', x: 70, w: 80,
          lines: ['올라온 숲길이 칠흑같이 어둡다.', '걸어서 내려가기엔 너무 멀다.'] },
        { id: 'lot-car', type: 'use', use: 'car', art: 'car', x: 300, w: 220, prompt: '순찰차 타기' },
        { id: 'lot-sign', type: 'inspect', art: 'none', x: 1060, w: 120,
          lines: ['"백운 호텔" 간판. "백" 자의 네온만 깜빡이며 붉게 살아 있다.'] },
        { id: 'lot-door', type: 'use', use: 'entrance', art: 'entrance', x: 1330, w: 160, prompt: '살펴보기' },
      ],
    },

    lobby: {
      name: '로비', kind: 'lobby', width: 2000,
      lamp: 1000, lampFlag: 'power',
      deco: [{ t: 'chandelier', x: 420 }, { t: 'chandelier', x: 1400 }, { t: 'sofa', x: 1110 }, { t: 'portrait', x: 1000, eyes: true }],
      objects: [
        { id: 'l-front', type: 'inspect', art: 'frontdoor', x: 120, w: 200,
          lines: ['꿈쩍도 하지 않는다.', '바깥에서 누군가 온몸으로 누르고 있는 것처럼.'] },
        { id: 'l-desk', type: 'hide', art: 'frontdesk', x: 470, name: '프런트 데스크 뒤' },
        { id: 'l-book', type: 'note', note: 'n1', x: 590, surface: 'frontdesk' },
        { id: 'l-keys', type: 'inspect', art: 'keyrack', x: 680, w: 70,
          lines: ['객실 열쇠 걸이. 열쇠는 전부 걸려 있다.', '"304"번 고리만 비어 있다.'] },
        { id: 'l-phone', type: 'inspect', art: 'phone', x: 770, w: 60, surface: 'frontdesk',
          lines: ['프런트 전화기. 수화기에서 아무 소리도 나지 않는다.', '전기가 완전히 나갔다.'] },
        { id: 'l-office', type: 'door', art: 'hdoor', x: 920, label: '지배인실', to: 'office', toX: 180, lock: 'officeKey' },
        { id: 'l-elev', type: 'door', art: 'elevator', x: 1300, w: 140, to: 'hall3', toX: 220, needFlag: 'power', prompt: '엘리베이터 타기' },
        { id: 'l-kitchen', type: 'door', art: 'hdoor', x: 1580, label: '식당', to: 'kitchen', toX: 180 },
        { id: 'l-stairs', type: 'stairs', dir: 'up', x: 1880, to: 'hall2', toX: 220, sign: '↑ 2층' },
      ],
    },

    kitchen: {
      name: '식당 주방', kind: 'kitchen', width: 1300,
      deco: [{ t: 'counter', x: 380 }, { t: 'counter', x: 520 }, { t: 'stove', x: 700 }, { t: 'pans', x: 700 }],
      objects: [
        { id: 'k-door', type: 'door', art: 'hdoor', x: 100, label: '로비', to: 'lobby', toX: 1580 },
        { id: 'k-memo', type: 'note', note: 'n2', x: 380, surface: 'counter' },
        { id: 'k-key', type: 'item', item: 'officeKey', x: 520, surface: 'counter' },
        { id: 'k-fridge', type: 'hide', art: 'fridge', x: 900, name: '냉장 창고' },
        { id: 'k-down', type: 'stairs', dir: 'down', x: 1180, to: 'basement', toX: 220, sign: '↓ 지하' },
      ],
    },

    office: {
      name: '지배인실', kind: 'mgr', width: 1100,
      deco: [{ t: 'officeDesk', x: 450 }, { t: 'portrait', x: 640, eyes: true }],
      objects: [
        { id: 'of-door', type: 'door', art: 'hdoor', x: 100, label: '로비', to: 'lobby', toX: 920 },
        { id: 'of-diary', type: 'note', note: 'n4', x: 450, surface: 'officeDesk' },
        { id: 'of-photo', type: 'inspect', art: 'none', x: 640, w: 70,
          lines: ['지배인의 초상화. 열쇠 꾸러미를 쥐고 웃고 있다.', '…눈이 나를 따라온다.'] },
        { id: 'of-safe', type: 'use', use: 'safe', art: 'safe', x: 830, w: 120, prompt: '금고 열기' },
        { id: 'of-closet', type: 'hide', art: 'roomWardrobe', x: 1000, name: '옷장 안' },
      ],
    },

    hall2: {
      name: '2층 객실 복도', kind: 'hotelHall', width: 2400,
      sconces: [300, 860, 1420, 1980],
      objects: [
        { id: 'h2-down', type: 'stairs', dir: 'down', x: 120, to: 'lobby', toX: 1780, sign: '↓ 로비' },
        { id: 'h2-201', type: 'door', art: 'hdoor', x: 420, label: '201', to: 'r201', toX: 180 },
        { id: 'h2-linen', type: 'hide', art: 'hdoor', label: '린넨실', x: 700, name: '린넨실' },
        { id: 'h2-202', type: 'inspect', art: 'hdoor', label: '202', x: 980, w: 100,
          lines: ['잠겨 있다.', '문 너머에서… 텔레비전 소리가 난다. 전기도 없는데.'] },
        { id: 'h2-203', type: 'door', art: 'hdoor', x: 1260, label: '203', to: 'r203', toX: 180 },
        { id: 'h2-bat', type: 'item', item: 'battery', x: 1500, surface: 'floor' },
        { id: 'h2-curtain', type: 'hide', art: 'curtain', x: 1700, name: '커튼 뒤' },
        { id: 'h2-205', type: 'inspect', art: 'hdoor', label: '205', x: 1960, w: 100,
          lines: ['잠겨 있다. 문고리에 "방해하지 마세요" 팻말.', '팻말 뒷면에 손톱으로 긁은 글씨. "나가게 해줘"'] },
        { id: 'h2-debris', type: 'inspect', art: 'debris', x: 2260, w: 180,
          lines: ['3층으로 가는 계단이 무너진 잔해로 막혀 있다.', '위로 가려면… 엘리베이터뿐이다.'] },
      ],
    },

    r201: {
      name: '201호', kind: 'room', width: 1000,
      windows: [600],
      deco: [{ t: 'hbed', x: 320 }, { t: 'nightstand', x: 470 }],
      objects: [
        { id: 'r1-door', type: 'door', art: 'hdoor', x: 100, label: '복도', to: 'hall2', toX: 420 },
        { id: 'r1-bat', type: 'item', item: 'battery', x: 470, surface: 'nightstand' },
        { id: 'r1-mirror', type: 'inspect', art: 'mirror', x: 680, w: 80,
          lines: ['거울에 립스틱으로 쓴 글씨.', '"지배인을 믿지 마세요"'] },
        { id: 'r1-ward', type: 'hide', art: 'roomWardrobe', x: 880, name: '옷장 안' },
      ],
    },

    r203: {
      name: '203호', kind: 'room', width: 1000,
      windows: [420],
      deco: [{ t: 'hbed', x: 600 }],
      objects: [
        { id: 'r3-door', type: 'door', art: 'hdoor', x: 100, label: '복도', to: 'hall2', toX: 1260 },
        { id: 'r3-tv', type: 'inspect', art: 'tv', x: 300, w: 80,
          lines: ['브라운관 텔레비전. 코드가 뽑혀 있다.', '화면에 손바닥 자국이 안쪽에서 찍혀 있다.'] },
        { id: 'r3-map', type: 'note', note: 'n3', x: 760, surface: 'nightstand' },
        { id: 'r3-ward', type: 'hide', art: 'roomWardrobe', x: 900, name: '옷장 안' },
      ],
    },

    basement: {
      name: '지하 기계실 입구', kind: 'basement', width: 1200,
      objects: [
        { id: 'b-up', type: 'stairs', dir: 'up', x: 120, to: 'kitchen', toX: 1080, sign: '↑ 주방' },
        { id: 'b-boiler', type: 'door', art: 'pipeDoor', color: 'gray', label: '기계실', x: 380, to: 'boiler', toX: 180, needFlag: 'mazeDone' },
        { id: 'b-bat', type: 'item', item: 'battery', x: 600, surface: 'floor' },
        { id: 'b-locker', type: 'hide', art: 'locker', x: 800, name: '작업복 사물함' },
        { id: 'b-maze', type: 'door', art: 'pipeDoor', color: 'gray', label: '통로', x: 1060, to: 'maze', toX: 180 },
      ],
    },

    maze: {
      name: '지하 통로', kind: 'maze', width: 1100,
      objects: [
        { id: 'mz-back', type: 'door', art: 'pipeDoor', color: 'gray', label: '입구', x: 100, to: 'basement', toX: 1060 },
        { id: 'mz-red', type: 'use', use: 'maze', art: 'pipeDoor', color: 'red', x: 400, prompt: '빨간 관 쪽으로' },
        { id: 'mz-blue', type: 'use', use: 'maze', art: 'pipeDoor', color: 'blue', x: 660, prompt: '파란 관 쪽으로' },
        { id: 'mz-yellow', type: 'use', use: 'maze', art: 'pipeDoor', color: 'yellow', x: 920, prompt: '노란 관 쪽으로' },
      ],
    },

    boiler: {
      name: '기계실', kind: 'boiler', width: 1000,
      deco: [{ t: 'boilerTank', x: 820 }],
      objects: [
        { id: 'bo-door', type: 'door', art: 'pipeDoor', color: 'gray', label: '통로', x: 100, to: 'basement', toX: 380 },
        { id: 'bo-panel', type: 'use', use: 'breaker', art: 'breaker', x: 520, w: 150, prompt: '배전반 열기' },
      ],
    },

    hall3: {
      name: '3층 복도', kind: 'burned', width: 1900,
      objects: [
        { id: 'h3-elev', type: 'door', art: 'elevator', x: 150, w: 140, to: 'lobby', toX: 1300, prompt: '엘리베이터 타기' },
        { id: 'h3-301', type: 'inspect', art: 'hdoor', label: '301', burnt: true, x: 420, w: 100,
          lines: ['문이 숯덩이처럼 타 있다.', '안쪽 문고리에… 손톱자국.'] },
        { id: 'h3-302', type: 'hide', art: 'roomWardrobe', burnt: true, x: 700, name: '타다 남은 옷장' },
        { id: 'h3-303', type: 'inspect', art: 'hdoor', label: '303', burnt: true, x: 980, w: 100,
          lines: ['문틈으로 아직도 매캐한 연기 냄새가 새어 나온다.'] },
        { id: 'h3-304', type: 'door', art: 'hdoor', label: '304', x: 1240, to: 'r304', toX: 180, lock: 'masterKey' },
        { id: 'h3-305', type: 'inspect', art: 'hdoor', label: '305', burnt: true, x: 1500, w: 100,
          lines: ['잠겨 있다. 문 아래 틈에 검은 그을음이 손가락 모양으로 번져 있다.'] },
        { id: 'h3-exit', type: 'use', use: 'exit', art: 'chainDoor', x: 1770, w: 140, prompt: '비상구' },
      ],
    },

    r304: {
      name: '304호', kind: 'room', width: 1000,
      windows: [500],
      deco: [{ t: 'hbed', x: 300 }, { t: 'nightstand', x: 640 }],
      objects: [
        { id: 'r4-door', type: 'door', art: 'hdoor', x: 100, label: '복도', to: 'hall3', toX: 1240 },
        { id: 'r4-bed', type: 'hide', art: 'none', x: 300, w: 160, name: '침대 밑' },
        { id: 'r4-phone', type: 'inspect', art: 'phone', x: 520, w: 60, surface: 'smallDesk',
          lines: ['객실 전화기. 수화기가 내려져 있다.', '귀를 대자, 신호음 대신… 작은 숨소리.'] },
        { id: 'r4-doll', type: 'item', item: 'doll', x: 640, surface: 'nightstand' },
        { id: 'r4-letter', type: 'note', note: 'n5', x: 850, surface: 'floor' },
      ],
    },

    fire_stairs: {
      name: '비상계단', kind: 'stairwell', width: 1800,
      objects: [
        { id: 'fs-back', type: 'inspect', art: 'chainDoor', open: true, x: 100, w: 120,
          lines: ['문이 등 뒤에서 닫혔다. 돌아갈 수 없다.'] },
        { id: 'fs-exit', type: 'use', use: 'finalExit', art: 'exitDoor', x: 1700, w: 120, prompt: '밀고 나가기' },
      ],
    },
  };

  const notes = {
    n1: {
      title: '숙박부 · 2004년 12월',
      body: [
        '12/22   302호   김○○ 외 1명',
        '12/23   304호   정미경, 정서윤(8세)',
        '12/24   폭설로 진입로 통제. 투숙객 전원 숙박 연장.',
        '12/24   ── 이후 기록 없음 ──',
        '',
        '※ 숙박비 미납 객실 다수. 비상구 단속 철저히 할 것. — 지배인',
      ],
    },
    n2: {
      title: '주방 메모',
      hand: true,
      body: [
        '배전반 다시 올릴 때 주의!!',
        '1번, 3번, 4번만 올릴 것.',
        '2번 5번은 3층 배선이라 올리면 바로 또 떨어짐.',
        '',
        '— 주방장 박',
      ],
    },
    n3: {
      title: '구겨진 약도',
      hand: true,
      body: [
        '지하 통로 → 기계실 가는 길',
        '빨간 관 → 파란 관 → 파란 관 → 노란 관',
        '',
        '다른 데로 들어가면 처음 자리로 돌아온다.',
        '진짜다. 세 번이나 헤맸다.',
      ],
    },
    n4: {
      title: '지배인 일기',
      body: [
        '12월 23일. 또 한 팀이 밤중에 몰래 나가려다 붙잡혔다.',
        '비상구에 사슬을 감았다. 마스터키는 내가 가진다.',
        '체크아웃은 내가 허락할 때만이다.',
        '',
        '12월 24일. 3층에서 연기가',
        '열쇠가 손에서 미끄러져',
        '(이후 페이지는 그을려 읽을 수 없다)',
        '',
        '맨 뒷장 — 금고 번호는 그날 이후로 바꾸지 않았다. 바꿀 수가 없었다.',
      ],
    },
    n5: {
      title: '크레파스 편지',
      hand: true,
      body: [
        '산타 할아버지께',
        '엄마랑 호텔에 놀러 왔어요. 눈이 엄청 많이 와요.',
        '선물은 필요 없어요.',
        '여기서 나가게 해 주세요.',
        '',
        '— 304호 정서윤',
      ],
    },
  };

  // ── 이벤트 ──

  async function car(api) {
    const o = api.objective();
    if (o === 'h1') { api.say('순찰차. 무전기는 아까부터 잡음뿐이다.'); api.say('신고자부터 확인하자. 호텔 입구로.'); return; }
    if (api.flag('carDead')) { api.say('시동이 걸리지 않는다. 배터리가 완전히 나갔다.'); return; }
    api.lock();
    await api.say('…돌아가서 보고하자.');
    SFX.crank();
    await api.wait(2.2);
    await api.say('……시동이 안 걸린다.');
    await api.say('배터리가 완전히 나갔다. 방금까지 멀쩡했는데.');
    SFX.radio();
    await api.say('치지직——', 'sys', 1.6);
    await api.say('…체크인… 하셔야죠…', 'her', 2.8);
    await api.say('무전도 먹통이다. 호텔 안에 전화가 있을지도 몰라.');
    api.setFlag('carDead');
    api.unlock();
    api.setObjective('h3');
  }

  async function entrance(api) {
    if (api.flag('carDead')) { api.go('lobby', 220); return; }
    if (api.flag('sawLobby')) { api.say('장난 전화였을지도. 일단 순찰차로 돌아가자.'); return; }
    api.lock();
    api.setFlag('sawLobby');
    await api.say('현관 유리문이 깨져 있다.');
    await api.say('로비 바닥에 낙엽이 수북하다. 영업을 안 한 지 한참 된 곳이다.');
    await api.say('…신고자는커녕, 사람이 있을 리가 없어.');
    await api.say('장난 전화였나. 일단 순찰차로 돌아가자.');
    api.unlock();
    api.setObjective('h2');
  }

  async function trapEvent(api) {
    api.setFlag('trapped');
    api.lock();
    await api.wait(1.4);
    SFX.slam();
    api.shake(0.8);
    api.blackout(1);
    await api.say('쾅——', 'sys', 1.4);
    api.blackout(0);
    await api.say('…문이 저절로 닫혔다.');
    SFX.pa();
    await api.say('백운호텔에 오신 것을 환영합니다.', 'her', 2.8);
    await api.say('손님의 체크아웃은… 아직입니다.', 'her', 2.8);
    api.unlock();
    api.setObjective('h4');
    await api.say('…다른 출구를 찾아야 해. 직원용 통로라든가.');
    api.hint('← → 이동 · Shift 달리기 · E 조사 · F 손전등 · Q 쪽지 · Esc 메뉴', 10);
  }

  async function powerCall(api) {
    api.setFlag('powerCall');
    await api.wait(2);
    if (api.scene() !== 'lobby') { api.unsetFlag('powerCall'); return; }
    api.ring(true);
    api.say('…프런트 전화가 울린다.');
  }

  async function answerPhone(api) {
    api.ring(false);
    api.lock();
    await api.say('…여보세요? 경찰입니다.');
    SFX.whisper();
    await api.say('…경찰 아저씨?', 'girl', 2.4);
    await api.say('3층이에요. 304호.', 'girl', 2.4);
    await api.say('연기가 너무 많아요. 문이 안 열려요.', 'girl', 2.8);
    await api.say('지배인 아저씨가… 비상구를 잠갔어요.', 'girl', 2.8);
    await api.say('끊겼다. 아까 그 신고 전화의 목소리다.');
    api.unlock();
    api.setFlag('heardGirl');
  }

  async function safe(api, o) {
    if (api.flag('took:' + o.id)) { api.say('금고는 비어 있다.'); return; }
    const ok = await api.keypad({
      title: '금고 · 네 자리 숫자',
      code: SAFE_CODE,
      onWrong(n) {
        if (n === 3) api.say(api.G.notes.has('n4') ? '그날 이후로 바꾸지 않았다고 했지… 그날이 언제였더라.' : '번호를 알려 줄 만한 게 어딘가 있을 거야.');
      },
    });
    if (!ok) return;
    api.setFlag('took:' + o.id);
    api.give('masterKey');
    SFX.unlock();
    api.lock();
    await api.say('철컥. 금고 안에 묵직한 열쇠 꾸러미. 꼬리표에 "MASTER".');
    api.blackout(1);
    SFX.keys();
    await api.wait(1);
    await api.say('…손님.', 'her', 2.2);
    await api.say('그 열쇠는… 돌려주셔야죠.', 'her', 2.8);
    SFX.keys();
    api.blackout(0);
    api.activateGhost('lobby', 8);
    api.unlock();
    api.setObjective('h7');
    await api.say('지배인이… 아직 여기 있어.');
    await api.say('비상구는 3층. 계단은 막혔으니 엘리베이터뿐이다. 전기부터 살려야 해.');
    api.hint('그것이 다가오면 옷장·린넨실·데스크 뒤에 숨으세요(E). 손전등(F)을 끄면 덜 눈에 띄고, 달리면 발소리가 들립니다.', 12);
  }

  async function maze(api, o) {
    const v = api.G.vars;
    v.maze = v.maze || 0;
    const right = o.color === MAZE_PATH[v.maze];
    const g = api.G.ghost;
    if (right) {
      v.maze++;
      if (v.maze === MAZE_PATH.length) {
        v.maze = 0;
        api.setFlag('mazeDone');
        await api.go('boiler', 180);
        api.say('…기계실이다. 빠져나왔어.');
        return;
      }
      await api.go('maze', 180);
      if (g.scene === 'maze') g.x = 1000;
      api.say(['같은 통로… 아니, 조금 더 깊다.', '파이프 소리가 가까워졌다.', '공기가 따뜻해진다. 기계실이 가까워.'][v.maze - 1]);
    } else {
      v.maze = 0;
      v.fails = (v.fails || 0) + 1;
      await api.go('maze', 180);
      if (g.scene === 'maze') g.x = 1000;
      SFX.whisper();
      api.say('…처음 그 자리다. 벽의 분필 자국이 지워져 있다.');
      if (v.fails === 3 && !api.G.notes.has('n3')) api.say('이대로는 못 찾겠어. 약도 같은 게 어딘가 있을 텐데. 객실 쪽이라든가.');
    }
  }

  async function breaker(api) {
    if (api.flag('power')) { api.say('차단기는 올라가 있다. 전기가 들어와 있다.'); return; }
    const ok = await api.breakers({
      answer: BREAKERS,
      onWrong() {
        SFX.buzz();
        api.shake(0.7);
        api.say('퍽! 불꽃이 튀고 차단기가 다시 떨어졌다.');
        api.alertGhost();
      },
    });
    if (!ok) return;
    api.setFlag('power');
    SFX.powerOn();
    api.lock();
    await api.say('웅—— 하고 건물 전체가 울린다.');
    await api.say('…전기가 들어왔다.');
    api.unlock();
    api.setObjective('h8');
    api.say('엘리베이터. 로비로 돌아가자.');
  }

  async function exit(api) {
    if (!api.has('masterKey')) { SFX.locked(); api.say('쇠사슬이 감겨 있다. 열쇠가 필요하다.'); return; }
    api.lock();
    await api.say('비상구 문에 쇠사슬이 칭칭 감겨 있다. 자물쇠에 새겨진 글자, "MASTER".');
    SFX.unlock();
    await api.say('…열렸다.');
    api.unlock();
    api.go('fire_stairs', 440);
  }

  async function finalChase(api) {
    if (api.flag('escaped')) return;
    api.lock();
    await api.wait(0.8);
    SFX.slam();
    api.shake(0.6);
    await api.say('체크아웃은 없다고 말씀드렸을 텐데요, 손님.', 'her', 2.6);
    SFX.doorOpen();
    api.chaser({ x: 100, speed: api.diff().final, keys: true });
    api.unlock();
    api.setObjective('h10');
    api.hint('달리세요! (Shift) — 숨이 차면 잠깐 걸었다가 다시.', 6);
  }

  async function finalExit(api) {
    api.lock();
    api.setFlag('escaped');
    api.stopChaser();
    SFX.slam();
    await api.say('철문을 밀어젖혔다——', 'me', 1.8);
    const trueEnd = api.has('doll');
    api.ending({
      trueEnd,
      title: trueEnd ? '진 엔딩 · 늦은 응답' : '엔딩 · 체크아웃',
      metas: trueEnd ? [] : ['304호에, 두고 온 것이 있다.'],
      lines: [
        ['차가운 새벽 공기가 한꺼번에 쏟아져 들어왔다.'],
        ['뒤를 돌아봤을 때, 계단에는 아무도 없었다.'],
        ['멀리서 사이렌 소리가 들려왔다.'],
        ...(trueEnd ? [
          ['품 안의 토끼 인형이, 아주 조금 따뜻했다.'],
          ['고마워요. 와 줘서.', 'girl'],
          ['날이 밝은 뒤 조회해 보니, 신고 전화의 번호는 2004년 12월 24일에 해지된 번호였다.'],
          ['마지막 발신 기록, 새벽 2시 14분. 연결되지 않음.'],
          ['스물두 해 만에, 누군가 그 전화를 받은 것이다.'],
        ] : [
          ['순찰차는 거짓말처럼 한 번에 시동이 걸렸다.'],
          ['백미러 속, 3층 창문에 작은 손바닥 자국이 찍혀 있었다.'],
          ['…나는요?', 'girl'],
        ]),
      ],
    });
  }

  GAME.STORIES.hotel = {
    id: 'hotel',
    title: '체크아웃',
    scenes,
    notes,
    items: {
      officeKey: { name: '지배인실 열쇠' },
      masterKey: { name: '마스터키' },
      doll: { name: '토끼 인형' },
    },
    objectives: {
      h1: '호텔 입구를 살펴보자',
      h2: '순찰차로 돌아가자',
      h3: '호텔 안에서 연락할 방법을 찾자',
      h4: '호텔을 빠져나갈 방법을 찾자',
      h5: '지배인실 열쇠를 찾자',
      h6: '지배인실을 조사하자',
      h7: '전기를 살려 엘리베이터를 움직이자',
      h8: '엘리베이터를 타고 3층으로 가자',
      h9: '3층 비상구로 탈출하자',
      h10: '비상계단을 내려가 탈출하자!',
    },
    order: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10'],
    chapters: {
      h1: '프롤로그 · 신고', h2: '프롤로그 · 신고', h3: '프롤로그 · 신고',
      h4: '1장 · 투숙', h5: '1장 · 투숙', h6: '1장 · 투숙',
      h7: '2장 · 정전', h8: '2장 · 정전',
      h9: '3장 · 체크아웃', h10: '3장 · 체크아웃',
    },
    start: { scene: 'lot', x: 420 },
    forbidden: ['lot', 'fire_stairs'],
    look: { player: 'police', ghost: 'manager' },
    sound: 'hotel',
    lines: {
      arrive: ['손님…?', '객실로 돌아가셔야죠.', '체크아웃 시간은 아직입니다.', '열쇠를… 돌려주십시오.'],
      spot: ['찾았습니다, 손님.', '거기 계셨군요.', '손님, 그쪽은 출입 금지입니다.'],
      linger: ['이 방이었던가…', '열쇠 소리가 들리는데…', '…편히 쉬고 계십시오.'],
      dead: ['체크인 완료.', '편히 쉬십시오, 손님.', '체크아웃은 없습니다.'],
    },

    hooks: {
      async intro(api) {
        await api.wait(1);
        api.say('…여기가 백운호텔.');
        api.say('불 켜진 창문이 하나도 없다.');
        api.hint('← → 이동 · Shift 달리기 · E 조사 · F 손전등 · Q 쪽지 · Esc 메뉴', 10);
        api.checkpoint();
      },

      locked(api, o) {
        if (o.id === 'l-office') {
          api.say('"지배인실". 잠겨 있다.');
          if (['h4'].includes(api.objective())) api.setObjective('h5');
          return true;
        }
        if (o.id === 'l-elev') {
          api.say('버튼을 눌러도 반응이 없다. 전기가 들어와 있지 않다.');
          if (api.G.ghost.active) api.say('배전반… 지하 기계실에 있을 거야.');
          return true;
        }
        if (o.id === 'b-boiler') {
          api.say('"기계실". 안쪽에서 빗장이 걸려 있다.');
          api.say('옆 통로로 돌아서 들어가야 할 것 같다.');
          return true;
        }
        if (o.id === 'h3-304') { api.say('304호. 잠겨 있다.'); return true; }
        return false;
      },

      take(api, o) {
        if (o.item === 'officeKey') {
          api.say('"지배인실" 꼬리표가 달린 열쇠. 냄비 밑에 깔려 있었다.');
          api.setObjective('h6');
        } else if (o.item === 'doll') {
          api.say('토끼 인형. 등에 "서윤"이라고 수가 놓여 있다.');
          SFX.whisper();
          api.say('…같이 가도 돼요?', 'girl', 2.4);
        }
      },

      note(api, o) {
        if (o.note === 'n4' && !api.flag('took:of-safe')) api.say('금고 번호… "그날".');
        if (o.note === 'n1') api.say('2004년 12월 24일. 숙박부가 그날에서 멈췄다.');
        if (o.note === 'n5') api.say('…정서윤. 304호.');
      },

      async inspect(api, o) {
        if (o.id === 'l-phone' && api.G.phoneRinging) { answerPhone(api); return true; }
        if (o.id === 'l-phone' && api.flag('power')) { api.say('신호음이 들린다. 112를 눌렀다. …"없는 번호입니다".'); return true; }
        return false;
      },

      enter(api, to) {
        if (to === 'lobby' && !api.flag('trapped')) trapEvent(api);
        if (to === 'lobby' && api.flag('power') && !api.flag('powerCall')) powerCall(api);
        if (to === 'hall3' && !api.flag('saw3')) {
          api.setFlag('saw3');
          api.say('타 버린 복도. 이십 년이 넘었는데 아직도 탄내가 난다.');
          api.setObjective('h9');
        }
        if (to === 'fire_stairs') finalChase(api);
      },

      use: { car, entrance, safe, maze, breaker, exit, finalExit },
    },
  };
})();
