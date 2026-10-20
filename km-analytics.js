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
    }, function (ctx) { if (ctx) send('battle_win', ctx); });

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
})();
