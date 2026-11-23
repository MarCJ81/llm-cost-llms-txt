/* ==========================================================================
   Engine — LLM token pricing, cost maths and llms.txt generation.

   No DOM, no network, no dependencies. Runs in the browser (window.LLMEngine)
   and in Node (module.exports), so test.js exercises the exact code the page
   runs.

   Units
     - Prices are USD per 1,000,000 tokens, as published by the provider.
     - Workload tokens are whole tokens per request.
     - Percentage inputs (cached share) are 0–100, not 0–1.
     - Costs are returned in USD as plain numbers.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LLMEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var PRICE_UPDATED = '2026-11-20';

  var PRICE_SOURCES = [
    {
      provider: 'OpenAI',
      label: 'OpenAI API pricing',
      url: 'https://developers.openai.com/api/docs/pricing',
      scope: 'Standard tier, short context'
    },
    {
      provider: 'Anthropic',
      label: 'Claude API pricing',
      url: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
      scope: 'Standard tier, base input and output; cache hits'
    },
    {
      provider: 'Google',
      label: 'Gemini Developer API pricing',
      url: 'https://ai.google.dev/gemini-api/docs/pricing',
      scope: 'Paid tier, standard'
    },
    {
      provider: 'DeepSeek',
      label: 'DeepSeek Models & Pricing',
      url: 'https://api-docs.deepseek.com/quick_start/pricing',
      scope: 'Peak rate per 1M tokens (off-peak is 50%)'
    }
  ];

  /* Published list prices, USD per 1M tokens.
     input / cached / output — cached is the discounted price for a cache hit.
     status "current" = on the provider's public price sheet on PRICE_UPDATED.
     status "legacy"  = last published list price; the model is retired from the
                        current sheet but stays here for historical comparison. */
  var MODELS = [
    /* ---- OpenAI ------------------------------------------------------- */
    { id: 'gpt-6.2-sol', provider: 'OpenAI', name: 'GPT-6.2 Sol', input: 2.00, cached: 0.10, output: 10.00, status: 'current', note: 'Current flagship; long context costs 2×' },
    { id: 'gpt-6.2-astra', provider: 'OpenAI', name: 'GPT-6.2 Astra', input: 8.00, cached: 0.40, output: 40.00, status: 'current', note: 'Highest-capability tier' },
    { id: 'gpt-6-luna', provider: 'OpenAI', name: 'GPT-6 Luna', input: 0.10, cached: 0.01, output: 0.50, status: 'current', note: 'Lowest-cost GPT-6 tier' },
    { id: 'gpt-5.6-terra', provider: 'OpenAI', name: 'GPT-5.6 Terra', input: 2.00, cached: 0.20, output: 12.00, status: 'current', note: 'Previous generation, mid tier' },
    { id: 'gpt-4.1', provider: 'OpenAI', name: 'GPT-4.1', input: 2.00, cached: 0.50, output: 8.00, status: 'current', note: 'Long-standing workhorse' },
    { id: 'gpt-4o', provider: 'OpenAI', name: 'GPT-4o', input: 2.50, cached: 1.25, output: 10.00, status: 'current', note: 'Cached input is half price' },
    { id: 'gpt-4o-mini', provider: 'OpenAI', name: 'GPT-4o mini', input: 0.15, cached: 0.075, output: 0.60, status: 'current', note: 'Small, cheap general model' },
    { id: 'o3', provider: 'OpenAI', name: 'o3', input: 2.00, cached: 0.50, output: 8.00, status: 'current', note: 'Reasoning model, non-pro' },

    /* ---- Anthropic ---------------------------------------------------- */
    { id: 'claude-sonnet-5-5', provider: 'Anthropic', name: 'Claude Sonnet 5.5', input: 2.00, cached: 0.10, output: 10.00, status: 'current', note: 'Cache hits from 0.05× input' },
    { id: 'claude-opus-5-5', provider: 'Anthropic', name: 'Claude Opus 5.5', input: 4.00, cached: 0.20, output: 20.00, status: 'current', note: 'Cache hits from 0.05× input' },
    { id: 'claude-haiku-5-5', provider: 'Anthropic', name: 'Claude Haiku 5.5', input: 0.10, cached: 0.01, output: 0.50, status: 'current', note: 'Prompts up to 100K tokens' },
    { id: 'claude-sonnet-4-6', provider: 'Anthropic', name: 'Claude Sonnet 4.6', input: 3.00, cached: 0.30, output: 15.00, status: 'current', note: 'Previous generation, standard rate' },

    /* ---- Google ------------------------------------------------------- */
    { id: 'gemini-4-carbon', provider: 'Google', name: 'Gemini 4 Carbon', input: 2.00, cached: 0.10, output: 10.00, status: 'current', note: 'Launch price until Nov 30, 2026; $4/$20 after' },
    { id: 'gemini-4-neon', provider: 'Google', name: 'Gemini 4 Neon', input: 3.00, cached: 0.15, output: 15.00, status: 'current', note: 'Frontier knowledge work' },
    { id: 'gemini-4-hydrogen', provider: 'Google', name: 'Gemini 4 Hydrogen', input: 1.50, cached: 0.075, output: 7.50, status: 'current', note: 'Everyday agentic and coding work' },
    { id: 'gemini-3.8-flash', provider: 'Google', name: 'Gemini 3.8 Flash', input: 0.75, cached: 0.075, output: 3.75, status: 'current', note: 'Price doubles on Jan 1, 2027' },
    { id: 'gemini-3.5-flash-lite', provider: 'Google', name: 'Gemini 3.5 Flash-Lite', input: 0.30, cached: 0.03, output: 2.50, status: 'current', note: 'High-volume, simple tasks' },

    /* ---- DeepSeek ----------------------------------------------------- */
    { id: 'deepseek-flash', provider: 'DeepSeek', name: 'DeepSeek V4.1 Flash', input: 0.30, cached: 0.006, output: 1.20, status: 'current', note: 'Peak rate; off-peak is half' },
    { id: 'deepseek-v4-pro', provider: 'DeepSeek', name: 'DeepSeek V4 Pro', input: 1.32, cached: 0.044, output: 3.96, status: 'current', note: 'Peak rate; off-peak is half' },

    /* ---- Legacy line-up (last published list prices) ------------------ */
    { id: 'o1', provider: 'OpenAI', name: 'o1', input: 15.00, cached: 7.50, output: 60.00, status: 'legacy', note: 'Legacy list price' },
    { id: 'o3-mini', provider: 'OpenAI', name: 'o3-mini', input: 1.10, cached: 0.55, output: 4.40, status: 'legacy', note: 'Legacy list price' },
    { id: 'claude-3-7-sonnet', provider: 'Anthropic', name: 'Claude 3.7 Sonnet', input: 3.00, cached: 0.30, output: 15.00, status: 'legacy', note: 'Legacy list price' },
    { id: 'claude-3-5-haiku', provider: 'Anthropic', name: 'Claude 3.5 Haiku', input: 0.80, cached: 0.08, output: 4.00, status: 'legacy', note: 'Legacy list price' },
    { id: 'gemini-2.5-pro', provider: 'Google', name: 'Gemini 2.5 Pro', input: 1.25, cached: 0.31, output: 10.00, status: 'legacy', note: 'Legacy price, prompts up to 200K tokens' },
    { id: 'gemini-2.5-flash', provider: 'Google', name: 'Gemini 2.5 Flash', input: 0.30, cached: 0.075, output: 2.50, status: 'legacy', note: 'Legacy list price' },
    { id: 'gemini-2.0-flash', provider: 'Google', name: 'Gemini 2.0 Flash', input: 0.10, cached: 0.025, output: 0.40, status: 'legacy', note: 'Legacy list price' },
    { id: 'deepseek-chat', provider: 'DeepSeek', name: 'DeepSeek V3 (chat)', input: 0.27, cached: 0.07, output: 1.10, status: 'legacy', note: 'Legacy list price' },
    { id: 'deepseek-reasoner', provider: 'DeepSeek', name: 'DeepSeek R1 (reasoner)', input: 0.55, cached: 0.14, output: 2.19, status: 'legacy', note: 'Legacy list price' }
  ];

  var PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Custom'];

  var DEFAULT_WORKLOAD = {
    inputTokens: 1500,
    outputTokens: 400,
    cachedSharePct: 0,
    requestsPerDay: 1000,
    daysPerMonth: 30
  };

  var CHARS_PER_TOKEN = 4;
  var WORDS_PER_TOKEN = 0.75;

  /* ------------------------------------------------------------ helpers -- */

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function str(value) {
    return value == null ? '' : String(value);
  }

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  /* Reads a user-typed number: "1,200", "$2.50", " 400 ", "15%".
     Returns `fallback` when nothing numeric is left. */
  function num(value, fallback) {
    if (typeof value === 'number') return isFinite(value) ? value : fallback;
    var text = str(value).replace(/[,\s$€£₩%]/g, '');
    if (text === '' || text === '-' || text === '.' || text === '-.') return fallback;
    if (!/^-?\d*\.?\d+$/.test(text) && !/^-?\d+\.?\d*$/.test(text)) return fallback;
    var parsed = Number(text);
    return isFinite(parsed) ? parsed : fallback;
  }

  function defaultModels() {
    return clone(MODELS);
  }

  function getModel(id, models) {
    var list = models || MODELS;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function todayISO(now) {
    var d = now instanceof Date ? now : new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }

  /* ------------------------------------------------------ token counting -- */

  function countWords(text) {
    var t = str(text).trim();
    return t === '' ? 0 : t.split(/\s+/).length;
  }

  function countLines(text) {
    var t = str(text);
    return t === '' ? 0 : t.split(/\r\n|\r|\n/).length;
  }

  function tokensFromChars(chars) {
    var n = num(chars, 0);
    return n > 0 ? Math.ceil(n / CHARS_PER_TOKEN) : 0;
  }

  function tokensFromWords(words) {
    var n = num(words, 0);
    return n > 0 ? Math.ceil(n / WORDS_PER_TOKEN) : 0;
  }

  /* mode: 'tokens' (used as typed) | 'words' | 'chars'. */
  function estimateTokens(mode, value) {
    if (mode === 'chars') return tokensFromChars(value);
    if (mode === 'words') return tokensFromWords(value);
    var n = num(value, 0);
    return n > 0 ? Math.round(n) : 0;
  }

  function textStats(text) {
    var t = str(text).replace(/\r\n/g, '\n');
    var chars = t.length;
    var words = countWords(t);
    var lines = countLines(t);
    return { chars: chars, words: words, lines: lines, tokens: chars > 0 ? Math.ceil(chars / CHARS_PER_TOKEN) : 0 };
  }

  /* ------------------------------------------------ exact token count -- */

  /*
   * 문자/4 근사치는 영어 산문에서만 맞는다. 코드·JSON·한국어는 크게 틀린다.
   * gpt-tokenizer(MIT)의 실제 BPE 병합표를 필요할 때만 받아 정확히 센다.
   *  · o200k_base: GPT-4o · GPT-4.1 · o 시리즈
   *  · cl100k_base: GPT-4 · GPT-3.5 (다른 모델의 근사 기준으로도 쓴다)
   */
  var TOKENIZER_FILES = {
    o200k: { src: 'assets/vendor/gpt-tokenizer-o200k.js', global: 'GPTTokO200K', label: 'o200k_base', bytes: 2816266 },
    cl100k: { src: 'assets/vendor/gpt-tokenizer-cl100k.js', global: 'GPTTokCL100K', label: 'cl100k_base', bytes: 1047230 },
  };
  var tokenizerLoading = {};

  function loadTokenizer(encoding) {
    var enc = TOKENIZER_FILES[encoding] ? encoding : 'o200k';
    var info = TOKENIZER_FILES[enc];
    var root = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : null);
    if (!root) return Promise.reject(new Error('no_global'));
    if (root[info.global]) return Promise.resolve(root[info.global]);
    if (tokenizerLoading[enc]) return tokenizerLoading[enc];
    if (!root.document) return Promise.reject(new Error('no_document'));
    tokenizerLoading[enc] = new Promise(function (resolve, reject) {
      var script = root.document.createElement('script');
      script.src = info.src;
      script.async = true;
      script.onload = function () {
        if (root[info.global]) resolve(root[info.global]);
        else reject(new Error('tokenizer_global_missing'));
      };
      script.onerror = function () { tokenizerLoading[enc] = null; reject(new Error('tokenizer_load_failed')); };
      root.document.head.appendChild(script);
    });
    return tokenizerLoading[enc];
  }

  /** 정확한 토큰 수. 실패하면 근사치를 estimate:true 로 돌려준다(무음 실패 없음). */
  function countExactTokens(text, encoding) {
    var t = str(text);
    var enc = TOKENIZER_FILES[encoding] ? encoding : 'o200k';
    var approx = textStats(t).tokens;
    return loadTokenizer(enc).then(function (api) {
      var n = api.countTokens(t);
      return {
        ok: true, tokens: n, encoding: enc, encodingLabel: TOKENIZER_FILES[enc].label,
        approx: approx, delta: approx ? Math.round(((n - approx) / approx) * 1000) / 10 : 0,
      };
    }).catch(function (err) {
      return { ok: false, tokens: approx, encoding: enc, approx: approx, estimate: true, reason: (err && err.message) || 'unknown' };
    });
  }

  /* ------------------------------------------------- llms.txt spec check -- */

  /**
   * 생성된(또는 붙여넣은) llms.txt 본문을 스펙 기준으로 다시 읽어 검증한다.
   * 형식: 1행 "# 이름" → 2행 "" → 3행 "> 한 줄 요약" → 빈 줄 → "## 섹션" → "- [이름](URL): 설명"
   */
  function validateSpecText(text) {
    var t = str(text).replace(/\r\n/g, '\n');
    var errors = [];
    var warnings = [];
    var lines = t.split('\n');
    var links = 0;
    var sections = 0;

    if (!t.trim()) {
      return { ok: false, errors: [{ line: 0, message: 'File is empty.' }], warnings: [], stats: { lines: 0, sections: 0, links: 0 } };
    }

    var first = -1;
    for (var i = 0; i < lines.length; i += 1) {
      if (lines[i].trim()) { first = i; break; }
    }
    if (first < 0 || !/^#\s+\S/.test(lines[first])) {
      errors.push({ line: first + 1, message: 'The file must start with a single H1: "# Name".' });
    } else if (/^##/.test(lines[first])) {
      errors.push({ line: first + 1, message: 'The first heading is H2; llms.txt starts with one H1.' });
    }

    var quoteAt = -1;
    for (var j = first + 1; j < lines.length; j += 1) {
      if (!lines[j].trim()) continue;
      quoteAt = j;
      break;
    }
    if (quoteAt < 0 || lines[quoteAt].trim().charAt(0) !== '>') {
      errors.push({ line: quoteAt + 1, message: 'A one-line blockquote summary (starting with ">") must come right after the H1.' });
    }

    lines.forEach(function (line, index) {
      var trimmed = line.trim();
      if (!trimmed) return;
      if (/^#{3,6}\s/.test(trimmed)) {
        errors.push({ line: index + 1, message: 'Only H1 and H2 are used in llms.txt; this heading is deeper.' });
      } else if (/^##\s+\S/.test(trimmed)) {
        sections += 1;
      } else if (/^##\s*$/.test(trimmed)) {
        errors.push({ line: index + 1, message: 'Section heading has no name.' });
      } else if (/^[-*]\s+/.test(trimmed)) {
        var m = /^[-*]\s+\[([^\]]+)\]\(([^)]+)\)(\s*[:\u2014-]\s*(.*))?$/.exec(trimmed);
        if (!m) {
          warnings.push({ line: index + 1, message: 'List item is not a markdown link; agents read "- [Name](URL): note".' });
          return;
        }
        links += 1;
        if (!m[1].trim()) errors.push({ line: index + 1, message: 'Link has no name.' });
        if (!/^https?:\/\/\S+$/i.test(m[2].trim())) {
          errors.push({ line: index + 1, message: 'Link URL must be absolute (https://…).' });
        }
      }
    });

    if (!sections) warnings.push({ line: 0, message: 'No "## Section" yet — llms.txt needs somewhere to point.' });
    if (!links) warnings.push({ line: 0, message: 'No links yet — an agent has nothing to fetch.' });
    if (t.length > 50000) warnings.push({ line: 0, message: 'Files over ~50 KB are usually truncated by tooling; split it or use llms-full.txt.' });

    return {
      ok: errors.length === 0,
      errors: errors,
      warnings: warnings,
      stats: { lines: lines.length, sections: sections, links: links, chars: t.length },
    };
  }

  /* ---------------------------------------------------------- workload -- */

  function normalizeWorkload(workload) {
    var w = workload || {};
    return {
      inputTokens: Math.max(0, Math.round(num(w.inputTokens, DEFAULT_WORKLOAD.inputTokens))),
      outputTokens: Math.max(0, Math.round(num(w.outputTokens, DEFAULT_WORKLOAD.outputTokens))),
      cachedSharePct: clamp(num(w.cachedSharePct, DEFAULT_WORKLOAD.cachedSharePct), 0, 100),
      requestsPerDay: Math.max(0, num(w.requestsPerDay, DEFAULT_WORKLOAD.requestsPerDay)),
      daysPerMonth: clamp(Math.round(num(w.daysPerMonth, DEFAULT_WORKLOAD.daysPerMonth)), 1, 31)
    };
  }

  function describeWorkload(workload) {
    var w = normalizeWorkload(workload);
    return formatNumber(w.inputTokens) + ' input tokens + ' + formatNumber(w.outputTokens) +
      ' output tokens per request, ' + formatNumber(w.cachedSharePct, w.cachedSharePct % 1 ? 1 : 0) + '% cached input, ' +
      formatNumber(w.requestsPerDay, w.requestsPerDay % 1 ? 2 : 0) + ' requests/day, ' +
      w.daysPerMonth + ' days/month';
  }

  /* --------------------------------------------------------------- cost -- */

  /* Cost of a single request, split into fresh input, cached input and output. */
  function costParts(model, workload) {
    var w = normalizeWorkload(workload);
    var cachedShare = w.cachedSharePct / 100;
    var freshTokens = w.inputTokens * (1 - cachedShare);
    var cachedTokens = w.inputTokens * cachedShare;
    var inputCost = freshTokens * model.input / 1e6;
    var cachedCost = cachedTokens * model.cached / 1e6;
    var outputCost = w.outputTokens * model.output / 1e6;
    return {
      input: inputCost,
      cached: cachedCost,
      output: outputCost,
      total: inputCost + cachedCost + outputCost,
      freshTokens: freshTokens,
      cachedTokens: cachedTokens
    };
  }

  function costFor(model, workload) {
    var w = normalizeWorkload(workload);
    var parts = costParts(model, w);
    var perDay = parts.total * w.requestsPerDay;
    var perMonth = perDay * w.daysPerMonth;
    return {
      perRequest: parts.total,
      perDay: perDay,
      perMonth: perMonth,
      perYear: perMonth * 12,
      parts: parts,
      workload: w,
      requestsPerMonth: w.requestsPerDay * w.daysPerMonth
    };
  }

  /* Rows sorted cheapest → most expensive by monthly cost, with rank and a
     0–1 share of the most expensive row (used to draw the bar chart). */
  function compare(models, workload) {
    var w = normalizeWorkload(workload);
    var rows = (models || []).map(function (model) {
      return { model: model, cost: costFor(model, w) };
    });
    rows.sort(function (a, b) {
      if (a.cost.perMonth !== b.cost.perMonth) return a.cost.perMonth - b.cost.perMonth;
      return a.model.name < b.model.name ? -1 : a.model.name > b.model.name ? 1 : 0;
    });
    var max = rows.length ? rows[rows.length - 1].cost.perMonth : 0;
    rows.forEach(function (row, index) {
      row.rank = index + 1;
      row.share = max > 0 ? row.cost.perMonth / max : 0;
    });
    return rows;
  }

  function savings(rows) {
    if (!rows || rows.length < 2) return null;
    var cheapest = rows[0];
    var priciest = rows[rows.length - 1];
    var perMonth = priciest.cost.perMonth - cheapest.cost.perMonth;
    var percent = priciest.cost.perMonth > 0 ? (perMonth / priciest.cost.perMonth) * 100 : 0;
    var factor = cheapest.cost.perMonth > 0 ? priciest.cost.perMonth / cheapest.cost.perMonth : Infinity;
    return {
      cheapest: cheapest,
      priciest: priciest,
      perMonth: perMonth,
      perYear: perMonth * 12,
      percent: percent,
      factor: factor
    };
  }

  /* Reverse calculation: how many requests a monthly budget buys. */
  function budgetPlan(model, workload, budgetUSD) {
    var w = normalizeWorkload(workload);
    var cost = costFor(model, w);
    var budget = num(budgetUSD, 0);
    if (!(cost.perRequest > 0)) {
      return {
        perRequest: cost.perRequest,
        budget: budget,
        requestsPerMonth: null,
        requestsPerDay: null,
        spendPerMonth: 0,
        unlimited: true
      };
    }
    var requestsPerMonth = budget > 0 ? Math.floor(budget / cost.perRequest) : 0;
    return {
      perRequest: cost.perRequest,
      budget: budget,
      requestsPerMonth: requestsPerMonth,
      requestsPerDay: requestsPerMonth / w.daysPerMonth,
      spendPerMonth: requestsPerMonth * cost.perRequest,
      unlimited: false
    };
  }

  /* Blended price of 1M tokens at the current input/output mix. */
  function blendedPerMillion(model, workload) {
    var w = normalizeWorkload(workload);
    var total = w.inputTokens + w.outputTokens;
    if (total <= 0) return 0;
    var parts = costParts(model, w);
    return (parts.total / total) * 1e6;
  }

  /* --------------------------------------------------------- formatting -- */

  function group(intPart) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatNumber(value, decimals) {
    var n = num(value, 0);
    if (!isFinite(n)) return '—';
    var dp = decimals == null ? 0 : decimals;
    var negative = n < 0;
    var parts = Math.abs(n).toFixed(dp).split('.');
    var out = group(parts[0]) + (parts.length > 1 ? '.' + parts[1] : '');
    return (negative ? '-' : '') + out;
  }

  function trimToMinTwo(text) {
    var dot = text.indexOf('.');
    if (dot < 0) return text + '.00';
    var frac = text.slice(dot + 1);
    while (frac.length > 2 && frac.charAt(frac.length - 1) === '0') frac = frac.slice(0, -1);
    return text.slice(0, dot + 1) + frac;
  }

  /* $1,234.56 · $0.50 · $0.0115 · $0.00035 — sub-dollar values keep the
     precision a per-request cost needs (trailing zeros are trimmed). */
  function money(value) {
    var n = num(value, null);
    if (n == null || !isFinite(n)) return '—';
    var negative = n < 0;
    var abs = Math.abs(n);
    var dp = abs === 0 ? 2 : abs < 0.01 ? 5 : abs < 1 ? 4 : 2;
    return (negative ? '-$' : '$') + trimToMinTwo(formatNumber(abs, dp));
  }

  function percent(value, decimals) {
    var n = num(value, 0);
    return formatNumber(n, decimals == null ? 1 : decimals) + '%';
  }

  function plainNumber(value, decimals) {
    var n = num(value, 0);
    return String(Math.round(n * Math.pow(10, decimals == null ? 6 : decimals)) / Math.pow(10, decimals == null ? 6 : decimals));
  }

  /* -------------------------------------------------- CSV / Markdown out -- */

  function csvCell(value) {
    var s = str(value);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCSV(rows, workload) {
    var w = normalizeWorkload(workload);
    var head = [
      'Model', 'Provider', 'Input (USD/1M)', 'Cached input (USD/1M)', 'Output (USD/1M)',
      'Cost per request (USD)', 'Cost per day (USD)', 'Cost per month (USD)', 'Cost per year (USD)'
    ];
    var lines = [head.map(csvCell).join(',')];
    (rows || []).forEach(function (row) {
      lines.push([
        row.model.name,
        row.model.provider,
        plainNumber(row.model.input),
        plainNumber(row.model.cached),
        plainNumber(row.model.output),
        plainNumber(row.cost.perRequest),
        plainNumber(row.cost.perDay),
        plainNumber(row.cost.perMonth),
        plainNumber(row.cost.perYear)
      ].map(csvCell).join(','));
    });
    lines.push('');
    lines.push(['# Workload', describeWorkload(w)].map(csvCell).join(','));
    lines.push(['# Prices checked', PRICE_UPDATED].map(csvCell).join(','));
    return lines.join('\n') + '\n';
  }

  function buildMarkdown(rows, workload) {
    var w = normalizeWorkload(workload);
    var out = [];
    out.push('# LLM API cost comparison');
    out.push('');
    out.push('_Workload: ' + describeWorkload(w) + '._');
    out.push('_Prices: USD per 1M tokens, list prices checked ' + PRICE_UPDATED + '._');
    out.push('');
    out.push('| Model | Provider | Input | Cached input | Output | Per request | Per day | Per month | Per year |');
    out.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    (rows || []).forEach(function (row) {
      out.push('| ' + row.model.name + ' | ' + row.model.provider +
        ' | ' + money(row.model.input) + ' | ' + money(row.model.cached) + ' | ' + money(row.model.output) +
        ' | ' + money(row.cost.perRequest) + ' | ' + money(row.cost.perDay) +
        ' | ' + money(row.cost.perMonth) + ' | ' + money(row.cost.perYear) + ' |');
    });
    out.push('');
    return out.join('\n');
  }

  /* ------------------------------------------------------------ llms.txt -- */

  function oneLine(value) {
    return str(value).replace(/\s+/g, ' ').trim();
  }

  function cleanLinkText(value) {
    return oneLine(value).replace(/[\[\]]/g, '');
  }

  function blankLink() {
    return { name: '', url: '', desc: '', optional: false };
  }

  function blankSection() {
    return { name: '', body: '', links: [blankLink()] };
  }

  function blankDoc() {
    return { title: '', summary: '', details: '', sections: [blankSection()] };
  }

  function normalizeDoc(doc) {
    var d = doc || {};
    var sections = Array.isArray(d.sections) ? d.sections : [];
    return {
      title: oneLine(d.title),
      summary: oneLine(d.summary),
      details: str(d.details).replace(/\r\n/g, '\n').trim(),
      sections: sections.map(function (section) {
        var s = section || {};
        var links = Array.isArray(s.links) ? s.links : [];
        return {
          name: oneLine(s.name),
          body: str(s.body).replace(/\r\n/g, '\n').trim(),
          links: links.map(function (link) {
            var l = link || {};
            return {
              name: oneLine(l.name),
              url: str(l.url).replace(/\s+/g, ''),
              desc: oneLine(l.desc),
              optional: !!l.optional
            };
          })
        };
      })
    };
  }

  function linkLine(link) {
    return '- [' + cleanLinkText(link.name) + '](' + link.url + ')' + (link.desc ? ': ' + link.desc : '');
  }

  /* Generate llms.txt (mode 'llms.txt') or its expanded sibling
     (mode 'llms-full.txt', where section bodies are always included). */
  function generateLlmsTxt(doc, options) {
    var opts = options || {};
    var full = opts.mode === 'llms-full.txt';
    var includeBodies = full || opts.includeBodies === true;
    var d = normalizeDoc(doc);
    var blocks = [];

    if (d.title) blocks.push('# ' + d.title);
    if (d.summary) blocks.push('> ' + d.summary);
    if (d.details) blocks.push(d.details);

    var optionalLinks = [];
    d.sections.forEach(function (section) {
      var usable = section.links.filter(function (link) { return link.name && link.url; });
      var standard = usable.filter(function (link) { return !link.optional; });
      usable.filter(function (link) { return link.optional; }).forEach(function (link) { optionalLinks.push(link); });

      var body = includeBodies ? section.body : '';
      /* A heading with nothing under it is noise; optional-only sections are
         rendered once at the end, in the single "## Optional" block. */
      if (!standard.length && !body) return;

      if (section.name) blocks.push('## ' + section.name);
      var inner = [];
      if (standard.length) inner.push(standard.map(linkLine).join('\n'));
      if (body) inner.push(body);
      if (inner.length) blocks.push(inner.join('\n\n'));
    });

    if (optionalLinks.length) {
      blocks.push('## Optional');
      blocks.push(optionalLinks.map(linkLine).join('\n'));
    }

    if (!blocks.length) return '';
    return blocks.join('\n\n') + '\n';
  }

  var URL_RE = /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})(?::\d{2,5})?(?:[\/?#][^\s]*)?$/i;

  function isValidUrl(value) {
    var url = str(value).trim();
    if (url === '' || /\s/.test(url)) return false;
    if (!URL_RE.test(url)) return false;
    /* Reject unbalanced parentheses, which would end the markdown link early. */
    var opens = (url.match(/\(/g) || []).length;
    var closes = (url.match(/\)/g) || []).length;
    return opens === closes;
  }

  /* Validation returns { ok, errors, warnings } where each item is
     { field, message } — field uses a dotted path such as "sections.0.links.1.url". */
  function validateDoc(doc) {
    var d = doc || {};
    var errors = [];
    var warnings = [];
    var summary = str(d.summary);
    var title = str(d.title).trim();
    var details = str(d.details);

    if (!title) {
      errors.push({ field: 'title', message: 'Site or project name is required — it becomes the file\'s only H1.' });
    } else if (title.charAt(0) === '#') {
      errors.push({ field: 'title', message: 'Type the name without the leading "#"; the generator adds the heading marker.' });
    } else if (title.length > 120) {
      warnings.push({ field: 'title', message: 'Names longer than 120 characters are hard for an agent to match.' });
    }

    if (!summary.trim()) {
      errors.push({ field: 'summary', message: 'A one-line summary is required — it becomes the blockquote that tells an agent what the site is.' });
    } else {
      if (summary.indexOf('\n') !== -1 || summary.indexOf('\r') !== -1) {
        warnings.push({ field: 'summary', message: 'The summary is a single blockquote line; line breaks are collapsed into spaces.' });
      }
      if (summary.trim().charAt(0) === '>') {
        warnings.push({ field: 'summary', message: 'Do not type the ">" yourself — the generator adds the blockquote marker.' });
      }
      if (summary.trim().length > 400) {
        warnings.push({ field: 'summary', message: 'Summaries over 400 characters are rarely read in full; aim for one sentence.' });
      }
    }

    if (/^#{1,6}\s/m.test(details)) {
      warnings.push({ field: 'details', message: 'Headings in the details block would break the file structure — use bold text or a list instead.' });
    }

    var sections = Array.isArray(d.sections) ? d.sections : [];
    var seenUrls = {};
    var usableLinks = 0;
    var sectionNames = {};

    sections.forEach(function (section, si) {
      var s = section || {};
      var name = str(s.name).trim();
      var links = Array.isArray(s.links) ? s.links : [];
      if (name.charAt(0) === '#') {
        errors.push({ field: 'sections.' + si + '.name', message: 'Section names cannot start with "#".' });
      }
      if (name.length > 80) {
        warnings.push({ field: 'sections.' + si + '.name', message: 'Section names this long are unusual; keep them to a few words.' });
      }
      if (name && sectionNames[name.toLowerCase()]) {
        warnings.push({ field: 'sections.' + si + '.name', message: 'Section "' + name + '" appears more than once.' });
      }
      if (name) sectionNames[name.toLowerCase()] = true;

      if (links.length && !name) {
        errors.push({ field: 'sections.' + si + '.name', message: 'Give this section a heading — its links would otherwise have no place in the file.' });
      }

      links.forEach(function (link, li) {
        var l = link || {};
        var linkName = str(l.name).trim();
        var url = str(l.url).trim();
        var path = 'sections.' + si + '.links.' + li;
        if (!linkName && !url) return; /* empty row in the editor */
        usableLinks += 1;

        if (!linkName) {
          errors.push({ field: path + '.name', message: 'Every link needs a name — it is what the agent reads first.' });
        } else if (/[\[\]]/.test(linkName)) {
          errors.push({ field: path + '.name', message: 'Square brackets in a link name break the markdown link.' });
        }
        if (!url) {
          errors.push({ field: path + '.url', message: 'Add the page URL, or remove this link.' });
        } else if (!isValidUrl(url)) {
          errors.push({ field: path + '.url', message: 'Use an absolute http(s) URL such as https://example.com/docs (no spaces, no relative paths).' });
        } else {
          var key = url.toLowerCase();
          if (seenUrls[key]) {
            warnings.push({ field: path + '.url', message: 'This URL is listed more than once.' });
          }
          seenUrls[key] = true;
        }
        if (str(l.desc).indexOf('\n') !== -1) {
          warnings.push({ field: path + '.desc', message: 'Link notes are a single line; line breaks are collapsed.' });
        }
        if (str(l.desc).length > 200) {
          warnings.push({ field: path + '.desc', message: 'Link notes over 200 characters are usually cut; one clause is enough.' });
        }
      });
    });

    if (usableLinks === 0) {
      warnings.push({ field: 'sections', message: 'No links yet — llms.txt should point an agent at the pages worth fetching.' });
    }
    if (!sections.length) {
      warnings.push({ field: 'sections', message: 'Add at least one section so the file has somewhere to point.' });
    }

    return { ok: errors.length === 0, errors: errors, warnings: warnings };
  }

  /* One-click starting points. Every URL uses example.com on purpose: a preset
     must never claim a real site's pages. */
  var PRESETS = {
    saas: {
      label: 'SaaS / API docs',
      hint: 'Product, docs, pricing, API reference',
      doc: {
        title: 'Acme API',
        summary: 'Acme API turns PDFs, invoices and receipts into structured JSON with a single HTTP request.',
        details: 'Base URL: https://api.example.com/v1\nAuthentication: Bearer token in the `Authorization` header.\nA markdown version of every documentation page is available by appending `.md` to its URL.',
        sections: [
          {
            name: 'Documentation',
            body: '',
            links: [
              { name: 'Quickstart', url: 'https://example.com/docs/quickstart.md', desc: 'Send your first request in five minutes.', optional: false },
              { name: 'API reference', url: 'https://example.com/docs/api.md', desc: 'Every endpoint, parameter and response field.', optional: false },
              { name: 'SDKs', url: 'https://example.com/docs/sdks.md', desc: 'Official Node, Python and Go clients.', optional: false }
            ]
          },
          {
            name: 'Pricing and limits',
            body: '',
            links: [
              { name: 'Pricing', url: 'https://example.com/pricing.md', desc: 'Plans, overage and volume discounts.', optional: false },
              { name: 'Rate limits', url: 'https://example.com/docs/rate-limits.md', desc: 'Per-plan request ceilings and retry guidance.', optional: false }
            ]
          },
          {
            name: 'Guides',
            body: '',
            links: [
              { name: 'Webhooks', url: 'https://example.com/docs/webhooks.md', desc: 'Event types, signatures and retries.', optional: false },
              { name: 'Error handling', url: 'https://example.com/docs/errors.md', desc: 'Error codes and what to do about each.', optional: false }
            ]
          },
          {
            name: 'Optional',
            body: '',
            links: [
              { name: 'Changelog', url: 'https://example.com/changelog.md', desc: 'Release notes, newest first.', optional: true },
              { name: 'Status page', url: 'https://status.example.com/', desc: 'Live availability and incidents.', optional: true }
            ]
          }
        ]
      }
    },
    ecommerce: {
      label: 'E-commerce',
      hint: 'Catalogue, policies, shipping, returns',
      doc: {
        title: 'Northwind Store',
        summary: 'Northwind Store sells workshop tools and fasteners online, shipping across the United States and Canada.',
        details: 'Orders ship within one business day. Prices are in USD and include duties for Canadian orders.',
        sections: [
          {
            name: 'Catalogue',
            body: '',
            links: [
              { name: 'All products', url: 'https://example.com/products.md', desc: 'Full catalogue with SKUs and prices.', optional: false },
              { name: 'Best sellers', url: 'https://example.com/collections/best-sellers.md', desc: 'The 40 items customers reorder most.', optional: false }
            ]
          },
          {
            name: 'Policies',
            body: '',
            links: [
              { name: 'Shipping', url: 'https://example.com/policies/shipping.md', desc: 'Carriers, transit times and free-shipping threshold.', optional: false },
              { name: 'Returns', url: 'https://example.com/policies/returns.md', desc: '30-day returns, exclusions and how to start one.', optional: false },
              { name: 'Warranty', url: 'https://example.com/policies/warranty.md', desc: 'Coverage length by product line.', optional: false }
            ]
          },
          {
            name: 'Support',
            body: '',
            links: [
              { name: 'Contact', url: 'https://example.com/contact.md', desc: 'Email, phone and opening hours.', optional: false },
              { name: 'Order tracking', url: 'https://example.com/tracking.md', desc: 'Where to find a tracking number.', optional: false }
            ]
          },
          {
            name: 'Optional',
            body: '',
            links: [
              { name: 'Gift cards', url: 'https://example.com/gift-cards.md', desc: 'Denominations and redemption rules.', optional: true }
            ]
          }
        ]
      }
    },
    personal: {
      label: 'Personal site',
      hint: 'Writing, projects, CV',
      doc: {
        title: 'Jane Doe — product engineer',
        summary: 'Jane Doe is a product engineer in Rotterdam who writes about developer tools, accessibility and small teams shipping software.',
        details: 'For interviews or speaking requests, write to jane@example.com. A full CV is available as markdown at /cv.md.',
        sections: [
          {
            name: 'Writing',
            body: '',
            links: [
              { name: 'Essays', url: 'https://example.com/writing.md', desc: 'Longer pieces on tooling and team habits.', optional: false },
              { name: 'Notes', url: 'https://example.com/notes.md', desc: 'Short, dated working notes.', optional: false }
            ]
          },
          {
            name: 'Projects',
            body: '',
            links: [
              { name: 'Open-source projects', url: 'https://example.com/projects.md', desc: 'What each project does and its licence.', optional: false },
              { name: 'Talks', url: 'https://example.com/talks.md', desc: 'Conference talks with slides and recordings.', optional: false }
            ]
          },
          {
            name: 'About',
            body: '',
            links: [
              { name: 'CV', url: 'https://example.com/cv.md', desc: 'Roles, dates and education.', optional: false },
              { name: 'Now', url: 'https://example.com/now.md', desc: 'What she is working on this quarter.', optional: true }
            ]
          }
        ]
      }
    },
    opensource: {
      label: 'Open-source project',
      hint: 'Install, API, contributing',
      doc: {
        title: 'tinyparse',
        summary: 'tinyparse is a 12 kB JavaScript library that turns CSV and TSV text into typed rows in the browser and in Node.',
        details: 'Zero dependencies. MIT licensed. Install with `npm install tinyparse`.',
        sections: [
          {
            name: 'Documentation',
            body: '',
            links: [
              { name: 'Install and quickstart', url: 'https://example.com/docs/install.md', desc: 'Install, import and parse your first file.', optional: false },
              { name: 'API reference', url: 'https://example.com/docs/api.md', desc: 'parse, parseStream and their options.', optional: false },
              { name: 'Recipes', url: 'https://example.com/docs/recipes.md', desc: 'Headers, delimiters, encodings and type casting.', optional: false }
            ]
          },
          {
            name: 'Project',
            body: '',
            links: [
              { name: 'Contributing', url: 'https://example.com/CONTRIBUTING.md', desc: 'Setup, test command and review expectations.', optional: false },
              { name: 'Changelog', url: 'https://example.com/CHANGELOG.md', desc: 'Every release, with breaking changes marked.', optional: false },
              { name: 'Licence', url: 'https://example.com/LICENSE.md', desc: 'MIT.', optional: false }
            ]
          },
          {
            name: 'Optional',
            body: '',
            links: [
              { name: 'Benchmarks', url: 'https://example.com/docs/benchmarks.md', desc: 'Throughput against papaparse and csv-parse.', optional: true }
            ]
          }
        ]
      }
    }
  };

  var PRESET_LIST = Object.keys(PRESETS).map(function (key) {
    return { key: key, label: PRESETS[key].label, hint: PRESETS[key].hint };
  });

  function preset(key) {
    var entry = PRESETS[key];
    if (!entry) return blankDoc();
    return normalizeDoc(clone(entry.doc));
  }

  /* doc helpers used by the editor (pure: they return a new doc) */
  function addSection(doc) {
    var d = normalizeDoc(doc);
    d.sections.push(blankSection());
    return d;
  }

  function removeSection(doc, index) {
    var d = normalizeDoc(doc);
    if (index < 0 || index >= d.sections.length) return d;
    d.sections.splice(index, 1);
    if (!d.sections.length) d.sections.push(blankSection());
    return d;
  }

  function moveSection(doc, index, direction) {
    var d = normalizeDoc(doc);
    var target = index + (direction < 0 ? -1 : 1);
    if (index < 0 || index >= d.sections.length || target < 0 || target >= d.sections.length) return d;
    var moved = d.sections.splice(index, 1)[0];
    d.sections.splice(target, 0, moved);
    return d;
  }

  function addLink(doc, sectionIndex) {
    var d = normalizeDoc(doc);
    if (!d.sections[sectionIndex]) return d;
    d.sections[sectionIndex].links.push(blankLink());
    return d;
  }

  function removeLink(doc, sectionIndex, linkIndex) {
    var d = normalizeDoc(doc);
    var section = d.sections[sectionIndex];
    if (!section || linkIndex < 0 || linkIndex >= section.links.length) return d;
    section.links.splice(linkIndex, 1);
    if (!section.links.length) section.links.push(blankLink());
    return d;
  }

  return {
    PRICE_UPDATED: PRICE_UPDATED,
    PRICE_SOURCES: PRICE_SOURCES,
    MODELS: MODELS,
    PROVIDERS: PROVIDERS,
    DEFAULT_WORKLOAD: DEFAULT_WORKLOAD,
    PRESET_LIST: PRESET_LIST,

    num: num,
    clamp: clamp,
    defaultModels: defaultModels,
    getModel: getModel,
    todayISO: todayISO,

    countWords: countWords,
    countLines: countLines,
    tokensFromChars: tokensFromChars,
    tokensFromWords: tokensFromWords,
    estimateTokens: estimateTokens,
    textStats: textStats,

    normalizeWorkload: normalizeWorkload,
    describeWorkload: describeWorkload,
    costParts: costParts,
    costFor: costFor,
    compare: compare,
    savings: savings,
    budgetPlan: budgetPlan,
    blendedPerMillion: blendedPerMillion,

    formatNumber: formatNumber,
    money: money,
    percent: percent,
    plainNumber: plainNumber,
    csvCell: csvCell,
    buildCSV: buildCSV,
    buildMarkdown: buildMarkdown,

    blankLink: blankLink,
    blankSection: blankSection,
    blankDoc: blankDoc,
    normalizeDoc: normalizeDoc,
    generateLlmsTxt: generateLlmsTxt,
    isValidUrl: isValidUrl,
    validateDoc: validateDoc,
    countExactTokens: countExactTokens,
    validateSpecText: validateSpecText,
    preset: preset,
    addSection: addSection,
    removeSection: removeSection,
    moveSection: moveSection,
    addLink: addLink,
    removeLink: removeLink
  };
});
