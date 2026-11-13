/* ============ 前台首页逻辑 ============ */
(function () {
  'use strict';

  var H = Store.helpers;
  var state = {
    keyword: '',
    category: 'all',
    page: 1,
    perPage: 24
  };

  var PALETTE = ['#1F6FEB', '#179A6C', '#8A5CF6', '#D97757', '#0E9F9F', '#C2578B', '#5B7C99', '#B58A2E'];

  function palette(name) {
    var s = String(name || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function $(id) { return document.getElementById(id); }

  /* ---------- 过滤 ---------- */
  function filtered() {
    var d = Store.getData();
    var kw = state.keyword.trim().toLowerCase();
    return d.sites.filter(function (s) {
      if (state.category !== 'all' && s.category !== state.category) return false;
      if (!kw) return true;
      var hay = [s.name, s.intro, s.url, s.category, s.sourceUrl].join(' ').toLowerCase();
      return hay.indexOf(kw) >= 0;
    });
  }

  /* ---------- 导航文章 ---------- */
  function renderNav() {
    var d = Store.getData();
    var box = $('navArticles');
    box.innerHTML = '';
    d.articles.forEach(function (a) {
      var el = document.createElement('a');
      el.href = 'javascript:void(0)';
      el.textContent = a.title;
      el.addEventListener('click', function () { openArticle(a); });
      box.appendChild(el);
    });
  }

  function openArticle(a) {
    $('articleTitle').textContent = a.title;
    $('articleContent').textContent = a.content || '（暂无内容）';
    $('articleModal').classList.add('open');
  }

  /* ---------- 分类下拉 ---------- */
  function renderCatMenu() {
    var cats = Store.categories();
    var menu = $('catMenu');
    menu.innerHTML = '';
    var all = ['all'].concat(cats);
    all.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = c === 'all' ? '全部分类' : c;
      if (state.category === c) b.classList.add('active');
      b.addEventListener('click', function () {
        state.category = c;
        state.page = 1;
        $('catBtnText').textContent = c === 'all' ? '全部分类' : c;
        menu.classList.remove('open');
        renderCatMenu();
        renderGrid();
      });
      menu.appendChild(b);
    });
  }

  /* ---------- 卡片 ---------- */
  function cardHtml(s) {
    var meta = H.statusMeta(s.status);
    var host = '';
    try { host = s.url ? new URL(s.url).hostname : ''; } catch (e) { host = s.url || ''; }
    var thumb = s.image
      ? '<img src="' + H.esc(s.image) + '" alt="">'
      : H.esc(H.firstChar(s.name));
    var style = s.image ? '' : ' style="background:' + palette(s.name) + '"';
    return '' +
      '<article class="card" data-id="' + H.esc(s.id) + '">' +
        '<div class="card-head">' +
          '<div class="thumb"' + style + '>' + thumb + '</div>' +
          '<div class="card-title">' + H.esc(s.name) + '</div>' +
        '</div>' +
        '<div class="card-meta">' +
          '<span class="badge ' + meta.cls + '">' + meta.text + '</span>' +
          '<span class="site-url">' + H.esc(host) + '</span>' +
        '</div>' +
        '<div class="card-foot">' +
          '<span class="card-cat">' + H.esc(s.category || '未分类') + '</span>' +
          '<span>浏览 ' + (parseInt(s.views, 10) || 0).toLocaleString() + '</span>' +
        '</div>' +
      '</article>';
  }

  function renderGrid() {
    var list = filtered();
    var total = list.length;
    var per = state.perPage;
    var pages = Math.max(1, Math.ceil(total / per));
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * per;
    var slice = list.slice(start, start + per);

    var grid = $('cardGrid');
    if (!slice.length) {
      grid.innerHTML = '<div class="empty">没有匹配的演示站点</div>';
    } else {
      grid.innerHTML = slice.map(cardHtml).join('');
    }

    Array.prototype.forEach.call(grid.querySelectorAll('.card'), function (el) {
      el.addEventListener('click', function () {
        var site = Store.getData().sites.find(function (x) { return x.id === el.dataset.id; });
        if (site) openDetail(site);
      });
    });

    renderPager(pages, total);
    renderStats();
  }

  function renderStats() {
    var d = Store.getData();
    $('statCount').textContent = d.sites.length;
    $('statViews').textContent = (parseInt(d.stats.totalViews, 10) || 0).toLocaleString();
  }

  /* ---------- 分页 ---------- */
  function renderPager(pages, total) {
    var pager = $('pager');
    if (pages <= 1) { pager.innerHTML = '<span class="page-info">共 ' + total + ' 条</span>'; return; }

    var html = '<button type="button" ' + (state.page === 1 ? 'disabled' : '') + ' data-p="prev">上一页</button>';
    var nums = pageNumbers(state.page, pages);
    nums.forEach(function (n) {
      if (n === '…') {
        html += '<span class="page-info">…</span>';
      } else {
        html += '<button type="button" class="' + (n === state.page ? 'active' : '') + '" data-p="' + n + '">' + n + '</button>';
      }
    });
    html += '<button type="button" ' + (state.page === pages ? 'disabled' : '') + ' data-p="next">下一页</button>';
    html += '<span class="page-info">第 ' + state.page + ' / ' + pages + ' 页 · 共 ' + total + ' 条</span>';
    pager.innerHTML = html;

    Array.prototype.forEach.call(pager.querySelectorAll('button[data-p]'), function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.p;
        if (v === 'prev') state.page = Math.max(1, state.page - 1);
        else if (v === 'next') state.page = Math.min(pages, state.page + 1);
        else state.page = parseInt(v, 10);
        renderGrid();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function pageNumbers(cur, total) {
    var arr = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) arr.push(i);
      return arr;
    }
    arr.push(1);
    if (cur > 3) arr.push('…');
    for (var n = Math.max(2, cur - 1); n <= Math.min(total - 1, cur + 1); n++) arr.push(n);
    if (cur < total - 2) arr.push('…');
    arr.push(total);
    return arr;
  }

  /* ---------- 详情弹窗 ---------- */
  function openDetail(site) {
    Store.recordView(site.id);
    var meta = H.statusMeta(site.status);
    var features = Array.isArray(site.features) ? site.features : [];
    var featHtml = features.length
      ? '<ul class="feature-list">' + features.map(function (f) { return '<li>' + H.esc(f) + '</li>'; }).join('') + '</ul>'
      : '<span class="value">—</span>';

    var rows =
      row('是否正常', '<span class="badge ' + meta.cls + '">' + meta.text + '</span>') +
      row('站点地址', site.url ? '<a href="' + H.esc(site.url) + '" target="_blank" rel="noopener">' + H.esc(site.url) + '</a>' : '—') +
      row('简介', H.esc(site.intro) || '—') +
      row('功能', featHtml) +
      row('演示账号', H.esc(site.demoAccount) || '—') +
      row('演示密码', H.esc(site.demoPassword) || '—') +
      row('最近检测', H.esc(site.checkedAt) || '—') +
      row('浏览量', (parseInt(site.views, 10) || 0).toLocaleString());

    var actions =
      '<div class="detail-actions">' +
        (site.url ? '<a class="btn btn-primary" href="' + H.esc(site.url) + '" target="_blank" rel="noopener">打开演示站</a>' : '') +
        (site.sourceUrl ? '<a class="btn btn-ghost" href="' + H.esc(site.sourceUrl) + '" target="_blank" rel="noopener">源码地址</a>' : '') +
      '</div>';

    $('siteModalBody').innerHTML = '<h2 class="detail-title">' + H.esc(site.name) + '</h2>' + rows + actions;
    $('siteModal').classList.add('open');
  }

  function row(label, valueHtml) {
    return '<div class="detail-row"><span class="label">' + label + '</span><span class="value">' + valueHtml + '</span></div>';
  }

  /* ---------- 静态页弹窗 ---------- */
  var PAGES = {
    privacy: {
      title: '隐私政策',
      content: '本网站为演示站点导航合集，仅在您的浏览器本地记录浏览量与筛选状态。本站不主动收集您的姓名、手机号等个人身份信息；通过浏览器访问演示站点时，相关站点自身的隐私政策由其各自负责。如您在后台配置了 GitHub 令牌，令牌仅保存在您当前浏览器中，用于向您自己的仓库提交数据。'
    },
    disclaimer: {
      title: '免责声明',
      content: '本站所有演示站点仅用于技术演示，不承担任何使用分享。\n\n1. 站内收录的演示系统、账号密码均来自公开网络或示例配置，仅供功能体验与技术评估，请勿用于生产环境。\n2. 演示站点的内容、数据与版权归原作者或相应权利人所有，如涉及侵权请联系移除。\n3. 因使用或信赖本站收录演示站点而造成的任何直接或间接损失，本站不承担法律责任。\n4. 源码地址指向第三方仓库，其许可证与使用条款请以对应仓库说明为准。'
    },
    sitemap: { title: '站点地图', content: '' }
  };

  function openPage(key) {
    var page = PAGES[key];
    if (!page) return;
    $('pageTitle').textContent = page.title;
    if (key === 'sitemap') {
      var sites = Store.getData().sites;
      $('pageContent').innerHTML = sites.length
        ? '<ul class="feature-list">' + sites.map(function (s) {
            var href = s.url || 'javascript:void(0)';
            return '<li><a href="' + H.esc(href) + '" target="_blank" rel="noopener">' + H.esc(s.name) + '</a> <span style="color:var(--muted)">' + H.esc(s.category || '') + '</span></li>';
          }).join('') + '</ul>'
        : '暂无站点。';
    } else {
      $('pageContent').textContent = page.content;
    }
    $('pageModal').classList.add('open');
  }

  /* ---------- 背景 / 站点名 ---------- */
  function applySettings() {
    var s = Store.getData().settings;
    $('brandName').textContent = s.siteName || '演示站合集';
    $('brandMark').textContent = H.firstChar(s.siteName);
    $('footerCopyright').textContent = s.footerCopyright || $('footerCopyright').textContent;
    if (s.backgroundImage) {
      document.body.style.backgroundImage = 'url("' + s.backgroundImage + '")';
      document.body.classList.add('has-bg');
    } else {
      document.body.style.backgroundImage = '';
      document.body.classList.remove('has-bg');
    }
    state.perPage = parseInt(s.perPage, 10) || 24;
    var sel = $('perPageSelect');
    sel.value = String(state.perPage);
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    $('searchInput').addEventListener('input', function (e) {
      state.keyword = e.target.value;
      state.page = 1;
      renderGrid();
    });

    $('catBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      $('catMenu').classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.cat-dropdown')) $('catMenu').classList.remove('open');
    });

    $('perPageSelect').addEventListener('change', function (e) {
      state.perPage = parseInt(e.target.value, 10) || 24;
      state.page = 1;
      Store.save(function (d) { d.settings.perPage = state.perPage; }, 'settings');
      renderGrid();
    });

    $('toTop').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('toBottom').addEventListener('click', function () {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });
    $('fab').addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    // 弹窗关闭
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () {
        $(btn.dataset.close).classList.remove('open');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.modal-mask'), function (mask) {
      mask.addEventListener('click', function (e) {
        if (e.target === mask) mask.classList.remove('open');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        Array.prototype.forEach.call(document.querySelectorAll('.modal-mask.open'), function (m) {
          m.classList.remove('open');
        });
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll('.footer-links a[data-page]'), function (a) {
      a.addEventListener('click', function () { openPage(a.dataset.page); });
    });
  }

  /* ---------- 启动 ---------- */
  Store.init().then(function () {
    applySettings();
    renderNav();
    renderCatMenu();
    bind();
    renderGrid();
  });
})();
