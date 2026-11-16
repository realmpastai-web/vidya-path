/* Vidya Path: a tiny, dependency-free viewer for the curated video index. */
(function () {
  'use strict';

  var T = window.TAXONOMY;
  var CFG = window.SITE_CONFIG || {};
  var app = document.getElementById('app');
  var bar = document.getElementById('bar');
  var cache = {};
  var player = null;
  var apiPromise = null;
  var renderToken = 0;

  // ---------- small helpers ----------

  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage may be blocked */ }
  }

  var conn = navigator.connection || {};
  var slow = conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  var lowData = load('lowData', slow ? '1' : '0') === '1';
  var uiLang = load('lang', 'en');

  function t(key) {
    return (T.ui[uiLang] && T.ui[uiLang][key]) || T.ui.en[key] || key;
  }
  function label(item) { return item.label[uiLang] || item.label.en; }
  function byId(list, id) {
    if (!id) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id || list[i].code === id) return list[i];
    return null;
  }

  // h('a', {class: 'x', href: '#'}, [child, 'text'])
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'onclick') el.addEventListener('click', attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    [].concat(kids || []).forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function message(text) { return h('p', { class: 'msg' }, text); }

  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch('data/' + path).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).catch(function (err) {
        delete cache[path];
        throw err;
      });
    }
    return cache[path];
  }

  function clock(seconds) {
    var m = Math.floor(seconds / 60), s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function thumb(videoId) { return 'https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg'; }
  function href(parts) { return '#/' + parts.map(encodeURIComponent).join('/'); }

  function destroyPlayer() {
    if (player) {
      try { player.destroy(); } catch (e) { /* already gone */ }
      player = null;
    }
  }

  // ---------- top bar ----------

  function renderBar(title, backParts, lang) {
    clear(bar);
    if (backParts) {
      bar.appendChild(h('a', { href: href(backParts), 'aria-label': t('back') }, '←'));
    }
    bar.appendChild(h('span', { class: 'title' }, title));
    if (lang) {
      bar.appendChild(h('a', { href: href([lang, 'search']), 'aria-label': t('search') }, '🔍'));
    }
    bar.appendChild(h('button', {
      type: 'button',
      'aria-pressed': lowData ? 'true' : 'false',
      onclick: function () {
        lowData = !lowData;
        save('lowData', lowData ? '1' : '0');
        render();
      }
    }, ['🐢', h('span', { class: 'txt' }, t('lowData'))]));
  }

  // ---------- views ----------

  function viewLanguages() {
    renderBar(CFG.name || 'Vidya Path', null, null);
    app.appendChild(h('h1', {}, T.languages.map(function (l) {
      return (T.ui[l.code] || T.ui.en).chooseLanguage;
    }).filter(function (s, i, a) { return a.indexOf(s) === i; }).join(' · ')));
    app.appendChild(h('div', { class: 'tiles' }, T.languages.map(function (l) {
      return h('a', { class: 'tile lang', href: href([l.code]), lang: l.code }, [
        l.native,
        l.native !== l.name ? h('small', {}, l.name) : null
      ]);
    })));
  }

  function shelvesFor(index, level) {
    return index.shelves.filter(function (s) { return s.level === level; });
  }

  function viewLevels(lang, index) {
    renderBar(byId(T.languages, lang).native, [], lang);
    var levels = T.levels.filter(function (lv) { return shelvesFor(index, lv.id).length; });
    if (!levels.length) return app.appendChild(message(t('empty')));
    app.appendChild(h('h1', {}, t('chooseLevel')));
    app.appendChild(h('div', { class: 'tiles' }, levels.map(function (lv) {
      return h('a', { class: 'tile', href: href([lang, lv.id]) }, [
        h('span', { class: 'ico', 'aria-hidden': 'true' }, lv.icon), label(lv)
      ]);
    })));
  }

  function viewSubjects(lang, index, level) {
    renderBar(label(level), [lang], lang);
    var shelves = shelvesFor(index, level.id);
    if (!shelves.length) return app.appendChild(message(t('empty')));
    app.appendChild(h('h1', {}, t('chooseSubject')));
    app.appendChild(h('div', { class: 'tiles' }, T.subjects.filter(function (s) {
      return shelves.some(function (sh) { return sh.subject === s.id; });
    }).map(function (s) {
      return h('a', { class: 'tile', href: href([lang, level.id, s.id]) }, [
        h('span', { class: 'ico', 'aria-hidden': 'true' }, s.icon), label(s)
      ]);
    })));
  }

  function findShelf(index, level, subject) {
    for (var i = 0; i < index.shelves.length; i++) {
      var s = index.shelves[i];
      if (s.level === level && s.subject === subject) return s;
    }
    return null;
  }

  function viewShelf(lang, level, subject, shelf) {
    renderBar(subject.icon + ' ' + label(subject), [lang, level.id], lang);
    if (!shelf || !shelf.playlists.length) return app.appendChild(message(t('empty')));
    app.appendChild(h('a', { class: 'tv', href: href([lang, level.id, subject.id, 'tv']) }, ['📺', t('tv')]));
    app.appendChild(h('ul', { class: 'rows' }, shelf.playlists.map(function (p) {
      return h('li', {}, h('a', { class: 'row', href: href([lang, level.id, subject.id, p.id]) }, [
        h('span', { class: 'grow' }, [
          p.title,
          h('span', { class: 'sub' }, p.channel + ' · ' + p.n + ' ' + t('videos'))
        ]),
        '▶'
      ]));
    })));
  }

  function viewSearch(lang) {
    renderBar(t('search'), [lang], null);
    var input = h('input', { type: 'search', placeholder: t('searchHint'), 'aria-label': t('search'), autocomplete: 'off' });
    var out = h('div', {});
    app.appendChild(input);
    app.appendChild(out);
    var token = renderToken;
    var rows = null;

    function show() {
      clear(out);
      var words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length || !rows) return;
      var hits = [];
      for (var i = 0; i < rows.length && hits.length < 40; i++) {
        var title = rows[i][1].toLowerCase();
        if (words.every(function (w) { return title.indexOf(w) !== -1; })) hits.push(rows[i]);
      }
      if (!hits.length) return out.appendChild(message(t('noResults')));
      out.appendChild(h('ul', { class: 'rows' }, hits.map(function (r) {
        return h('li', {}, h('a', { class: 'row', href: href([lang, r[3], r[4], r[2], r[0]]) }, [
          lowData ? null : h('img', { src: thumb(r[0]), alt: '', loading: 'lazy', width: '96', height: '54' }),
          h('span', { class: 'grow' }, r[1])
        ]));
      })));
    }

    input.addEventListener('input', show);
    input.focus();
    getJSON(lang + '/search.json').then(function (data) {
      if (token !== renderToken) return;
      rows = data;
      show();
    }).catch(function () {
      if (token === renderToken) out.appendChild(message(t('empty')));
    });
  }

  // ---------- player ----------

  function ensureApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (!apiPromise) {
      apiPromise = new Promise(function (resolve, reject) {
        window.onYouTubeIframeAPIReady = resolve;
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        s.onerror = function () { apiPromise = null; reject(new Error('player api')); };
        document.head.appendChild(s);
      });
    }
    return apiPromise;
  }

  /*
   * Plays a fixed sequence. `queue` is a list of playlist ids; each playlist file is
   * fetched only when the previous one runs out, so TV mode stays light on data.
   */
  function viewSequence(opts) {
    var token = renderToken;
    var items = [];
    var idx = 0;
    var queuePos = 0;
    var started = false;

    var stage = h('div', { class: 'stage' });
    var now = h('p', { class: 'now', 'aria-live': 'polite' });
    var prevBtn = h('button', { type: 'button', onclick: function () { go(idx - 1, started); } }, '⏮ ' + t('prev'));
    var nextBtn = h('button', { type: 'button', onclick: function () { advance(started); } }, t('next') + ' ⏭');
    var list = h('ol', { class: 'rows' });
    var report = CFG.reportEmail ? h('a', { class: 'report' }, t('report')) : null;

    app.appendChild(stage);
    app.appendChild(now);
    app.appendChild(h('div', { class: 'ctl' }, [prevBtn, nextBtn]));
    app.appendChild(list);
    if (report) app.appendChild(report);

    function loadMore() {
      if (queuePos >= opts.queue.length) return Promise.resolve(false);
      var id = opts.queue[queuePos++];
      return getJSON(opts.lang + '/pl/' + id + '.json').then(function (pl) {
        if (token !== renderToken) return false;
        pl.videos.forEach(function (v, n) {
          var item = { id: v[0], title: v[1], secs: v[2], pl: id };
          var i = items.push(item) - 1;
          item.row = h('button', { class: 'row', type: 'button', onclick: function () { go(i, true); } }, [
            opts.queue.length > 1 ? null : h('span', { class: 'num' }, String(n + 1)),
            lowData ? null : h('img', { src: thumb(item.id), alt: '', loading: 'lazy', width: '96', height: '54' }),
            h('span', { class: 'grow' }, [item.title, h('span', { class: 'sub' }, clock(item.secs))])
          ]);
          list.appendChild(h('li', {}, item.row));
        });
        return pl.videos.length > 0 || loadMore();
      }, function () {
        return token === renderToken ? loadMore() : false;
      });
    }

    function facade(item) {
      destroyPlayer();
      clear(stage);
      if (!lowData) stage.appendChild(h('img', { src: thumb(item.id), alt: '' }));
      stage.appendChild(h('button', { class: 'facade', type: 'button', onclick: function () { go(idx, true); } }, [
        h('span', { class: 'play', 'aria-hidden': 'true' }, '▶'),
        h('span', {}, t('tapToPlay'))
      ]));
    }

    function startPlayer(videoId) {
      clear(stage);
      var holder = h('div', {});
      stage.appendChild(holder);
      ensureApi().then(function () {
        if (token !== renderToken || !holder.parentNode) return;
        player = new window.YT.Player(holder, {
          host: 'https://www.youtube-nocookie.com',
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3,
            hl: uiLang, origin: location.origin
          },
          events: {
            onStateChange: function (e) { if (e.data === 0) advance(true); },
            // Removed, private or embed-disabled videos: move on quietly.
            onError: function () { advance(true); }
          }
        });
      }).catch(function () {
        if (token !== renderToken) return;
        started = false;
        clear(stage);
        stage.appendChild(h('div', { class: 'card' }, [h('span', {}, t('playerError'))]));
      });
    }

    function go(i, play) {
      if (i < 0 || i >= items.length) return;
      if (items[idx]) items[idx].row.classList.remove('on');
      idx = i;
      var item = items[idx];
      item.row.classList.add('on');
      now.textContent = item.title;
      prevBtn.disabled = idx === 0;
      if (report) {
        report.href = 'mailto:' + CFG.reportEmail + '?subject=' +
          encodeURIComponent('Report video ' + item.id + ' (' + opts.lang + ')');
      }
      save('resume:' + opts.key, item.id);
      if (!play) return facade(item);
      started = true;
      if (player && player.loadVideoById) player.loadVideoById(item.id);
      else startPlayer(item.id);
    }

    function advance(play) {
      if (idx + 1 < items.length) return go(idx + 1, play);
      loadMore().then(function (more) {
        if (token !== renderToken) return;
        if (more && idx + 1 < items.length) go(idx + 1, play);
        else finish();
      });
    }

    function finish() {
      destroyPlayer();
      started = false;
      save('resume:' + opts.key, '');
      clear(stage);
      stage.appendChild(h('div', { class: 'card' }, [
        h('span', { class: 'big', 'aria-hidden': 'true' }, '🎉'),
        h('span', {}, t('done')),
        h('button', { type: 'button', onclick: function () { go(0, true); } }, t('again'))
      ]));
    }

    stage.appendChild(h('div', { class: 'card' }, t('loading')));
    loadMore().then(function (ok) {
      if (token !== renderToken) return;
      if (!ok) {
        clear(stage);
        stage.appendChild(h('div', { class: 'card' }, t('empty')));
        return;
      }
      var want = opts.startVideo || load('resume:' + opts.key, '');
      var at = 0;
      for (var i = 0; i < items.length; i++) if (items[i].id === want) at = i;
      go(at, false);
    });
  }

  // ---------- router ----------

  function render() {
    renderToken++;
    var token = renderToken;
    destroyPlayer();
    clear(app);
    window.scrollTo(0, 0);

    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    var lang = parts[0];
    var language = byId(T.languages, lang);
    if (!language) {
      document.documentElement.lang = uiLang;
      return viewLanguages();
    }

    uiLang = T.ui[lang] ? lang : 'en';
    save('lang', uiLang);
    document.documentElement.lang = uiLang;

    if (parts[1] === 'search') return viewSearch(lang);

    renderBar(language.native, [], lang);
    app.appendChild(message(t('loading')));
    getJSON(lang + '/index.json').then(function (index) {
      if (token !== renderToken) return;
      clear(app);
      var level = byId(T.levels, parts[1]);
      var subject = byId(T.subjects, parts[2]);
      if (!level) return viewLevels(lang, index);
      if (!subject) return viewSubjects(lang, index, level);
      var shelf = findShelf(index, level.id, subject.id);
      if (!parts[3] || !shelf) return viewShelf(lang, level, subject, shelf);

      var back = [lang, level.id, subject.id];
      if (parts[3] === 'tv') {
        renderBar('📺 ' + label(subject), back, lang);
        return viewSequence({
          lang: lang,
          key: [lang, level.id, subject.id, 'tv'].join('/'),
          queue: shelf.playlists.map(function (p) { return p.id; })
        });
      }
      var pl = byId(shelf.playlists, parts[3]);
      if (!pl) return viewShelf(lang, level, subject, shelf);
      renderBar(pl.title, back, lang);
      viewSequence({ lang: lang, key: pl.id, queue: [pl.id], startVideo: parts[4] });
    }).catch(function () {
      if (token !== renderToken) return;
      clear(app);
      app.appendChild(message(t('empty')));
    });
  }

  window.addEventListener('hashchange', render);
  render();
})();
