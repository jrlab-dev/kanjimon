/* かんじモンRPG アクセス解析（GA4）。
 * ゲームの処理は書き換えず、決まった関数の呼び出しを外から見て記録だけを送る。
 * 個人が分かる情報（主人公の名前など）は送らない。
 * 数えない端末：?nocount=1 を一度開くと、その端末では読み込まない（?nocount=0 で戻す）。 */
(function () {
  'use strict';
  var ID = 'G-C0YDVCV847';
  var KEY = 'dev_nocount';

  function toast(msg) {
    var d = document.createElement('div');
    d.textContent = msg;
    d.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;' +
      'background:#222;color:#fff;padding:10px 16px;border-radius:10px;font:14px/1.4 sans-serif;';
    (document.body || document.documentElement).appendChild(d);
    setTimeout(function () { d.remove(); }, 4000);
  }
  try {
    var q = new URLSearchParams(location.search).get('nocount');
    if (q === '1') { localStorage.setItem(KEY, '1'); }
    if (q === '0') { localStorage.removeItem(KEY); }
    if (q === '1' || q === '0') {
      var msg = q === '1' ? 'この端末は かぞえません（アクセス解析オフ）' : 'この端末も かぞえます（アクセス解析オン）';
      if (document.body) toast(msg); else document.addEventListener('DOMContentLoaded', function () { toast(msg); });
    }
    if (localStorage.getItem(KEY) === '1') return;
  } catch (e) {}
  // 本番の住所以外（手元の検査・試作）では送らない。
  if (location.hostname !== 'kanjimon.jr-genius.jp' || location.protocol !== 'https:') return;
  if (window.__kmAnalytics) return;
  window.__kmAnalytics = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  var tag = document.createElement('script');
  tag.async = true;
  tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(tag);

  function send(name, params) {
    try { window.gtag('event', name, params || {}); } catch (e) {}
  }
  // ゲーム本体の関数を包む。元の関数は必ず先に・同じ引数で呼び、記録の失敗はゲームに影響させない。
  function wrap(name, before, after) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__kmWrapped) return;
    var w = function () {
      var ctx;
      try { ctx = before ? before.apply(this, arguments) : undefined; } catch (e) {}
      var r = orig.apply(this, arguments);
      try { if (after) after.call(this, ctx, arguments); } catch (e) {}
      return r;
    };
    w.__kmWrapped = true;
    window[name] = w;
  }
  function g(fn, fb) { try { return fn(); } catch (e) { return fb; } }

  function hookGame() {
    if (typeof window.afterBattleWin !== 'function') return; // ゲーム画面以外（トップ・プリント）
    // 3：バトル勝利
    wrap('afterBattleWin', function () {
      var field = g(function () { return battleSource === 'field'; }, false);
      return {
        zone: field ? g(function () { return fieldZone; }, 0) : g(function () { return curStage; }, 0),
        source: g(function () { return battleSource; }, ''),
        mode: g(function () { return difficulty; }, ''),
        boss: g(function () { return field && fieldIsBoss; }, false) ? 1 : 0
      };
    }, function (ctx) { nWin++; if (ctx) send('battle_win', ctx); });

    // 4：漢字ゲット（セーブのたびに、なかまが増えたかを比べる）
    var known = new Set(g(function () { return Array.from(caught); }, []));
    var sentKanji = 0;
    wrap('save', null, function () {
      var now = g(function () { return Array.from(caught); }, null);
      if (!now) return;
      now.forEach(function (i) {
        if (known.has(i)) return;
        known.add(i);
        if (sentKanji >= 60) return; // 1回の訪問で送りすぎない
        sentKanji++;
        send('kanji_get', {
          kanji: g(function () { return K[i].c; }, ''),
          total: now.length,
          mode: g(function () { return difficulty; }, '')
        });
      });
    });

    // 5：ボス撃破（同じ訪問で同じ地域は1回だけ）
    var bossSent = {};
    wrap('fieldBossDown', function (zone) {
      return { zone: zone, first: g(function () { return !cleared.has(zone); }, true) ? 1 : 0 };
    }, function (ctx) {
      if (!ctx || bossSent[ctx.zone]) return;
      bossSent[ctx.zone] = 1;
      send('boss_down', {
        zone: ctx.zone,
        zone_name: g(function () { return zoneNameOf(ctx.zone); }, ''),
        first: ctx.first
      });
    });

    // 6：学年クリア
    wrap('startGradeCeremony', function (grade) { return grade; }, function (grade) {
      if (grade != null) send('grade_clear', { grade: grade });
    });

    // 7〜10（2026-11-25追加）：どこでやめたかを見るための記録
    var t0 = Date.now(), nBattle = 0, nWin = 0, nWrong = 0;
    function zinfo(zone) {
      return { zone: zone, zone_name: g(function () { return zoneNameOf(zone); }, '') };
    }
    function bossNow() {
      return g(function () { return (fieldIsBoss || isJukugoBoss || isTwinBoss) ? 1 : 0; }, 0);
    }
    function battleStarted(zone) {
      nBattle++;
      var p = zinfo(zone);
      p.boss = bossNow();
      p.nth = nBattle > 20 ? '21+' : String(nBattle);
      if (nBattle <= 60) send('battle_start', p);
    }
    // 7：戦いが始まった（フィールドの戦い・ボス戦）
    wrap('launchFieldBattle', null, function () {
      if (g(function () { return battleSource === 'field' && document.getElementById('screen-battle').classList.contains('active'); }, false)) {
        battleStarted(g(function () { return curStage; }, 0));
      }
    });
    ['launchJukugoBossBattle', 'launchTwinBossBattle'].forEach(function (fn) {
      wrap(fn, null, function () {
        if (g(function () { return document.getElementById('screen-battle').classList.contains('active'); }, false)) {
          battleStarted(g(function () { return curStage; }, 0));
        }
      });
    });
    ['onWrongSimple', 'onWrongParty'].forEach(function (fn) { wrap(fn, null, function () { nWrong++; }); });
    // 8：戦いに負けた（ちからつきた／てもちが全員つかれて家へ帰された）
    function inBattleScreen() {
      return g(function () { return document.getElementById('screen-battle').classList.contains('active'); }, false);
    }
    function loseInfo(how) {
      var zone = g(function () { return curStage; }, 0);
      var p = zinfo(zone);
      p.boss = bossNow();
      p.source = g(function () { return battleSource; }, '');
      p.how = how;
      return p;
    }
    wrap('faint', function () { return loseInfo('faint'); }, function (p) { if (p) send('battle_lose', p); });
    wrap('sendHomeAllTired', function () { return inBattleScreen() ? loseInfo('tired') : null; },
      function (p) { if (p && !inBattleScreen()) send('battle_lose', p); });
    // 9：戦いの途中で「おわる」を押した
    wrap('exitBattle', function () {
      var on = g(function () { return document.getElementById('screen-battle').classList.contains('active'); }, false);
      if (!on) return null;
      var zone = g(function () { return curStage; }, 0);
      var p = zinfo(zone);
      p.boss = bossNow();
      p.source = g(function () { return battleSource; }, '');
      return p;
    }, function (p) {
      var still = g(function () { return document.getElementById('screen-battle').classList.contains('active'); }, true);
      if (p && !still) send('battle_quit', p);
    });
    // 10：ページを離れた・閉じたときの場面（同じ場面なら2度送らない）
    function visible(id) {
      var el = document.getElementById(id);
      return !!(el && el.offsetWidth > 0 && el.offsetHeight > 0);
    }
    function where() {
      var om = document.getElementById('openingMovie');
      if (om && !om.dataset.finishReason && visible('openingMovie')) return 'opening';
      var nm = document.getElementById('nmOverlay'), hs = document.getElementById('heroSelectOverlay');
      if (nm && nm.classList.contains('show')) return 'name';
      if (hs && hs.classList.contains('show')) return 'hero';
      var a = document.querySelector('.screen.active');
      return a ? a.id.replace('screen-', '') : 'unknown';
    }
    var lastLeave = '';
    function leave() {
      var w = where();
      var zone = w === 'battle' ? g(function () { return curStage; }, 0) : w === 'field' ? g(function () { return fieldZone; }, 0) : 0;
      var key = w + '|' + zone + '|' + nWin + '|' + nBattle;
      if (key === lastLeave) return;
      lastLeave = key;
      var p = zone ? zinfo(zone) : { zone: 0, zone_name: '' };
      p.where = w;
      p.boss = w === 'battle' ? bossNow() : 0;
      if (w === 'battle') p.phase = g(function () { return phase; }, '');
      p.wins = nWin > 10 ? '11+' : String(nWin);
      p.battles = nBattle > 10 ? '11+' : String(nBattle);
      p.wrong = nWrong;
      p.sec = Math.round((Date.now() - t0) / 1000);
      p.kanji = g(function () { return caught.size; }, 0);
      p.transport_type = 'beacon';
      send('leave', p);
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });
    window.addEventListener('pagehide', leave);

    // 2：ゲーム開始（新しく名前を入れた／セーブがある状態で開いた）
    wrap('nmOk', function () { return g(function () { return nmStep === 'ask' && nmVal.length > 0; }, false); },
      function (ok) { if (ok) send('game_start', { type: 'new' }); });
    if (g(function () { return hadSaveAtBoot; }, false)) {
      send('game_start', { type: 'continue', kanji: g(function () { return caught.size; }, 0) });
    }

    // 1：オープニング（見終わった／飛ばした・何秒見たか）
    function watchOpening(host) {
      if (!host || host.__kmWatched) return;
      host.__kmWatched = true;
      var video = host.querySelector('video');
      var last = 0;
      if (video) video.addEventListener('timeupdate', function () { if (video.currentTime > 0) last = video.currentTime; });
      new MutationObserver(function (list, obs) {
        var reason = host.dataset.finishReason;
        if (!reason) return;
        obs.disconnect();
        send('opening_end', { how: reason, sec: Math.round(last) });
      }).observe(host, { attributes: true, attributeFilter: ['data-finish-reason'] });
    }
    var host = document.getElementById('openingMovie');
    if (host) watchOpening(host);
    else {
      var bodyObs = new MutationObserver(function () {
        var h = document.getElementById('openingMovie');
        if (h) { bodyObs.disconnect(); watchOpening(h); }
      });
      bodyObs.observe(document.body, { childList: true });
      setTimeout(function () { bodyObs.disconnect(); }, 15000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookGame);
  else hookGame();
  // 11（2026-11-25追加）：ゲームの入口（play/pwa.html）。はじめの確認・はじめるボタン・入口で離れた
  function hookShell() {
    var start = document.getElementById('start'), playBox = document.getElementById('play');
    if (!start || !playBox || !document.getElementById('game')) return;
    var t0 = Date.now(), clicked = false, started = false;
    var mig = document.getElementById('migration'), box = document.getElementById('closed');
    var needCheck = false;
    setTimeout(function () { // 入口の準備（記録の確認）が済んでから、確認が必要かを見る
      needCheck = !!(mig && !mig.hidden && box && !box.checked);
      send('shell_open', { need_check: needCheck ? 1 : 0 });
    }, 1500);
    if (box) box.addEventListener('change', function () { if (box.checked) send('shell_check', { sec: Math.round((Date.now() - t0) / 1000) }); });
    start.addEventListener('click', function (e) { if (e.isTrusted) clicked = true; });
    new MutationObserver(function () {
      if (started || playBox.hidden) return;
      started = true;
      send('shell_start', { auto: clicked ? 0 : 1, need_check: needCheck ? 1 : 0, sec: Math.round((Date.now() - t0) / 1000) });
    }).observe(playBox, { attributes: true, attributeFilter: ['hidden'] });
    var sentLeave = '';
    function leaveShell() {
      if (!playBox.hidden) return; // ゲーム中はゲーム側が記録する
      var w = (box && !box.checked && mig && !mig.hidden) ? 'check' : (start.disabled ? 'wait' : 'ready');
      if (w === sentLeave) return;
      sentLeave = w;
      send('leave', { where: 'shell_' + w, sec: Math.round((Date.now() - t0) / 1000), transport_type: 'beacon' });
    }
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leaveShell(); });
    window.addEventListener('pagehide', leaveShell);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookShell);
  else hookShell();

})();
