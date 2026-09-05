import pkg from '../package.json';
import { loadTrips, saveTrips, uid, todayISO } from './storage.js';
import { viewOverview, viewItinerary, viewPacking, viewBudget, viewNotes, viewMap, tabLabels, KNOWN_PLACES } from './views.js';

const autoDetectPlace = (text) => {
  if (!text) return '';
  for (const known of Object.keys(KNOWN_PLACES)) {
    if (text.includes(known)) return known;
  }
  return '';
};

const APP_VERSION = pkg.version;

const escape = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const CATEGORIES = ['餐飲', '交通', '住宿', '門票', '購物', '其他'];
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  trips: [],
  activeId: null,
  tab: 'overview',
};

const persist = () => saveTrips(state.trips);

const findTrip = (id) => state.trips.find((t) => t.id === id);

const updateTrip = (id, patch) => {
  const t = findTrip(id);
  if (!t) return;
  Object.assign(t, patch);
  persist();
};

const toast = (msg) => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
};

// Build a trip object from arbitrary imported data
const buildTripFromImport = (data) => ({
  id: uid(),
  name: (data.name || '匯入的行程').slice(0, 80),
  destination: data.destination || '',
  start: data.start || todayISO(),
  end: data.end || data.start || todayISO(),
  notes: data.notes || '',
  freeNotes: data.freeNotes || '',
  budgetTotal: data.budgetTotal ?? '',
  itinerary: (data.itinerary || []).map((it) => {
    const text = it.text || '';
    const explicitPlace = (it.place || '').trim();
    const place = explicitPlace || autoDetectPlace(text);
    return {
      id: uid(),
      dayIndex: Number.isFinite(Number(it.dayIndex)) ? Number(it.dayIndex) : 0,
      time: it.time || '',
      text,
      place,
    };
  }),
  packing: (data.packing || []).map((p) => ({
    id: uid(),
    text: p.text || '',
    done: false,
  })),
  budget: (data.budget || []).map((b) => ({
    id: uid(),
    name: b.name || '',
    amount: b.amount ?? '',
    date: b.date || todayISO(),
    category: b.category || '其他',
  })),
  createdAt: new Date().toISOString(),
});

const importTrip = (data) => {
  const trip = buildTripFromImport(data);
  state.trips.unshift(trip);
  state.activeId = trip.id;
  state.tab = 'overview';
  persist();
  return trip;
};

// Decode a base64url-encoded JSON payload from the URL hash
const tryHashImport = () => {
  const hash = window.location.hash || '';
  const m = hash.match(/^#import=(.+)$/);
  if (!m) return false;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const decoded = atob(padded);
    const json = decodeURIComponent(escape(decoded));
    const data = JSON.parse(json);
    importTrip(data);
    history.replaceState(null, '', window.location.pathname + window.location.search);
    toast('已從連結匯入行程');
    return true;
  } catch (err) {
    console.warn('Hash import failed', err);
    toast('匯入失敗：連結格式不對');
    return false;
  }
};

const initTripMap = () => {
  if (typeof L === 'undefined') return;
  const container = document.getElementById('trip-map');
  if (!container || container._leaflet_id) return;
  let markers;
  try { markers = JSON.parse(container.dataset.markers || '[]'); }
  catch (e) { markers = []; }
  const mapped = markers.filter((m) => Array.isArray(m.coords));
  const map = L.map(container, { scrollWheelZoom: false }).setView([35.17, 136.91], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);
  if (mapped.length === 0) return;
  const bounds = [];
  mapped.forEach((m) => {
    const marker = L.marker(m.coords).addTo(map);
    const popup = `
      <div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.5">
        <strong>#${m.idx} ${escape(m.text || m.place)}</strong><br/>
        <span style="color:#666">Day ${m.day} · ${escape(m.time || '')}</span><br/>
        <a href="${escape(m.mapsUrl)}" target="_blank" rel="noopener noreferrer">在 Google Maps 開 →</a>
      </div>`;
    marker.bindPopup(popup);
    bounds.push(m.coords);
  });
  if (bounds.length >= 2) map.fitBounds(bounds, { padding: [40, 40] });
  else if (bounds.length === 1) map.setView(bounds[0], 14);
};

