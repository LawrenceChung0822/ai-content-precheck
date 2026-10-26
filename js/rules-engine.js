/**
 * Layer 1 — Deterministic rules engine (runs for real, in-browser, zero tokens).
 * Pure functions: input entries -> findings. No DOM, no network.
 *
 * Rules:
 *  R-EMPTY       blank / whitespace-only target
 *  R-PLACEHOLDER placeholder set mismatch between source and target
 *  R-DUPKEY      duplicate key within the delivery batch
 *  R-DATE        ambiguous or out-of-spec short dates
 *  R-PUNCT       double spaces / space before !? (style, warning)
 *  R-ELLIPSIS    mixed ellipsis characters (style, warning)
 *  R-LENGTH      target length over UI budget (style, warning, budget-aware)
 */
(function (global) {
  'use strict';

  var PLACEHOLDER_RE = /\{\w+\}|%\d*\$[sd]|%[sd]|\$\{\w+\}/g;

  function placeholders(str) {
    var m = String(str || '').match(PLACEHOLDER_RE) || [];
    return m.sort();
  }

  function samePlaceholders(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  // Short dates like 3/14/26, 5.11.26 — flag if 2-digit year or both parts <= 12 (ambiguous).
  var SHORT_DATE_RE = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})\b/g;

  function findShortDates(str) {
    var out = [], m;
    SHORT_DATE_RE.lastIndex = 0;
    while ((m = SHORT_DATE_RE.exec(String(str || ''))) !== null) {
      var first = parseInt(m[1], 10), second = parseInt(m[2], 10), year = m[3];
      var twoDigitYear = year.length === 2;
      var bothPlausible = first <= 12 && second <= 12;
      if (twoDigitYear || bothPlausible) out.push(m[0]);
    }
    return out;
  }

  function finding(ruleId, severity, keys, zh, en) {
    return { ruleId: ruleId, severity: severity, keys: keys, message_zh: zh, message_en: en };
  }

  function ruleEmpty(entries) {
    var bad = entries.filter(function (e) {
      return !String(e.target || '').trim();
    }).map(function (e) { return e.key; });
    if (!bad.length) return [];
    return [finding('R-EMPTY', 'error', bad,
      '空译文：' + bad.join(', ') + ' 的目标文为空或仅含空白，上线会回退源文或渲染空白。',
      'Empty target: ' + bad.join(', ') + ' is blank/whitespace; production falls back to source or renders empty.')];
  }

  function rulePlaceholder(entries) {
    var out = [];
    entries.forEach(function (e) {
      var s = placeholders(e.source), t = placeholders(e.target);
      if (!samePlaceholders(s, t)) {
        out.push(finding('R-PLACEHOLDER', 'error', [e.key],
          '占位符不一致：源文 [' + (s.join(' ') || '无') + '] vs 目标文 [' + (t.join(' ') || '无') + ']，运行时会暴露字面量或崩溃。',
          'Placeholder mismatch: source [' + (s.join(' ') || 'none') + '] vs target [' + (t.join(' ') || 'none') + ']; runtime shows literals or crashes.'));
      }
    });
    return out;
  }

  function ruleDupKey(entries) {
    var seen = {}, dups = [];
    entries.forEach(function (e) {
      if (seen[e.key]) {
        if (dups.indexOf(e.key) === -1) dups.push(e.key);
      } else {
        seen[e.key] = true;
      }
    });
    if (!dups.length) return [];
    return [finding('R-DUPKEY', 'error', dups,
      '重复 Key：' + dups.join(', ') + ' 在本批次出现多次，生效值取决于文件顺序，属于合并事故。',
      'Duplicate key: ' + dups.join(', ') + ' appears multiple times; the winner depends on file order — a merge accident.')];
  }

  function ruleDate(entries) {
    var out = [];
    entries.forEach(function (e) {
      var hits = findShortDates(e.target);
      if (hits.length) {
        out.push(finding('R-DATE', 'error', [e.key],
          '歧义短日期：' + hits.join(', ') + ' 使用 M/D/Y 短格式，DD/MM 市场会读反；请改为带月份名或 ISO 格式。',
          'Ambiguous short date: ' + hits.join(', ') + ' uses M/D/Y; DD/MM markets misread it. Use month names or ISO.'));
      }
    });
    return out;
  }

  function rulePunct(entries) {
    var out = [];
    entries.forEach(function (e) {
      var t = String(e.target || '');
      if (!t.trim()) return; // empty targets are R-EMPTY's job
      if (/\s{2,}/.test(t)) {
        out.push(finding('R-PUNCT', 'warning', [e.key],
          '双空格：目标文含连续空格，请压缩为单空格。',
          'Double space: target contains consecutive spaces; collapse to one.'));
      }
      if (/[^\s]\s[!?]/.test(t)) {
        out.push(finding('R-PUNCT', 'warning', [e.key],
          '标点前空格：!? 前有空格，与跨语言风格规范不一致。',
          'Space before punctuation: !? preceded by a space, off style guide.'));
      }
    });
    return out;
  }

  function ruleEllipsis(entries) {
    var out = [];
    entries.forEach(function (e) {
      var t = String(e.target || '');
      var hasDots = /\.{3}/.test(t);
      var hasHoriz = /…/.test(t);
      if (hasDots && hasHoriz) {
        out.push(finding('R-ELLIPSIS', 'warning', [e.key],
          '省略号混用：同一字符串同时出现 "..." 与 "…"，请统一为 U+2026。',
          'Mixed ellipsis: both "..." and "…" in one string; unify to U+2026.'));
      } else if (hasDots) {
        out.push(finding('R-ELLIPSIS', 'warning', [e.key],
          '省略号风格：使用了三个句点，规范要求单一省略符 U+2026。',
          'Ellipsis style: three dots used; spec requires U+2026.'));
      }
    });
    return out;
  }

  function ruleLength(entries) {
    var out = [];
    entries.forEach(function (e) {
      if (e.budget && String(e.target || '').length > e.budget) {
        var over = Math.round((String(e.target).length / e.budget - 1) * 100);
        out.push(finding('R-LENGTH', 'warning', [e.key],
          '长度超限：目标文 ' + String(e.target).length + ' 字符，超出 UI 预算 ' + e.budget + ' 约 ' + over + '%，可能截断或挤压控件。',
          'Length overflow: target is ' + String(e.target).length + ' chars, ~' + over + '% over the UI budget of ' + e.budget + '; may truncate or crowd controls.'));
      }
    });
    return out;
  }

  function runRules(entries) {
    var findings = []
      .concat(ruleEmpty(entries))
      .concat(rulePlaceholder(entries))
      .concat(ruleDupKey(entries))
      .concat(ruleDate(entries))
      .concat(rulePunct(entries))
      .concat(ruleEllipsis(entries))
      .concat(ruleLength(entries));

    var verdict = 'pass';
    findings.forEach(function (f) {
      if (f.severity === 'error') verdict = 'error';
      else if (verdict !== 'error') verdict = 'warning';
    });
    return { findings: findings, verdict: verdict };
  }

  global.PrecheckRules = { run: runRules, version: '1.0.0' };
})(typeof window !== 'undefined' ? window : this);
