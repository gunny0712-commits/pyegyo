// 공용 데이터: 난이도. 스토리는 js/game/stories/*.js 가 GAME.STORIES 에 등록한다.
(() => {
  'use strict';
  const GAME = (window.GAME = window.GAME || {});

  // chase: 그것의 추격 속도 · final: 막판 추격자 속도 · drain: 손전등 배터리 소모(초당 %)
  GAME.DIFF = {
    tour:      { drain: 0.25, chase: 150, final: 140, sight: 0.8, hear: 0.7, follow: 4.0, roam: 22, permadeath: false },
    explore:   { drain: 0.4,  chase: 180, final: 165, sight: 1.0, hear: 1.0, follow: 2.6, roam: 16, permadeath: false },
    nightmare: { drain: 0.55, chase: 205, final: 185, sight: 1.2, hear: 1.3, follow: 1.6, roam: 11, permadeath: true },
  };

  GAME.STORIES = GAME.STORIES || {};
})();
