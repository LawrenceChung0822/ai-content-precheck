/**
 * UI state for the precheck demo. Layer 1 runs PrecheckRules for real;
 * Layers 2/3 read pre-set results via PrecheckMockReview (SIMULATED).
 */
(function () {
  'use strict';

  var I18N = {
    en: {
      tagline: 'Three-layer review funnel: deterministic rules → LLM semantic review → human arbitration.',
      samples: 'Samples',
      listNote: 'All 10 samples and product strings are invented. No company-internal information.',
      entries: 'String batch',
      layer1: 'Deterministic rules',
      layer1Meta: 'Runs live in your browser — zero tokens, milliseconds.',
      layer2: 'LLM semantic review',
      layer2Meta: 'Pre-set result — this demo never calls a real model.',
      layer3: 'Human arbitration',
      layer3Meta: 'Only escalates when Layer 2 is unsure or policy demands a human.',
      gate: 'Delivery gate',
      gatePh: 'Warning samples may pass, but only with a recorded reason…',
      gateBtn: 'Approve for delivery',
      verdict: { pass: 'PASS', warning: 'WARNING', error: 'ERROR', n_a: 'N/A' },
      category: { error: 'Layer-1 error', warning: 'Layer-1 warning', semantic: 'Caught by Layer 2', arbitration: 'Human arbitration' },
      gateError: 'Errors block delivery. Fix the strings in the source package and re-run precheck.',
      gateWarning: 'Warnings can pass — record why before approving.',
      gatePass: 'No findings: this batch would ship.',
      gateOk: 'Recorded: approved with reason. In production this is written to the audit log.',
      noIssues: 'No findings.',
      escalated: 'Escalated to human review.',
      notSent: 'Not sent to Layer 2 (by design).',
      decision: { accept_with_action: 'Accept + follow-up action', accept: 'Accept', reject: 'Reject' },
      lang: '中文'
    },
    zh: {
      tagline: '三层审核漏斗：程序化规则 → LLM 语义审核 → 人工仲裁。',
      samples: '样例',
      listNote: '10 条样例与产品字符串全部虚构，不含任何公司内部信息。',
      entries: '字符串批次',
      layer1: '程序化规则',
      layer1Meta: '在你的浏览器里真实运行 — 零 Token，毫秒级。',
      layer2: 'LLM 语义审核',
      layer2Meta: '预置结果 — 本 demo 不会调用真实模型。',
      layer3: '人工仲裁',
      layer3Meta: '仅在 Layer 2 拿不准或策略要求人工时升级。',
      gate: '交付门禁',
      gatePh: 'Warning 级样例可放行，但必须填写原因…',
      gateBtn: '批准交付',
      verdict: { pass: '通过', warning: '警告', error: '错误', n_a: '不适用' },
      category: { error: 'Layer 1 错误', warning: 'Layer 1 警告', semantic: 'Layer 2 捕获', arbitration: '人工仲裁' },
      gateError: 'Error 阻断交付。请在源包中修复字符串后重跑预审。',
      gateWarning: 'Warning 可放行 — 批准前请填写原因。',
      gatePass: '无发现：该批次可直接交付。',
      gateOk: '已记录：带原因放行。生产环境中会写入审计日志。',
      noIssues: '无发现。',
      escalated: '已升级人工复核。',
      notSent: '按设计不送 Layer 2。',
      decision: { accept_with_action: '接受 + 跟进行动', accept: '接受', reject: '驳回' },
      lang: 'EN'
    }
  };

  var lang = 'en';
  var samples = [];
  var current = null;

  function t(path) {
    var parts = path.split('.'), o = I18N[lang];
    for (var i = 0; i < parts.length; i++) o = o[parts[i]];
    return o === undefined ? path : o;
  }

  function verdictBadge(el, verdict) {
    el.textContent = t('verdict.' + (verdict === 'n/a' ? 'n_a' : verdict));
    el.className = 'verdict verdict-' + (verdict === 'n/a' ? 'na' : verdict);
  }

  function liFinding(f) {
    var li = document.createElement('li');
    li.className = 'finding finding-' + f.severity;
    var head = document.createElement('div');
    head.className = 'finding-head';
    var sev = document.createElement('span');
    sev.className = 'sev';
    sev.textContent = (f.ruleId ? f.ruleId + ' · ' : '') + f.severity.toUpperCase();
    var keys = document.createElement('span');
    keys.className = 'finding-keys';
    keys.textContent = (f.keys || []).join(', ');
    head.appendChild(sev);
    head.appendChild(keys);
    li.appendChild(head);
    var msg = document.createElement('p');
    msg.textContent = f['message_' + lang] || f.message_en || f.message_zh || '';
    li.appendChild(msg);
    return li;
  }

  function renderList() {
    var nav = document.getElementById('sample-list');
    nav.innerHTML = '';
    samples.forEach(function (s) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-item' + (current && current.id === s.id ? ' active' : '');
      btn.innerHTML = '<span class="sample-id">' + s.id + '</span><span class="sample-name"></span><span class="sample-cat sample-cat-' + s.category + '"></span>';
      btn.querySelector('.sample-name').textContent = s['title_' + lang];
      btn.querySelector('.sample-cat').textContent = t('category.' + s.category);
      btn.addEventListener('click', function () { select(s); });
      nav.appendChild(btn);
    });
  }

  function renderGate(l1) {
    var hint = document.getElementById('gate-hint');
    var reason = document.getElementById('gate-reason');
    var btn = document.getElementById('gate-submit');
    var fb = document.getElementById('gate-feedback');
    fb.textContent = '';
    reason.style.display = 'none';
    reason.value = '';

    if (l1.verdict === 'error') {
      hint.textContent = t('gateError');
      hint.className = 'gate-hint gate-hint-error';
      btn.disabled = true;
    } else if (l1.verdict === 'warning') {
      hint.textContent = t('gateWarning');
      hint.className = 'gate-hint gate-hint-warning';
      reason.style.display = 'block';
      btn.disabled = true;
      reason.oninput = function () { btn.disabled = reason.value.trim().length < 4; };
    } else {
      hint.textContent = t('gatePass');
      hint.className = 'gate-hint gate-hint-pass';
      btn.disabled = false;
    }
    btn.onclick = function () {
      fb.textContent = t('gateOk');
      fb.className = 'gate-feedback gate-feedback-ok';
    };
  }

  function select(s) {
    current = s;
    renderList();

    document.getElementById('sample-title').textContent = s['title_' + lang];
    var cat = document.getElementById('sample-category');
    cat.textContent = t('category.' + s.category);
    cat.className = 'badge sample-cat-' + s.category;
    document.getElementById('sample-scenario').textContent = s['scenario_' + lang];

    var tbody = document.getElementById('entries-body');
    tbody.innerHTML = '';
    s.entries.forEach(function (e) {
      var tr = document.createElement('tr');
      [e.key, e.source, e.target || ''].forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = v;
        if (v === '') td.classList.add('cell-empty');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Layer 1 — real
    var l1 = window.PrecheckRules.run(s.entries);
    verdictBadge(document.getElementById('layer1-verdict'), l1.verdict);
    var ul1 = document.getElementById('layer1-findings');
    ul1.innerHTML = '';
    if (l1.findings.length) {
      l1.findings.forEach(function (f) { ul1.appendChild(liFinding(f)); });
    } else {
      var li = document.createElement('li');
      li.className = 'finding finding-pass';
      li.textContent = t('noIssues');
      ul1.appendChild(li);
    }

    // Layer 2 — simulated
    var l2 = window.PrecheckMockReview.reviewSemantic(s);
    verdictBadge(document.getElementById('layer2-verdict'), l2.verdict);
    var ul2 = document.getElementById('layer2-findings');
    ul2.innerHTML = '';
    if (l1.verdict === 'error' && (!l2.issues || !l2.issues.length)) {
      var skip = document.createElement('li');
      skip.className = 'finding finding-skip';
      skip.textContent = t('notSent') + (lang === 'zh' ? (l2.note_zh ? ' ' + l2.note_zh : '') : (l2.note_en ? ' ' + l2.note_en : ''));
      ul2.appendChild(skip);
    } else if (l2.issues && l2.issues.length) {
      l2.issues.forEach(function (f) { ul2.appendChild(liFinding(f)); });
      if (l2.note_zh || l2.note_en) {
        var note = document.createElement('li');
        note.className = 'finding finding-note';
        note.textContent = (l2['note_' + lang] || l2.note_en || '');
        ul2.appendChild(note);
      }
    } else {
      var ok = document.createElement('li');
      ok.className = 'finding finding-pass';
      ok.textContent = (l2['note_' + lang] || t('noIssues'));
      ul2.appendChild(ok);
    }

    // Layer 3 — simulated, only when mockLayer3 exists
    var l3 = window.PrecheckMockReview.arbitrate(s);
    var l3c = document.getElementById('layer3-content');
    verdictBadge(document.getElementById('layer3-verdict'), l3 ? l3.decision : 'n/a');
    l3c.innerHTML = '';
    if (l3) {
      var box = document.createElement('div');
      box.className = 'finding finding-arbitration';
      var dec = document.createElement('div');
      dec.className = 'finding-head';
      var sev2 = document.createElement('span');
      sev2.className = 'sev';
      sev2.textContent = t('decision.' + l3.decision) || l3.decision;
      dec.appendChild(sev2);
      box.appendChild(dec);
      var p = document.createElement('p');
      p.textContent = l3['reason_' + lang] || l3.reason_en || '';
      box.appendChild(p);
      l3c.appendChild(box);
    } else {
      var none = document.createElement('p');
      none.className = 'finding finding-pass finding-inline';
      none.textContent = t('escalated') === '' ? '' : (lang === 'zh' ? '本样例未升级人工。' : 'Not escalated to a human in this sample.');
      l3c.appendChild(none);
    }

    renderGate(l1);
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }

  function initLangBtn() {
    var btn = document.getElementById('lang-toggle');
    btn.addEventListener('click', function () {
      lang = lang === 'en' ? 'zh' : 'en';
      btn.textContent = t('lang');
      applyI18n();
      renderList();
      if (current) select(current);
    });
  }

  fetch('data/samples.json')
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (data) {
      samples = data.samples || [];
      applyI18n();
      initLangBtn();
      if (samples.length) select(samples[0]);
    })
    .catch(function (err) {
      document.getElementById('detail').innerHTML =
        '<p class="load-error">Failed to load data/samples.json (' + err.message + '). ' +
        'This demo needs to be served over HTTP (e.g. GitHub Pages or a local static server), not opened as a file:// URL.</p>';
    });
})();
