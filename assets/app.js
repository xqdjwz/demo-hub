/* ============================================================
 * DemoHub 演示站合集 · 公共数据层
 * 数据优先级：GitHub 远程 JSON > 站点内置 data/sites.json > 本地快照 > 内置兜底
 * 纯静态站点无服务端：浏览器内增改先写本地快照，配置 GitHub 后可同步提交到仓库
 * ============================================================ */
(function (global) {
  'use strict';

  var STORE_KEY = 'demohub_data_v1';
  var DATA_URL = 'data/sites.json';

  /* ---------- 内置兜底数据（file:// 直接打开、远程均失败时使用） ---------- */
  var FALLBACK = {
    version: 1,
    settings: {
      siteName: '演示站合集',
      backgroundImage: '',
      perPage: 24,
      footerCopyright: '© 2026 演示站合集 DemoHub',
      adminPassword: 'admin123',
      github: { owner: '', repo: '', branch: 'main', token: '', path: 'data/sites.json' }
    },
    articles: [
      { id: 'tool', title: '工具', content: '本栏目收录建站与运维常用在线工具说明。' },
      { id: 'contact', title: '联系我们', content: '如发现演示站点失效，可通过仓库 Issue 留言反馈。' }
    ],
    sites: [],
    stats: { totalViews: 0 }
  };

  var data = null;
  var saveTimer = null;

  /* ---------- 工具函数 ---------- */
  function uid() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function nowStr() {
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function firstChar(name) {
    var t = String(name || '').trim();
    return t ? t.charAt(0).toUpperCase() : '站';
  }

  function statusMeta(status) {
    if (status === 'normal') return { text: '正常', cls: 'ok' };
    if (status === 'offline') return { text: '失效', cls: 'bad' };
    return { text: '未知', cls: 'unknown' };
  }

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ---------- 本地快照 ---------- */
  function readLocal() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeLocal(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  function clearLocal() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
  }

  /* ---------- GitHub 配置与接口 ---------- */
  function gh() { return (data.settings && data.settings.github) || {}; }

  function ghConfigured() {
    var g = gh();
    return !!(g.owner && g.repo && g.branch && g.token && g.path);
  }

  function ghRawUrl() {
    var g = gh();
    return 'https://raw.githubusercontent.com/' + g.owner + '/' + g.repo + '/' + g.branch + '/' + g.path;
  }

  function ghApiUrl() {
    var g = gh();
    return 'https://api.github.com/repos/' + g.owner + '/' + g.repo + '/contents/' + g.path;
  }

  function ghHeaders() {
    return {
      'Authorization': 'token ' + gh().token,
      'Accept': 'application/vnd.github+json'
    };
  }

  // 从 GitHub 拉取最新 JSON
  function ghPull() {
    if (!ghConfigured()) return Promise.reject(new Error('未配置 GitHub'));
    return fetch(ghRawUrl(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('远程读取失败：' + r.status);
      return r.json();
    });
  }

  // 把当前数据提交回 GitHub（先取 sha 再 PUT）
  function ghPush(message) {
    if (!ghConfigured()) return Promise.reject(new Error('未配置 GitHub'));
    var content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    return fetch(ghApiUrl(), { headers: ghHeaders(), cache: 'no-store' })
      .then(function (r) {
        if (r.status === 404) return { sha: null };
        if (!r.ok) throw new Error('读取文件元信息失败：' + r.status);
        return r.json();
      })
      .then(function (meta) {
        var body = {
          message: message || 'update demo data ' + nowStr(),
          content: content,
          branch: gh().branch
        };
        if (meta.sha) body.sha = meta.sha;
        return fetch(ghApiUrl(), {
          method: 'PUT',
          headers: Object.assign(ghHeaders(), { 'Content-Type': 'application/json' }),
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error('提交 GitHub 失败：' + r.status);
        return r.json();
      });
  }

  /* ---------- 初始化加载 ---------- */
  function normalize(d) {
    var base = deepClone(FALLBACK);
    if (!d || typeof d !== 'object') return base;
    var out = {
      version: d.version || 1,
      settings: Object.assign(base.settings, d.settings || {}),
      articles: Array.isArray(d.articles) ? d.articles : [],
      sites: Array.isArray(d.sites) ? d.sites : [],
      stats: Object.assign({ totalViews: 0 }, d.stats || {})
    };
    out.settings.github = Object.assign(base.settings.github, (d.settings && d.settings.github) || {});
    return out;
  }

  function init() {
    // 1) 优先 GitHub 远程
    var local = readLocal();
    if (local && local.settings && local.settings.github &&
        local.settings.github.owner && local.settings.github.repo) {
      data = normalize(local);
      return ghPull().then(function (remote) {
        data = normalize(remote);
        writeLocal(data);
        return data;
      }).catch(function () { return data; });
    }
    // 2) 站点内置 JSON
    return fetch(DATA_URL, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('json ' + r.status);
      return r.json();
    }).then(function (remote) {
      data = normalize(remote);
      writeLocal(data);
      return data;
    }).catch(function () {
      data = normalize(local || FALLBACK);
      return data;
    });
  }

  function getData() { return data || normalize(FALLBACK); }

  /* ---------- 持久化 ---------- */
  function persist(message) {
    writeLocal(data);
    if (ghConfigured()) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        ghPush(message).catch(function (e) {
          console.warn('GitHub 同步失败：', e.message);
        });
      }, 800);
    }
  }

  function save(mutator, message) {
    mutator(data);
    persist(message);
  }

  /* ---------- 导入 / 导出 ---------- */
  function exportJSON() {
    return JSON.stringify(getData(), null, 2);
  }

  function importJSON(obj) {
    data = normalize(obj);
    persist('import data');
    return data;
  }

  function resetLocal() { clearLocal(); }

  /* ---------- 浏览量 ---------- */
  function recordView(siteId) {
    var d = getData();
    var site = d.sites.find(function (s) { return s.id === siteId; });
    if (site) {
      site.views = (parseInt(site.views, 10) || 0) + 1;
    }
    d.stats.totalViews = (parseInt(d.stats.totalViews, 10) || 0) + 1;
    persist('view');
  }

  /* ---------- 链接检测（浏览器环境受跨域限制，结果仅供参考） ---------- */
  function checkLink(url) {
    if (!url) return Promise.resolve('unknown');
    return fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
      return r.ok ? 'normal' : 'offline';
    }).catch(function () {
      return fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' }).then(function () {
        return 'normal';
      }).catch(function () { return 'offline'; });
    });
  }

  /* ---------- 分类聚合 ---------- */
  function categories() {
    var set = {};
    getData().sites.forEach(function (s) {
      if (s.category) set[s.category] = true;
    });
    return Object.keys(set).sort();
  }

  global.Store = {
    init: init,
    getData: getData,
    save: save,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetLocal: resetLocal,
    recordView: recordView,
    checkLink: checkLink,
    ghConfigured: ghConfigured,
    ghPush: ghPush,
    ghPull: ghPull,
    categories: categories,
    helpers: {
      uid: uid, nowStr: nowStr, esc: esc,
      firstChar: firstChar, statusMeta: statusMeta, deepClone: deepClone
    }
  };
})(window);
