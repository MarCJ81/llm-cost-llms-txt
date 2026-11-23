/* ==========================================================================
   LLM Cost Calculator & llms.txt Generator — UI
   Reads and writes only in this page. No storage, no network.
   ========================================================================== */
(function () {
  'use strict';

  var E = window.LLMEngine;
  if (!E) return;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var state = {
    tab: 'cost',
    workload: Object.assign({}, E.DEFAULT_WORKLOAD),
    tokenMode: 'tokens',
    models: E.defaultModels(),
    budget: 500,
    useBudget: false,
    provider: 'all',
    showLegacy: false,
    sort: 'asc',
    doc: E.preset('saas'),
    mode: 'llms.txt',
    includeBodies: false
  };

  /* ------------------------------------------------------------- utils -- */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var toastTimer = null;
  function toast(message) {
    var node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { node.classList.remove('is-visible'); }, 2600);
  }

  function copyText(text, okMessage) {
    function fallback() {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      area.style.left = '0';
      document.body.appendChild(area);
      area.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (err) { copied = false; }
      document.body.removeChild(area);
      toast(copied ? okMessage : 'Copy was blocked — select the text and copy it manually.');
      return copied;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMessage); }, fallback);
    } else {
      fallback();
    }
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    toast('Downloaded ' + filename);
  }

  /* --------------------------------------------------------------- tabs -- */

  function setTab(name) {
    state.tab = name;
    $$('.tab').forEach(function (tab) {
      var on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    $('#panel-cost').hidden = name !== 'cost';
    $('#panel-llms').hidden = name !== 'llms';
    if (name === 'llms') refreshPreview();
    if (window.location.hash !== '#' + name) {
      try { window.history.replaceState(null, '', '#' + name); } catch (err) { /* file:// */ }
    }
  }

  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { setTab(tab.dataset.tab); });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      var next = tab.dataset.tab === 'cost' ? 'llms' : 'cost';
      setTab(next);
      $('#' + (next === 'cost' ? 'tab-cost' : 'tab-llms')).focus();
    });
  });
  $$('[data-goto]').forEach(function (button) {
    button.addEventListener('click', function () { setTab(button.dataset.goto); });
  });

  /* -------------------------------------------------------------- theme -- */

  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = prefersDark ? 'dark' : 'light';

  function applyTheme(next) {
    theme = next;
    document.documentElement.setAttribute('data-theme', next);
    var button = $('#themeToggle');
    button.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
    button.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  applyTheme(theme);
  $('#themeToggle').addEventListener('click', function () {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  });

  /* ========================================================= COST MODEL == */

  var tokenUnits = { tokens: 'tokens', words: 'words', chars: 'characters' };

  function estimateFor(mode, value) {
    return E.estimateTokens(mode, value);
  }

  /* The inputs may hold tokens, words or characters; every calculation below
     goes through this conversion so the cost maths always sees tokens. */
  function tokenWorkload() {
    return E.normalizeWorkload({
      inputTokens: estimateFor(state.tokenMode, state.workload.inputTokens),
      outputTokens: estimateFor(state.tokenMode, state.workload.outputTokens),
      cachedSharePct: state.workload.cachedSharePct,
      requestsPerDay: state.workload.requestsPerDay,
      daysPerMonth: state.workload.daysPerMonth
    });
  }

  function fromTokens(tokens, mode) {
    if (mode === 'words') return Math.max(0, Math.round(tokens * 0.75));
    if (mode === 'chars') return Math.max(0, Math.round(tokens * 4));
    return Math.max(0, Math.round(tokens));
  }

  function syncWorkloadInputs() {
    var w = {
      inputTokens: Math.max(0, E.num(state.workload.inputTokens, E.DEFAULT_WORKLOAD.inputTokens)),
      outputTokens: Math.max(0, E.num(state.workload.outputTokens, E.DEFAULT_WORKLOAD.outputTokens)),
      cachedSharePct: E.clamp(E.num(state.workload.cachedSharePct, 0), 0, 100),
      requestsPerDay: Math.max(0, E.num(state.workload.requestsPerDay, E.DEFAULT_WORKLOAD.requestsPerDay)),
      daysPerMonth: E.clamp(Math.round(E.num(state.workload.daysPerMonth, E.DEFAULT_WORKLOAD.daysPerMonth)), 1, 31)
    };
    var inTokens = estimateFor(state.tokenMode, w.inputTokens);
    var outTokens = estimateFor(state.tokenMode, w.outputTokens);
    $('#inputTokens').value = E.formatNumber(fromTokens(inTokens, state.tokenMode));
    $('#outputTokens').value = E.formatNumber(fromTokens(outTokens, state.tokenMode));
    $('#cachedShare').value = E.formatNumber(w.cachedSharePct, w.cachedSharePct % 1 ? 1 : 0);
    $('#cachedRange').value = String(Math.round(w.cachedSharePct));
    $('#requestsPerDay').value = E.formatNumber(w.requestsPerDay, w.requestsPerDay % 1 ? 2 : 0);
    $('#daysPerMonth').value = String(w.daysPerMonth);
    $('#budget').value = E.formatNumber(state.budget, state.budget % 1 ? 2 : 0);
    $('#inputUnit').textContent = tokenUnits[state.tokenMode];
    $('#outputUnit').textContent = tokenUnits[state.tokenMode];
    $('#inputTokensHint').textContent = '≈ ' + E.formatNumber(inTokens) + ' tokens per request';
    $('#outputTokensHint').textContent = '≈ ' + E.formatNumber(outTokens) + ' tokens per request';
    $('#budgetField').hidden = !state.useBudget;
    $$('#tokenMode button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.mode === state.tokenMode ? 'true' : 'false');
    });
  }

  $$('#tokenMode button').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = button.dataset.mode;
      if (next === state.tokenMode) return;
      var inTokens = estimateFor(state.tokenMode, state.workload.inputTokens);
      var outTokens = estimateFor(state.tokenMode, state.workload.outputTokens);
      state.tokenMode = next;
      state.workload.inputTokens = fromTokens(inTokens, next);
      state.workload.outputTokens = fromTokens(outTokens, next);
      syncWorkloadInputs();
      renderAll();
    });
  });

  $$('[data-w]').forEach(function (input) {
    input.addEventListener('input', function () {
      var field = input.dataset.w;
      state.workload[field] = input.value;
      if (field === 'cachedSharePct') {
        var pct = E.clamp(E.num(input.value, 0), 0, 100);
        $('#cachedRange').value = String(Math.round(pct));
      }
      refreshCosts();
    });
    input.addEventListener('blur', function () {
      var w = E.normalizeWorkload(state.workload);
      var value = w[input.dataset.w];
      var decimals = value % 1 ? (input.dataset.w === 'cachedSharePct' ? 1 : 2) : 0;
      input.value = E.formatNumber(value, decimals);
    });
  });

  $('#cachedRange').addEventListener('input', function () {
    state.workload.cachedSharePct = Number($('#cachedRange').value);
    $('#cachedShare').value = String(state.workload.cachedSharePct);
    refreshCosts();
  });

  $('#useBudget').addEventListener('change', function () {
    state.useBudget = $('#useBudget').checked;
    $('#budgetField').hidden = !state.useBudget;
    if (state.useBudget && !E.num($('#budget').value, 0)) {
      state.budget = 500;
      $('#budget').value = '500';
    }
    renderAll();
  });

  $('#budget').addEventListener('input', function () {
    state.budget = E.num($('#budget').value, 0);
    refreshCosts();
  });
  $('#budget').addEventListener('blur', function () {
    $('#budget').value = E.formatNumber(state.budget, state.budget % 1 ? 2 : 0);
  });

  $('#resetWorkload').addEventListener('click', function () {
    state.workload = Object.assign({}, E.DEFAULT_WORKLOAD);
    state.tokenMode = 'tokens';
    syncWorkloadInputs();
    renderAll();
    toast('Workload reset to 1,500 in / 400 out, 1,000 requests a day.');
  });

  /* estimator */
  var sample = $('#sampleText');
  function updateEstimate() {
    var stats = E.textStats(sample.value);
    $('#estChars').textContent = E.formatNumber(stats.chars);
    $('#estWords').textContent = E.formatNumber(stats.words);
    $('#estTokens').textContent = E.formatNumber(stats.tokens);
    $('#useEstimate').disabled = stats.tokens === 0;
  }
  sample.addEventListener('input', updateEstimate);

  $('#exactCount').addEventListener('click', function () {
    var btn = $('#exactCount');
    var out = $('#exactValue');
    var text = sample.value;
    if (!text.trim()) { out.textContent = 'Paste some text first.'; return; }
    btn.disabled = true;
    out.textContent = 'Loading tokenizer\u2026';
    E.countExactTokens(text, $('#exactEncoding').value).then(function (res) {
      btn.disabled = false;
      if (res.ok) {
        var delta = res.delta === 0 ? '' : ' (' + (res.delta > 0 ? '+' : '') + res.delta + '% vs ≈)';
        out.textContent = E.formatNumber(res.tokens) + ' tokens · ' + res.encodingLabel + delta;
        out.dataset.exact = String(res.tokens);
      } else {
        out.textContent = 'Could not load the tokenizer — showing the ≈ estimate.';
      }
    });
  });

  $('#exactPreview').addEventListener('click', function () {
    var btn = $('#exactPreview');
    var text = E.generateLlmsTxt(state.doc, { mode: state.mode, includeBodies: state.includeBodies });
    if (!text) return;
    btn.disabled = true;
    btn.textContent = 'Counting…';
    E.countExactTokens(text, 'o200k').then(function (res) {
      btn.disabled = false;
      btn.textContent = 'Count exactly';
      var stats = E.textStats(text.replace(/\n$/, ''));
      $('#previewStats').textContent = stats.lines + (stats.lines === 1 ? ' line' : ' lines') +
        ' · ' + E.formatNumber(stats.chars) + ' chars · ≈' + E.formatNumber(stats.tokens) + ' tokens' +
        (res.ok ? ' · exact ' + E.formatNumber(res.tokens) + ' (o200k)' : '');
      toast(res.ok ? 'Exact count: ' + E.formatNumber(res.tokens) + ' tokens (o200k_base)' : 'Tokenizer could not load');
    });
  });

  $('#useEstimate').addEventListener('click', function () {
    var tokens = E.textStats(sample.value).tokens;
    if (!tokens) return;
    state.workload.inputTokens = fromTokens(tokens, state.tokenMode);
    syncWorkloadInputs();
    renderAll();
    toast('Input set to ≈' + E.formatNumber(tokens) + ' tokens.');
  });

  /* ------------------------------------------------------------ results -- */

  function filteredModels() {
    return state.models.filter(function (model) {
      if (!state.showLegacy && model.status === 'legacy') return false;
      if (state.provider !== 'all' && model.provider !== state.provider) return false;
      return true;
    });
  }

  function tableRows() {
    var rows = E.compare(filteredModels(), tokenWorkload());
    if (state.sort === 'desc') rows.reverse();
    return rows;
  }

  function extremes(rows) {
    var cheapest = null;
    var priciest = null;
    rows.forEach(function (row) {
      if (!cheapest || row.cost.perMonth < cheapest.cost.perMonth) cheapest = row;
      if (!priciest || row.cost.perMonth > priciest.cost.perMonth) priciest = row;
    });
    return { cheapest: cheapest, priciest: priciest };
  }

  function priceValue(value) {
    return E.plainNumber(value, 6);
  }

  function rowHTML(row) {
    var model = row.model;
    var flags = '';
    if (model.custom) flags += '<span class="badge badge-custom">custom</span>';
    else if (model.status === 'legacy') flags += '<span class="badge badge-legacy">legacy</span>';
    var note = model.note ? ' · ' + model.note : '';
    var budgetCell = state.useBudget
      ? '<td class="num" data-cell="budget:' + esc(model.id) + '">' + budgetCellText(model) + '</td>'
      : '';
    return '<tr data-row="' + esc(model.id) + '">' +
      '<td class="model-cell"><span class="model-name">' + esc(model.name) + flags + '</span>' +
      '<span class="model-meta">' + esc(model.provider + note) + '</span></td>' +
      '<td class="num"><input type="text" inputmode="decimal" data-price="input" data-model="' + esc(model.id) + '" value="' + priceValue(model.input) + '" aria-label="' + esc(model.name) + ' input price per million tokens"></td>' +
      '<td class="num"><input type="text" inputmode="decimal" data-price="cached" data-model="' + esc(model.id) + '" value="' + priceValue(model.cached) + '" aria-label="' + esc(model.name) + ' cached input price per million tokens"></td>' +
      '<td class="num"><input type="text" inputmode="decimal" data-price="output" data-model="' + esc(model.id) + '" value="' + priceValue(model.output) + '" aria-label="' + esc(model.name) + ' output price per million tokens"></td>' +
      '<td class="num" data-cell="request:' + esc(model.id) + '">' + E.money(row.cost.perRequest) + '</td>' +
      '<td class="num strong" data-cell="month:' + esc(model.id) + '">' + E.money(row.cost.perMonth) + '</td>' +
      '<td class="num" data-cell="year:' + esc(model.id) + '">' + E.money(row.cost.perYear) + '</td>' +
      budgetCell +
      '</tr>';
  }

  function budgetCellText(model) {
    var plan = E.budgetPlan(model, tokenWorkload(), state.budget);
    if (plan.unlimited) return '∞';
    return E.formatNumber(plan.requestsPerMonth);
  }

  function renderTable() {
    var rows = tableRows();
    var body = $('#tableBody');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="' + (state.useBudget ? 8 : 7) + '" class="empty-row">No models match this filter. Add a custom model or switch the provider.</td></tr>';
    } else {
      body.innerHTML = rows.map(rowHTML).join('');
    }
    $$('.budget-col').forEach(function (cell) { cell.hidden = !state.useBudget; });
    updateTableFoot(rows);
  }

  function updateTableFoot(rows) {
    var w = tokenWorkload();
    var parts = [
      E.formatNumber(rows.length) + (rows.length === 1 ? ' model' : ' models'),
      E.formatNumber(w.requestsPerDay * w.daysPerMonth) + ' requests/month',
      'prices checked ' + E.PRICE_UPDATED
    ];
    if (!state.showLegacy) parts.push('legacy models hidden');
    if (state.sort === 'desc') parts.push('priciest first');
    $('#tableFoot').textContent = parts.join(' · ');
  }

  function chartRows() {
    return E.compare(filteredModels(), tokenWorkload());
  }

  function renderChart() {
    var rows = chartRows();
    var ext = extremes(rows);
    var max = rows.length ? rows[rows.length - 1].cost.perMonth : 0;
    var marker = '';
    if (state.useBudget && state.budget > 0 && max > 0 && state.budget < max) {
      marker = '<span class="budget-marker" style="left:' + (E.clamp(state.budget / max, 0, 1) * 100).toFixed(2) + '%"></span>';
    }
    var html = rows.map(function (row) {
      var isCheap = ext.cheapest && row.model.id === ext.cheapest.model.id;
      var isPricey = ext.priciest && row.model.id === ext.priciest.model.id;
      var width = max > 0 ? Math.max(row.cost.perMonth / max * 100, 0.6) : 0;
      var tip = row.model.name + ': ' + E.money(row.cost.perMonth) + ' per month, ' +
        E.money(row.cost.perRequest) + ' per request';
      return '<div class="chart-row' + (isCheap ? ' is-cheapest' : '') + (isPricey && !isCheap ? ' is-pricey' : '') + '" title="' + esc(tip) + '">' +
        '<span class="chart-label">' + esc(row.model.name) + '</span>' +
        '<span class="chart-track"><span class="chart-fill" style="width:' + width.toFixed(2) + '%"></span>' + marker + '</span>' +
        '<span class="chart-value">' + E.money(row.cost.perMonth) + '</span>' +
        '</div>';
    }).join('');
    $('#chart').innerHTML = html || '<p class="chart-note">No models to chart.</p>';

    var note = [];
    if (rows.length) {
      var wl = tokenWorkload();
      note.push('Monthly cost includes ' + E.formatNumber(wl.requestsPerDay * wl.daysPerMonth) + ' requests.');
    }
    if (state.useBudget && state.budget > 0) {
      note.push('Dashed line: your ' + E.money(state.budget) + ' budget.');
      if (max <= state.budget) note.push('Every model here fits inside it.');
    }
    if (!state.showLegacy) note.push('Legacy models are hidden — tick “Show legacy models” to compare them.');
    $('#chartNote').textContent = note.join(' ');
  }

  function renderStats() {
    var rows = chartRows();
    var ext = extremes(rows);
    var w = tokenWorkload();
    if (!rows.length) {
      $('#statCheapMonth').textContent = '—';
      $('#statCheapName').textContent = 'No models in this filter';
      $('#statPriceyMonth').textContent = '—';
      $('#statPriceyName').textContent = '';
      $('#statSavingMonth').textContent = '—';
      $('#statSavingFoot').textContent = '';
    } else {
      var saving = E.savings(rows);
      $('#statCheapMonth').innerHTML = E.money(ext.cheapest.cost.perMonth) + '<small> /mo</small>';
      $('#statCheapName').textContent = ext.cheapest.model.name + ' · ' + E.money(ext.cheapest.cost.perYear) + '/year';
      $('#statPriceyMonth').innerHTML = E.money(ext.priciest.cost.perMonth) + '<small> /mo</small>';
      if (saving) {
        var factor = saving.factor === Infinity ? '∞' : E.formatNumber(saving.factor, saving.factor >= 10 ? 0 : 1);
        $('#statPriceyName').textContent = ext.priciest.model.name + ' · ' + factor + '× the cheapest';
        $('#statSavingMonth').innerHTML = E.money(saving.perMonth) + '<small> /mo</small>';
        $('#statSavingFoot').textContent = E.formatNumber(saving.percent, 0) + '% less · ' + E.money(saving.perYear) + '/year';
      } else {
        $('#statPriceyName').textContent = ext.priciest.model.name;
        $('#statSavingMonth').textContent = '—';
        $('#statSavingFoot').textContent = 'Add a second model to compare';
      }
    }

    if (state.useBudget) {
      var plan = ext.cheapest ? E.budgetPlan(ext.cheapest.model, tokenWorkload(), state.budget) : null;
      $('#statLastLabel').textContent = 'Your budget buys';
      if (plan && !plan.unlimited) {
        $('#statLastValue').innerHTML = E.formatNumber(plan.requestsPerMonth) + '<small> req/mo</small>';
        $('#statLastFoot').textContent = '≈ ' + E.formatNumber(plan.requestsPerDay, 0) + ' a day on ' + ext.cheapest.model.name;
      } else if (plan && plan.unlimited) {
        $('#statLastValue').textContent = '∞';
        $('#statLastFoot').textContent = 'This model costs nothing at these prices';
      } else {
        $('#statLastValue').textContent = '—';
        $('#statLastFoot').textContent = '';
      }
    } else {
      $('#statLastLabel').textContent = 'Requests per month';
      $('#statLastValue').innerHTML = E.formatNumber(w.requestsPerDay * w.daysPerMonth) + '<small> calls</small>';
      $('#statLastFoot').textContent = E.formatNumber(w.requestsPerDay) + '/day × ' + w.daysPerMonth + ' days';
    }
  }

  function renderAll() {
    renderTable();
    renderChart();
    renderStats();
    refreshBudgetHeaders();
  }

  function refreshCosts() {
    var rows = tableRows();
    rows.forEach(function (row) {
      var id = row.model.id;
      var cells = {};
      cells['request:' + id] = E.money(row.cost.perRequest);
      cells['month:' + id] = E.money(row.cost.perMonth);
      cells['year:' + id] = E.money(row.cost.perYear);
      Object.keys(cells).forEach(function (key) {
        var cell = document.querySelector('[data-cell="' + key + '"]');
        if (cell) cell.textContent = cells[key];
      });
      if (state.useBudget) {
        var budgetCell = document.querySelector('[data-cell="budget:' + id + '"]');
        if (budgetCell) budgetCell.textContent = budgetCellText(row.model);
      }
    });
    renderChart();
    renderStats();
  }

  function refreshBudgetHeaders() {
    $('#thBudget').hidden = !state.useBudget;
  }

  /* price editing inside the table */
  var tableBody = $('#tableBody');
  tableBody.addEventListener('input', function (event) {
    var input = event.target;
    if (!input.dataset || !input.dataset.price) return;
    var model = state.models.filter(function (m) { return m.id === input.dataset.model; })[0];
    if (!model) return;
    var value = E.num(input.value, null);
    var valid = value !== null && value >= 0;
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (!valid) return;
    model[input.dataset.price] = value;
    refreshCosts();
  });
  tableBody.addEventListener('change', function (event) {
    var input = event.target;
    if (!input.dataset || !input.dataset.price) return;
    var model = state.models.filter(function (m) { return m.id === input.dataset.model; })[0];
    if (!model) return;
    if (E.num(input.value, null) === null) {
      input.value = priceValue(model[input.dataset.price]);
      input.setAttribute('aria-invalid', 'false');
    }
    renderTable();
    renderChart();
    renderStats();
  });

  /* filters */
  $$('#providerFilter .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.provider = chip.dataset.provider;
      $$('#providerFilter .chip').forEach(function (other) {
        var on = other === chip;
        other.classList.toggle('is-active', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderAll();
    });
  });

  $('#showLegacy').addEventListener('change', function () {
    state.showLegacy = $('#showLegacy').checked;
    renderAll();
  });

  $('#sortToggle').addEventListener('click', function () {
    state.sort = state.sort === 'asc' ? 'desc' : 'asc';
    $('#sortToggle').textContent = state.sort === 'asc' ? 'Sort: cheapest' : 'Sort: priciest';
    renderAll();
  });

  $('#resetPrices').addEventListener('click', function () {
    state.models = E.defaultModels();
    state.provider = 'all';
    $$('#providerFilter .chip').forEach(function (chip) {
      var on = chip.dataset.provider === 'all';
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderAll();
    toast('Prices restored to the published list prices.');
  });

  /* custom model */
  $('#addModelBtn').addEventListener('click', function () {
    var form = $('#modelForm');
    var open = form.hidden;
    form.hidden = !open;
    $('#addModelBtn').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) $('#newName').focus();
  });
  $('#cancelModel').addEventListener('click', function () {
    $('#modelForm').hidden = true;
    $('#addModelBtn').setAttribute('aria-expanded', 'false');
  });
  $('#saveModel').addEventListener('click', function () {
    var name = $('#newName').value.trim();
    var input = E.num($('#newInput').value, null);
    var cached = E.num($('#newCached').value, null);
    var output = E.num($('#newOutput').value, null);
    if (!name) { toast('Give the model a name first.'); $('#newName').focus(); return; }
    if (input === null || output === null) { toast('Input and output prices are required.'); return; }
    if (cached === null) cached = input;
    if (input < 0 || cached < 0 || output < 0) { toast('Prices cannot be negative.'); return; }
    var model = {
      id: 'custom-' + Date.now().toString(36),
      provider: 'Custom',
      name: name,
      input: input,
      cached: cached,
      output: output,
      status: 'current',
      custom: true,
      note: 'Your own price'
    };
    state.models.push(model);
    state.provider = 'all';
    $$('#providerFilter .chip').forEach(function (chip) {
      var on = chip.dataset.provider === 'all';
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    ['#newName', '#newInput', '#newCached', '#newOutput'].forEach(function (sel) { $(sel).value = ''; });
    $('#modelForm').hidden = true;
    $('#addModelBtn').setAttribute('aria-expanded', 'false');
    renderAll();
    toast(name + ' added at $' + priceValue(input) + ' in / $' + priceValue(output) + ' out per 1M tokens.');
  });

  /* exports */
  function exportRows() {
    return E.compare(filteredModels(), tokenWorkload());
  }
  $('#copyCsv').addEventListener('click', function () {
    var rows = exportRows();
    copyText(E.buildCSV(rows, tokenWorkload()), 'Copied ' + rows.length + ' rows as CSV.');
  });
  $('#downloadCsv').addEventListener('click', function () {
    download('llm-cost-comparison.csv', E.buildCSV(exportRows(), tokenWorkload()), 'text/csv;charset=utf-8');
  });
  $('#copyMd').addEventListener('click', function () {
    var rows = exportRows();
    copyText(E.buildMarkdown(rows, tokenWorkload()), 'Copied the Markdown table (' + rows.length + ' rows).');
  });
  $('#downloadMd').addEventListener('click', function () {
    download('llm-cost-comparison.md', E.buildMarkdown(exportRows(), tokenWorkload()), 'text/markdown;charset=utf-8');
  });

  /* ========================================================== LLMS.TXT == */

  function renderSections() {
    var last = state.doc.sections.length - 1;
    $('#sectionsList').innerHTML = state.doc.sections.map(function (section, si) {
      var links = section.links.map(function (link, li) {
        return '<div class="link-row" data-link="' + li + '">' +
          '<input type="text" data-lfield="name" data-path="sections.' + si + '.links.' + li + '.name" value="' + esc(link.name) + '" placeholder="Page title" aria-label="Section ' + (si + 1) + ' link ' + (li + 1) + ' title">' +
          '<input type="text" data-lfield="url" data-path="sections.' + si + '.links.' + li + '.url" inputmode="url" value="' + esc(link.url) + '" placeholder="https://example.com/page.md" aria-label="Section ' + (si + 1) + ' link ' + (li + 1) + ' URL">' +
          '<input type="text" data-lfield="desc" data-path="sections.' + si + '.links.' + li + '.desc" value="' + esc(link.desc) + '" placeholder="One-line note" aria-label="Section ' + (si + 1) + ' link ' + (li + 1) + ' note">' +
          '<label class="opt-check' + (link.optional ? ' on' : '') + '" title="Optional link — an agent may skip it">' +
          '<input type="checkbox" data-lfield="optional"' + (link.optional ? ' checked' : '') + ' aria-label="Section ' + (si + 1) + ' link ' + (li + 1) + ' is optional">' +
          '<span class="opt-mark" aria-hidden="true">✓</span><span aria-hidden="true">Optional</span></label>' +
          '<button type="button" class="remove-link" data-remove-link aria-label="Remove section ' + (si + 1) + ' link ' + (li + 1) + '">✕</button>' +
          '</div>';
      }).join('');

      return '<div class="section-card" data-index="' + si + '">' +
        '<div class="section-head">' +
        '<input type="text" data-sfield="name" data-path="sections.' + si + '.name" value="' + esc(section.name) + '" placeholder="Section name (Documentation, Pricing…)" aria-label="Section ' + (si + 1) + ' name" maxlength="80">' +
        '<div class="section-tools">' +
        '<button type="button" data-move="-1" aria-label="Move section ' + (si + 1) + ' up"' + (si === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" data-move="1" aria-label="Move section ' + (si + 1) + ' down"' + (si === last ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" data-remove-section aria-label="Remove section ' + (si + 1) + '">✕</button>' +
        '</div></div>' +
        '<div class="links">' + links + '</div>' +
        '<button type="button" class="add-link" data-add-link>+ Add link</button>' +
        '<details class="body-details"' + (section.body ? ' open' : '') + '>' +
        '<summary>Markdown body for llms-full.txt</summary>' +
        '<textarea data-sfield="body" data-path="sections.' + si + '.body" rows="3" placeholder="Optional Markdown carried into llms-full.txt">' + esc(section.body) + '</textarea>' +
        '</details></div>';
    }).join('');
  }

  function renderDocForm() {
    $('#docTitle').value = state.doc.title;
    $('#docSummary').value = state.doc.summary;
    $('#docDetails').value = state.doc.details;
    renderSections();
  }

  function renderValidation(result, specText) {
    var box = $('#validation');
    var items = [];
    var specNote = specText === undefined ? '' : specCheckHtml(specText);
    if (result.errors.length) {
      box.className = 'validation is-error';
      items.push('<strong>' + result.errors.length + (result.errors.length === 1 ? ' issue' : ' issues') + ' to fix</strong>');
      items.push('<ul>' + result.errors.slice(0, 5).map(function (item) {
        return '<li>' + esc(item.message) + '</li>';
      }).join('') + '</ul>');
      if (result.errors.length > 5) items.push('<span class="v-note">and ' + (result.errors.length - 5) + ' more</span>');
    } else if (result.warnings.length) {
      box.className = 'validation is-warn';
      items.push('<strong>Ready, with ' + result.warnings.length + (result.warnings.length === 1 ? ' note' : ' notes') + '</strong>');
      items.push('<ul>' + result.warnings.slice(0, 4).map(function (item) {
        return '<li>' + esc(item.message) + '</li>';
      }).join('') + '</ul>');
      if (result.warnings.length > 4) items.push('<span class="v-note">and ' + (result.warnings.length - 4) + ' more</span>');
    } else {
      box.className = 'validation is-ok';
      items.push('<strong>Ready to publish.</strong> The file passes every structural check.');
    }
    box.innerHTML = items.join('') + specNote;
  }

  /* 생성된 본문을 스펙으로 다시 읽어 확인한 결과(엔진 검사와 별개) */
  function specCheckHtml(text) {
    var spec = E.validateSpecText(text);
    if (!spec.stats.lines) return '';
    var cls = spec.ok ? (spec.warnings.length ? 'v-spec is-warn' : 'v-spec is-ok') : 'v-spec is-error';
    var label = spec.ok
      ? (spec.warnings.length ? 'Spec re-read: ' + spec.warnings.length + ' note(s)' : 'Spec re-read: valid llms.txt')
      : 'Spec re-read: ' + spec.errors.length + ' problem(s)';
    return '<div class="' + cls + '">' + label +
      ' · ' + spec.stats.sections + ' section(s) · ' + spec.stats.links + ' link(s)</div>';
  }

  function markInvalid(result) {
    $$('[data-path]').forEach(function (field) {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
    });
    result.errors.forEach(function (item) {
      var field = document.querySelector('[data-path="' + item.field + '"]');
      if (field) {
        field.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
      }
    });
  }

  function refreshPreview() {
    var text = E.generateLlmsTxt(state.doc, { mode: state.mode, includeBodies: state.includeBodies });
    $('#preview').textContent = text;
    var stats = E.textStats(text.replace(/\n$/, ''));
    $('#previewStats').textContent = stats.lines + (stats.lines === 1 ? ' line' : ' lines') +
      ' · ' + E.formatNumber(stats.chars) + ' chars · ≈' + E.formatNumber(stats.tokens) + ' tokens';
    var result = E.validateDoc(state.doc);
    renderValidation(result, text);
    markInvalid(result);
    $('#copyDoc').disabled = !text;
    $('#downloadDoc').disabled = !text;
    $('#fileName').textContent = state.mode;
    $$('#fileMode button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.mode === state.mode ? 'true' : 'false');
    });
    $('#includeBodies').checked = state.includeBodies || state.mode === 'llms-full.txt';
    $('#includeBodies').disabled = state.mode === 'llms-full.txt';
  }

  /* document text fields */
  [['#docTitle', 'title'], ['#docSummary', 'summary'], ['#docDetails', 'details']].forEach(function (pair) {
    $(pair[0]).addEventListener('input', function () {
      state.doc[pair[1]] = $(pair[0]).value;
      refreshPreview();
    });
  });

  /* sections: typing, structural buttons */
  var sectionsList = $('#sectionsList');
  sectionsList.addEventListener('input', function (event) {
    var target = event.target;
    var card = target.closest('.section-card');
    if (!card) return;
    var si = Number(card.dataset.index);
    if (target.dataset.sfield) {
      state.doc.sections[si][target.dataset.sfield] = target.value;
      refreshPreview();
      return;
    }
    if (target.dataset.lfield) {
      var row = target.closest('.link-row');
      var li = Number(row.dataset.link);
      var field = target.dataset.lfield;
      var value = field === 'optional' ? target.checked : target.value;
      state.doc.sections[si].links[li][field] = value;
      if (field === 'optional') {
        row.querySelector('.opt-check').classList.toggle('on', target.checked);
      }
      refreshPreview();
    }
  });

  sectionsList.addEventListener('click', function (event) {
    var card = event.target.closest('.section-card');
    if (!card) return;
    var si = Number(card.dataset.index);

    if (event.target.closest('[data-add-link]')) {
      state.doc = E.addLink(state.doc, si);
      renderSections();
      refreshPreview();
      var fresh = sectionsList.querySelector('.section-card[data-index="' + si + '"] .link-row:last-child input');
      if (fresh) fresh.focus();
      return;
    }
    if (event.target.closest('[data-remove-link]')) {
      var row = event.target.closest('.link-row');
      state.doc = E.removeLink(state.doc, si, Number(row.dataset.link));
      renderSections();
      refreshPreview();
      return;
    }
    if (event.target.closest('[data-remove-section]')) {
      state.doc = E.removeSection(state.doc, si);
      renderSections();
      refreshPreview();
      return;
    }
    var move = event.target.closest('[data-move]');
    if (move) {
      state.doc = E.moveSection(state.doc, si, Number(move.dataset.move));
      renderSections();
      refreshPreview();
    }
  });

  $('#addSection').addEventListener('click', function () {
    state.doc = E.addSection(state.doc);
    renderSections();
    refreshPreview();
    var cards = sectionsList.querySelectorAll('.section-card');
    var lastCard = cards[cards.length - 1];
    if (lastCard) lastCard.querySelector('input').focus();
  });

  $$('#presets .preset').forEach(function (button) {
    button.addEventListener('click', function () {
      state.doc = E.preset(button.dataset.preset);
      renderDocForm();
      refreshPreview();
      toast(button.querySelector('strong').textContent + ' example loaded — replace the example.com URLs.');
    });
  });

  $('#clearDoc').addEventListener('click', function () {
    state.doc = E.blankDoc();
    renderDocForm();
    refreshPreview();
    $('#docTitle').focus();
    toast('Cleared. Start with the site name.');
  });

  $$('#fileMode button').forEach(function (button) {
    button.addEventListener('click', function () {
      state.mode = button.dataset.mode;
      refreshPreview();
    });
  });

  $('#includeBodies').addEventListener('change', function () {
    state.includeBodies = $('#includeBodies').checked;
    refreshPreview();
  });

  $('#copyDoc').addEventListener('click', function () {
    var text = E.generateLlmsTxt(state.doc, { mode: state.mode, includeBodies: state.includeBodies });
    if (!text) { toast('Nothing to copy yet — add a name and a summary.'); return; }
    copyText(text, state.mode + ' copied to the clipboard.');
  });

  $('#downloadDoc').addEventListener('click', function () {
    var text = E.generateLlmsTxt(state.doc, { mode: state.mode, includeBodies: state.includeBodies });
    if (!text) { toast('Nothing to download yet — add a name and a summary.'); return; }
    download(state.mode, text, 'text/plain;charset=utf-8');
  });

  /* ------------------------------------------------------------------ init */

  syncWorkloadInputs();
  renderAll();
  updateEstimate();
  renderDocForm();
  refreshPreview();
  setTab(window.location.hash === '#llms' ? 'llms' : 'cost');
})();
