/* ============ 后台管理逻辑 ============ */
(function () {
  'use strict';

  var H = Store.helpers;
  var AUTH_KEY = 'demohub_admin_auth';
  var editingSiteId = null;
  var editingArticleId = null;

  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- 登录 ---------- */
  function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === '1'; }

  function showView() {
    $('loginView').style.display = isAuthed() ? 'none' : 'block';
    $('adminView').style.display = isAuthed() ? 'block' : 'none';
  }

  function doLogin() {
    var pwd = $('loginPwd').value;
    var real = Store.getData().settings.adminPassword || 'admin123';
    if (pwd === real) {
      sessionStorage.setItem(AUTH_KEY, '1');
      showView();
      renderAll();
      toast('登录成功');
    } else {
      toast('密码错误');
    }
  }

  /* ---------- Tabs ---------- */
  function bindTabs() {
    Array.prototype.forEach.call(document.querySelectorAll('#adminTabs button'), function (btn) {
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(document.querySelectorAll('#adminTabs button'), function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        ['sites', 'articles', 'settings', 'data', 'github'].forEach(function (k) {
          $('panel-' + k).style.display = k === btn.dataset.tab ? 'block' : 'none';
        });
      });
    });
  }

  /* ---------- 站点管理 ---------- */
  function renderSiteTable() {
    var sites = Store.getData().sites;
    var tbody = $('siteTbody');
    if (!sites.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px;">暂无站点，点击「添加站点」录入</td></tr>';
      return;
    }
    tbody.innerHTML = sites.map(function (s) {
      var meta = H.statusMeta(s.status);
      var host = '';
      try { host = s.url ? new URL(s.url).hostname : s.url; } catch (e) { host = s.url || ''; }
      return '<tr>' +
        '<td>' + H.esc(s.name) + '</td>' +
        '<td>' + H.esc(s.category || '—') + '</td>' +
        '<td><span class="badge ' + meta.cls + '">' + meta.text + '</span></td>' +
        '<td>' + (s.url ? '<a href="' + H.esc(s.url) + '" target="_blank" rel="noopener">' + H.esc(host) + '</a>' : '—') + '</td>' +
        '<td>' + (parseInt(s.views, 10) || 0).toLocaleString() + '</td>' +
        '<td class="actions">' +
          '<button class="link-btn" data-act="edit" data-id="' + H.esc(s.id) + '">编辑</button>' +
          '<button class="link-btn danger" data-act="del" data-id="' + H.esc(s.id) + '">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    Array.prototype.forEach.call(tbody.querySelectorAll('button[data-act]'), function (b) {
      b.addEventListener('click', function () {
        var site = Store.getData().sites.find(function (x) { return x.id === b.dataset.id; });
        if (!site) return;
        if (b.dataset.act === 'edit') openSiteForm(site);
        else if (b.dataset.act === 'del') {
          if (confirm('确定删除「' + site.name + '」吗？')) {
            Store.save(function (d) {
              d.sites = d.sites.filter(function (x) { return x.id !== site.id; });
            }, 'delete site');
            renderSiteTable();
            toast('已删除');
          }
        }
      });
    });

    // 分类候选
    var cats = Store.categories();
    $('catList').innerHTML = cats.map(function (c) { return '<option value="' + H.esc(c) + '">'; }).join('');
  }

  function openSiteForm(site) {
    editingSiteId = site ? site.id : null;
    $('formTitle').textContent = site ? '编辑站点' : '添加站点';
    $('fName').value = site ? site.name : '';
    $('fCategory').value = site ? (site.category || '') : '';
    $('fUrl').value = site ? (site.url || '') : '';
    $('fSource').value = site ? (site.sourceUrl || '') : '';
    $('fStatus').value = site ? (site.status || 'unknown') : 'normal';
    $('fCheckedAt').value = site ? (site.checkedAt || '') : '';
    $('fIntro').value = site ? (site.intro || '') : '';
    $('fFeatures').value = site && Array.isArray(site.features) ? site.features.join('\n') : '';
    $('fAccount').value = site ? (site.demoAccount || '') : '';
    $('fPassword').value = site ? (site.demoPassword || '') : '';
    $('fImage').value = site ? (site.image || '') : '';
    $('siteFormModal').classList.add('open');
  }

  function saveSiteForm() {
    var name = $('fName').value.trim();
    if (!name) { toast('请填写系统名称'); return; }
    var features = $('fFeatures').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    var record = {
      name: name,
      category: $('fCategory').value.trim() || '未分类',
      url: $('fUrl').value.trim(),
      sourceUrl: $('fSource').value.trim(),
      status: $('fStatus').value,
      checkedAt: $('fCheckedAt').value.trim() || H.nowStr(),
      intro: $('fIntro').value.trim(),
      features: features,
      demoAccount: $('fAccount').value.trim(),
      demoPassword: $('fPassword').value.trim(),
      image: $('fImage').value.trim()
    };

    Store.save(function (d) {
      if (editingSiteId) {
        var old = d.sites.find(function (x) { return x.id === editingSiteId; });
        if (old) Object.assign(old, record);
      } else {
        record.id = H.uid();
        record.views = 0;
        d.sites.push(record);
      }
    }, editingSiteId ? 'update site' : 'add site');

    $('siteFormModal').classList.remove('open');
    renderSiteTable();
    toast('站点已保存');
  }

  /* ---------- 链接批量检测 ---------- */
  function checkAll() {
    var sites = Store.getData().sites.slice();
    if (!sites.length) { toast('暂无站点'); return; }
    var btn = $('checkAllBtn');
    btn.disabled = true;
    var i = 0, done = 0;

    function next() {
      if (i >= sites.length) {
        btn.disabled = false;
        renderSiteTable();
        toast('检测完成：' + done + ' 个正常 / ' + (sites.length - done) + ' 个异常或未知');
        return;
      }
      var s = sites[i++];
      if (!s.url) { finish('unknown'); return; }
      Store.checkLink(s.url).then(function (res) { finish(res); });

      function finish(res) {
        Store.save(function (d) {
          var target = d.sites.find(function (x) { return x.id === s.id; });
          if (target) {
            target.status = res;
            target.checkedAt = H.nowStr();
          }
        }, 'check link');
        if (res === 'normal') done++;
        renderSiteTable();
        next();
      }
    }
    next();
  }

  /* ---------- 文章管理 ---------- */
  function renderArticleTable() {
    var arts = Store.getData().articles;
    var tbody = $('articleTbody');
    if (!arts.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:30px;">暂无文章</td></tr>';
      return;
    }
    tbody.innerHTML = arts.map(function (a) {
      var summary = (a.content || '').replace(/\s+/g, ' ').slice(0, 60);
      return '<tr>' +
        '<td>' + H.esc(a.title) + '</td>' +
        '<td>' + H.esc(summary) + '</td>' +
        '<td class="actions">' +
          '<button class="link-btn" data-act="edit" data-id="' + H.esc(a.id) + '">编辑</button>' +
          '<button class="link-btn danger" data-act="del" data-id="' + H.esc(a.id) + '">删除</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    Array.prototype.forEach.call(tbody.querySelectorAll('button[data-act]'), function (b) {
      b.addEventListener('click', function () {
        var art = Store.getData().articles.find(function (x) { return x.id === b.dataset.id; });
        if (!art) return;
        if (b.dataset.act === 'edit') openArticleForm(art);
        else if (b.dataset.act === 'del') {
          if (confirm('确定删除文章「' + art.title + '」吗？')) {
            Store.save(function (d) {
              d.articles = d.articles.filter(function (x) { return x.id !== art.id; });
            }, 'delete article');
            renderArticleTable();
            toast('已删除');
          }
        }
      });
    });
  }

  function openArticleForm(art) {
    editingArticleId = art ? art.id : null;
    $('articleFormTitle').textContent = art ? '编辑文章' : '添加文章';
    $('aTitle').value = art ? art.title : '';
    $('aContent').value = art ? (art.content || '') : '';
    $('articleFormModal').classList.add('open');
  }

  function saveArticleForm() {
    var title = $('aTitle').value.trim();
    if (!title) { toast('请填写文章标题'); return; }
    Store.save(function (d) {
      if (editingArticleId) {
        var old = d.articles.find(function (x) { return x.id === editingArticleId; });
        if (old) { old.title = title; old.content = $('aContent').value; }
      } else {
        d.articles.push({ id: H.uid(), title: title, content: $('aContent').value });
      }
    }, 'save article');
    $('articleFormModal').classList.remove('open');
    renderArticleTable();
    toast('文章已保存');
  }

  /* ---------- 站点设置 ---------- */
  function fillSettings() {
    var s = Store.getData().settings;
    $('setSiteName').value = s.siteName || '';
    $('setPerPage').value = String(s.perPage || 24);
    $('setFooter').value = s.footerCopyright || '';
    $('setBgUrl').value = s.backgroundImage || '';
    $('setPassword').value = '';
  }

  function saveSettings() {
    var newPwd = $('setPassword').value;
    Store.save(function (d) {
      d.settings.siteName = $('setSiteName').value.trim() || '演示站合集';
      d.settings.perPage = parseInt($('setPerPage').value, 10) || 24;
      d.settings.footerCopyright = $('setFooter').value.trim();
      d.settings.backgroundImage = $('setBgUrl').value.trim();
      if (newPwd) d.settings.adminPassword = newPwd;
    }, 'settings');
    toast('设置已保存');
  }

  function bindBgUpload() {
    $('setBgFile').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        $('setBgUrl').value = reader.result;
        toast('图片已读取，记得点击保存设置');
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- 数据管理 ---------- */
  function exportData() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'demo-hub-data-' + Date.now() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var obj = JSON.parse(reader.result);
        Store.importJSON(obj);
        renderAll();
        toast('数据导入成功');
      } catch (e) {
        toast('导入失败：JSON 格式不正确');
      }
    };
    reader.readAsText(file);
  }

  function resetViews() {
    if (!confirm('确定清空全部站点与总浏览量吗？')) return;
    Store.save(function (d) {
      d.sites.forEach(function (s) { s.views = 0; });
      d.stats.totalViews = 0;
    }, 'reset views');
    renderSiteTable();
    toast('浏览量已清空');
  }

  function clearLocal() {
    if (!confirm('清除浏览器本地快照后，将重新读取仓库或内置数据，确定继续？')) return;
    Store.resetLocal();
    Store.init().then(function () { renderAll(); toast('本地快照已清除'); });
  }

  /* ---------- GitHub ---------- */
  function fillGithub() {
    var g = Store.getData().settings.github;
    $('ghOwner').value = g.owner || '';
    $('ghRepo').value = g.repo || '';
    $('ghBranch').value = g.branch || 'main';
    $('ghPath').value = g.path || 'data/sites.json';
    $('ghToken').value = g.token || '';
  }

  function saveGithub() {
    Store.save(function (d) {
      d.settings.github = {
        owner: $('ghOwner').value.trim(),
        repo: $('ghRepo').value.trim(),
        branch: $('ghBranch').value.trim() || 'main',
        path: $('ghPath').value.trim() || 'data/sites.json',
        token: $('ghToken').value.trim()
      };
    }, 'github config');
    toast('GitHub 配置已保存');
  }

  function ghPush() {
    Store.ghPush('admin manual push').then(function () {
      toast('已推送到 GitHub 仓库');
    }).catch(function (e) { toast('推送失败：' + e.message); });
  }

  function ghPull() {
    Store.ghPull().then(function (remote) {
      Store.importJSON(remote);
      renderAll();
      toast('已从仓库拉取数据');
    }).catch(function (e) { toast('拉取失败：' + e.message); });
  }

  /* ---------- 渲染汇总 ---------- */
  function renderAll() {
    renderSiteTable();
    renderArticleTable();
    fillSettings();
    fillGithub();
  }

  function bind() {
    $('loginBtn').addEventListener('click', doLogin);
    $('loginPwd').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    $('logoutBtn').addEventListener('click', function () {
      sessionStorage.removeItem(AUTH_KEY);
      showView();
    });

    bindTabs();

    $('addSiteBtn').addEventListener('click', function () { openSiteForm(null); });
    $('formSaveBtn').addEventListener('click', saveSiteForm);
    $('checkAllBtn').addEventListener('click', checkAll);

    $('addArticleBtn').addEventListener('click', function () { openArticleForm(null); });
    $('articleSaveBtn').addEventListener('click', saveArticleForm);

    $('saveSettingsBtn').addEventListener('click', saveSettings);
    bindBgUpload();

    $('exportBtn').addEventListener('click', exportData);
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0];
      if (f) importData(f);
      e.target.value = '';
    });
    $('resetViewsBtn').addEventListener('click', resetViews);
    $('clearLocalBtn').addEventListener('click', clearLocal);

    $('ghSaveBtn').addEventListener('click', saveGithub);
    $('ghPushBtn').addEventListener('click', ghPush);
    $('ghPullBtn').addEventListener('click', ghPull);

    // 弹窗关闭
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () { $(btn.dataset.close).classList.remove('open'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.modal-mask'), function (mask) {
      mask.addEventListener('click', function (e) {
        if (e.target === mask) mask.classList.remove('open');
      });
    });
  }

  Store.init().then(function () {
    bind();
    showView();
    if (isAuthed()) renderAll();
  });
})();