const render = () => {
  const root = $('#app');
  root.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand"><span class="brand-dot"></span>旅遊規劃</div>
      </div>
      <div class="trip-list" id="trip-list"></div>
      <div class="sidebar-footer">
        <span>${state.trips.length} 個行程</span>
        <span class="app-version" title="版本">v${APP_VERSION}</span>
      </div>
    </aside>
    <main class="main" id="main"></main>
  `;

  renderTripList();
  renderMain();
  bindGlobal();
  if (state.tab === 'map') {
    setTimeout(initTripMap, 0);
  }
};

const renderTripList = () => {
  const list = $('#trip-list');
  if (!list) return;
  if (state.trips.length === 0) {
    list.innerHTML = `<div class="empty-state">沒有行程</div>`;
    return;
  }
  list.innerHTML = state.trips.map((t) => `
    <div class="trip-item ${t.id === state.activeId ? 'active' : ''}" data-trip-id="${escape(t.id)}">
      <div class="trip-name">${escape(t.name || '未命名')}</div>
      <div class="trip-meta">${escape(t.destination || '—')} · ${escape(t.start || '?')} → ${escape(t.end || '?')}</div>
      <div class="trip-actions"></div>
    </div>
  `).join('');
};

const renderMain = () => {
  const main = $('#main');
  if (!main) return;
  const t = findTrip(state.activeId);
  if (!t) {
    main.innerHTML = `
      <div class="main-empty">
        <h2 style="margin:0 0 8px">選一個行程</h2>
        <p style="margin:0;font-size:14px">從左邊挑，或建一個新的。</p>
        <p class="app-version" style="margin-top:14px;font-size:12px;color:var(--text-3)">v${APP_VERSION}</p>
      </div>`;
    return;
  }
  const tabContent = {
    overview: viewOverview(t),
    itinerary: viewItinerary(t),
    map: viewMap(t),
    packing: viewPacking(t),
    budget: viewBudget(t),
    notes: viewNotes(t),
  }[state.tab] || '';

  main.innerHTML = `
    <div class="trip-header">
      <div>
        <p class="trip-subtitle">${escape(t.destination || '')} · ${escape(t.start || '')} → ${escape(t.end || '')}</p>
      </div>
    </div>
    <nav class="tabs" id="tabs">
      ${tabLabels.map((tab) => `
        <button class="tab ${tab.id === state.tab ? 'active' : ''}" data-tab="${tab.id}">${tab.label}</button>
      `).join('')}
    </nav>
    ${tabContent}
  `;
  bindMain();
};

const bindGlobal = () => {
  $('#export-all')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.trips, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-planner-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已匯出 JSON');
  });

  $('#import-trip')?.addEventListener('click', () => {
    const json = prompt('貼上行程 JSON（單一 trip 物件）：');
    if (!json) return;
    try {
      const data = JSON.parse(json);
      importTrip(data);
      render();
      toast('已匯入行程');
    } catch (err) {
      toast('匯入失敗：JSON 格式不對');
    }
  });

  $$('.trip-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-delete], [data-rename]')) return;
      state.activeId = el.dataset.tripId;
      state.tab = 'overview';
      render();
    });
  });

  $$('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.delete;
      const t = findTrip(id);
      if (!t) return;
      if (!confirm(`刪除「${t.name || '未命名'}」？此動作無法復原。`)) return;
      state.trips = state.trips.filter((x) => x.id !== id);
      if (state.activeId === id) state.activeId = state.trips[0]?.id || null;
      persist();
      render();
      toast('已刪除');
    });
  });
};

const bindMain = () => {
  const t = findTrip(state.activeId);
  if (!t) return;

  $$('#tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab;
      render();
    });
  });

  // Overview edits
  $$('[data-edit]').forEach((el) => {
    el.addEventListener('change', () => {
      const key = el.dataset.edit;
      t[key] = el.value;
      persist();
      if (key === 'name' || key === 'destination' || key === 'start' || key === 'end') {
        renderTripList();
        $('.trip-title') && ($('.trip-title').textContent = t.name || '未命名');
      }
    });
  });

  // Notes edit
  $$('[data-edit="freeNotes"]').forEach((el) => {
    el.addEventListener('input', () => { t.freeNotes = el.value; persist(); });
  });

  // Itinerary
  $$('[data-add-itinerary]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dayIndex = Number(btn.dataset.addItinerary);
      t.itinerary = t.itinerary || [];
      const text = '';
      t.itinerary.push({ id: uid(), dayIndex, time: '', text, place: autoDetectPlace(text) });
      persist(); render();
    });
  });
  $$('[data-itinerary-time], [data-itinerary-text], [data-itinerary-place]').forEach((el) => {
    el.addEventListener('change', () => {
      let id, field;
      if (el.dataset.itineraryTime) { id = el.dataset.itineraryTime; field = 'time'; }
      else if (el.dataset.itineraryText) { id = el.dataset.itineraryText; field = 'text'; }
      else if (el.dataset.itineraryPlace) { id = el.dataset.itineraryPlace; field = 'place'; }
      const item = (t.itinerary || []).find((x) => x.id === id);
      if (item) { item[field] = el.value; persist(); if (field === 'place') render(); }
    });
  });
  $$('[data-del-itinerary]').forEach((btn) => {
    btn.addEventListener('click', () => {
      t.itinerary = (t.itinerary || []).filter((x) => x.id !== btn.dataset.delItinerary);
      persist(); render();
    });
  });

  // Packing
  $$('[data-add-packing]').forEach((btn) => {
    btn.addEventListener('click', () => {
      t.packing = t.packing || [];
      const text = prompt('要帶什麼？') || '';
      if (!text.trim()) return;
      t.packing.push({ id: uid(), text: text.trim(), done: false });
      persist(); render();
    });
  });
  $$('[data-packing-toggle]').forEach((el) => {
    el.addEventListener('change', () => {
      const item = (t.packing || []).find((x) => x.id === el.dataset.packingToggle);
      if (item) { item.done = el.checked; persist(); render(); }
    });
  });
  $$('[data-packing-text]').forEach((el) => {
    el.addEventListener('change', () => {
      const item = (t.packing || []).find((x) => x.id === el.dataset.packingText);
      if (item) { item.text = el.value; persist(); }
    });
  });
  $$('[data-del-packing]').forEach((btn) => {
    btn.addEventListener('click', () => {
      t.packing = (t.packing || []).filter((x) => x.id !== btn.dataset.delPacking);
      persist(); render();
    });
  });

  // Budget
  const totalEl = $('[data-edit-budget-total]');
  if (totalEl) {
    totalEl.addEventListener('change', () => {
      t.budgetTotal = totalEl.value;
      persist(); render();
    });
  }

  $$('[data-add-budget]').forEach((btn) => {
    btn.addEventListener('click', () => {
      t.budget = t.budget || [];
      t.budget.push({
        id: uid(),
        name: '',
        amount: '',
        date: todayISO(),
        category: '其他',
      });
      persist(); render();
    });
  });
  $$('[data-budget-name], [data-budget-amount], [data-budget-date]').forEach((el) => {
    el.addEventListener('change', () => {
      const id = el.dataset.budgetName || el.dataset.budgetAmount || el.dataset.budgetDate;
      const field = el.dataset.budgetName ? 'name' : el.dataset.budgetAmount ? 'amount' : 'date';
      const item = (t.budget || []).find((x) => x.id === id);
      if (item) { item[field] = el.value; persist(); if (field === 'amount') render(); }
    });
  });
  $$('[data-budget-cat]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.budgetCat;
      const item = (t.budget || []).find((x) => x.id === id);
      if (!item) return;
      const idx = CATEGORIES.indexOf(item.category);
      item.category = CATEGORIES[(idx + 1) % CATEGORIES.length];
      persist(); render();
    });
  });
  $$('[data-del-budget]').forEach((btn) => {
    btn.addEventListener('click', () => {
      t.budget = (t.budget || []).filter((x) => x.id !== btn.dataset.delBudget);
      persist(); render();
    });
  });
};

const SEED_DONE_KEY = 'travel-planner:seeded:v1';

const seedDemoTrip = async () => {
  if (localStorage.getItem(SEED_DONE_KEY)) return;
  try {
    const res = await fetch('./nagoya.json');
    if (!res.ok) return;
    const data = await res.json();
    importTrip(data);
    localStorage.setItem(SEED_DONE_KEY, '1');
  } catch (err) {
    console.warn('Seed fetch failed', err);
  }
};

const init = async () => {
  state.trips = loadTrips();
  tryHashImport();
  await seedDemoTrip();
  if (state.trips.length > 0 && !state.activeId) {
    state.activeId = state.trips[0].id;
    state.tab = 'overview';
  }
  render();
};

init();
