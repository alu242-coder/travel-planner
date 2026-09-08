import { fmtCurrency, fmtDate, addDays, daysBetween } from './storage.js';

const escape = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const viewOverview = (trip, onUpdate) => {
  const days = daysBetween(trip.start, trip.end);
  return `
    <section class="section">
      <div class="card">
        <h3>基本資料</h3>
        <div class="row">
          <div class="field" style="flex:1">
            <label>目的地</label>
            <input class="input" data-edit="destination" value="${escape(trip.destination)}" placeholder="例：日本東京" />
          </div>
        </div>
        <div class="row" style="margin-top:12px">
          <div class="field" style="flex:1">
            <label>出發日</label>
            <input class="input" type="date" data-edit="start" value="${escape(trip.start)}" />
          </div>
          <div class="field" style="flex:1">
            <label>回程日</label>
            <input class="input" type="date" data-edit="end" value="${escape(trip.end)}" />
          </div>
        </div>
        <p class="muted" style="margin:12px 0 0;font-size:13px">
          ${days} 天 · 建立於 ${escape(trip.createdAt?.slice(0, 10) || '')}
        </p>
      </div>

      <div class="card">
        <h3>備註</h3>
        <textarea class="textarea" data-edit="notes" placeholder="住宿地址、緊急聯絡、簽證、保險…">${escape(trip.notes)}</textarea>
      </div>
    </section>
  `;
};

export const viewItinerary = (trip, onUpdate) => {
  const days = daysBetween(trip.start, trip.end);
  const blocks = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(trip.start, i);
    const items = (trip.itinerary || []).filter((x) => x.dayIndex === i);
    blocks.push(`
      <div class="day-block">
        <div class="day-header">
          <div class="day-title">Day ${i + 1} <span class="day-date">${escape(fmtDate(date))}</span></div>
          <button class="btn btn-ghost" data-add-itinerary="${i}">+ 加行程</button>
        </div>
        ${items.length === 0
          ? '<p class="muted" style="margin:4px 0 0;font-size:13px">這天還沒排。</p>'
          : `<div class="list">${items.map((it) => {
            const place = ((it.place || '').trim() || matchKnownPlace(it.text || '')).trim();
            const mapsUrl = place
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
              : '';
            return `
              <div class="itinerary-item" data-itinerary-id="${escape(it.id)}">
                <input class="input itinerary-time" data-itinerary-time="${escape(it.id)}" value="${escape(it.time || '')}" placeholder="09:00" />
                <div class="itinerary-main">
                  <input class="input" data-itinerary-text="${escape(it.id)}" value="${escape(it.text || '')}" placeholder="景點 / 餐廳 / 備註…" />
                  <input class="input itinerary-place" data-itinerary-place="${escape(it.id)}" value="${escape(place)}" placeholder="📍 Google Maps 地點（選填）" />
                </div>
                <div class="actions">
                  ${mapsUrl ? `<a class="btn btn-icon btn-ghost maps-link" href="${escape(mapsUrl)}" target="_blank" rel="noopener noreferrer" title="在 Google Maps 開：${escape(place)}">📍</a>` : ''}
                  <button class="btn btn-icon btn-ghost btn-danger" data-del-itinerary="${escape(it.id)}" title="刪除">✕</button>
                </div>
              </div>
            `;
          }).join('')}</div>`
        }
      </div>
    `);
  }
  return `<section class="section">${blocks.join('')}</section>`;
};

export const viewPacking = (trip, onUpdate) => {
  const items = trip.packing || [];
  const done = items.filter((x) => x.done).length;
  const total = items.length;
  return `
    <section class="section">
      <div class="card">
        <h3>
          <span>打包清單 <span class="muted" style="font-weight:400;font-size:13px">${done}/${total}</span></span>
          <button class="btn btn-primary" data-add-packing>+ 加項目</button>
        </h3>
        ${items.length === 0
          ? '<p class="muted" style="font-size:13px;margin:0">還沒列。從護照、衣物、充電器開始。</p>'
          : `<div class="list">${items.map((it) => `
              <div class="list-item ${it.done ? 'done' : ''}" data-packing-id="${escape(it.id)}">
                <input type="checkbox" class="checkbox" data-packing-toggle="${escape(it.id)}" ${it.done ? 'checked' : ''} />
                <div class="grow">
                  <input class="input" data-packing-text="${escape(it.id)}" value="${escape(it.text)}" placeholder="例：充電器" />
                </div>
                <div class="actions"><button class="btn btn-icon btn-ghost btn-danger" data-del-packing="${escape(it.id)}" title="刪除">✕</button></div>
              </div>
            `).join('')}</div>`
        }
      </div>
    </section>
  `;
};

export const viewBudget = (trip, onUpdate) => {
  const items = trip.budget || [];
  const spent = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const total = Number(trip.budgetTotal) || 0;
  const remaining = total - spent;
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  return `
    <section class="section">
      <div class="card">
        <h3>
          <span>總預算</span>
        </h3>
        <div class="row">
          <div class="field" style="flex:1">
            <label>總預算 (TWD)</label>
            <input class="input" type="number" min="0" step="100" data-edit-budget-total value="${escape(trip.budgetTotal ?? '')}" placeholder="例：50000" />
          </div>
        </div>

        <div class="budget-summary" style="margin-top:14px">
          <div class="budget-cell">
            <div class="label">已花費</div>
            <div class="value amount spent">${fmtCurrency(spent)}</div>
          </div>
          <div class="budget-cell">
            <div class="label">剩餘</div>
            <div class="value amount" style="color:${remaining < 0 ? 'var(--danger)' : 'var(--text)'}">${fmtCurrency(remaining)}</div>
          </div>
          <div class="budget-cell">
            <div class="label">使用率</div>
            <div class="value">${total > 0 ? pct + '%' : '—'}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>
          <span>支出 <span class="muted" style="font-weight:400;font-size:13px">${items.length} 筆</span></span>
          <button class="btn btn-primary" data-add-budget>+ 加一筆</button>
        </h3>
        ${items.length === 0
          ? '<p class="muted" style="font-size:13px;margin:0">還沒記帳。加一筆開始。</p>'
          : `<div class="list">${items.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((it) => `
              <div class="list-item" data-budget-id="${escape(it.id)}">
                <div class="grow">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <input class="input" style="max-width:160px" data-budget-name="${escape(it.id)}" value="${escape(it.name)}" placeholder="項目" />
                    <input class="input" style="max-width:110px" type="number" min="0" step="1" data-budget-amount="${escape(it.id)}" value="${escape(it.amount ?? '')}" placeholder="金額" />
                    <input class="input" style="max-width:140px" type="date" data-budget-date="${escape(it.id)}" value="${escape(it.date)}" />
                    <span class="tag" data-budget-cat="${escape(it.id)}" style="cursor:pointer">${escape(it.category || '其他')}</span>
                  </div>
                </div>
                <div class="actions"><button class="btn btn-icon btn-ghost btn-danger" data-del-budget="${escape(it.id)}" title="刪除">✕</button></div>
              </div>
            `).join('')}</div>`
        }
      </div>
    </section>
  `;
};

export const viewNotes = (trip, onUpdate) => {
  return `
    <section class="section">
      <div class="card">
        <h3>筆記</h3>
        <textarea class="textarea" data-edit="freeNotes" placeholder="餐廳推薦、要買的東西、突發想法…">${escape(trip.freeNotes)}</textarea>
      </div>
    </section>
  `;
};

export const tabLabels = [
  { id: 'overview', label: '總覽' },
  { id: 'itinerary', label: '行程' },
  { id: 'map', label: '地圖' },
  { id: 'packing', label: '打包' },
  { id: 'budget', label: '預算' },
  { id: 'notes', label: '筆記' },
];

// Auto-detect a place name from free-text itinerary items.
const matchKnownPlace = (text) => {
  if (!text) return '';
  for (const known of Object.keys(KNOWN_PLACES)) {
    if (text.includes(known)) return known;
  }
  return '';
};

// Known coordinates for popular Japanese locations. Anything not here falls back to the list only.
export const KNOWN_PLACES = {
  '中部國際機場': [34.8584, 136.8133],
  '名古屋站': [35.1709, 136.8814],
  '矢場とん 名古屋駅店': [35.1714, 136.8823],
  '名古屋港水族館': [35.0913, 136.8786],
  '名古屋港 JETTY': [35.0905, 136.8813],
  '世界の山ちゃん 矢場町店': [35.1663, 136.9080],
  '熱田神宮': [35.1025, 136.9081],
  '蓬萊軒 神宮店': [35.1026, 136.9060],
  '大須商店街': [35.1597, 136.9085],
  '東山動植物園': [35.1556, 136.9825],
  'ノリタケの森': [35.1717, 136.9180],
  'AEON Mall Nagoya Dome-mae': [35.1889, 136.9458],
  'JRゲートタワー': [35.1709, 136.8814],
  '驛麵通（えびそば 一幻）': [35.1709, 136.8814],
};

// Color palette for marking different days on the map. Cycles if more days than colors.
export const DAY_COLORS = [
  '#0f766e', '#0891b2', '#7c3aed', '#db2777', '#ea580c',
  '#65a30d', '#ca8a04', '#475569', '#be123c', '#0369a1',
];

export const viewMap = (trip) => {
  const items = (trip.itinerary || [])
    .map((it) => {
      const place = ((it.place || '').trim() || matchKnownPlace(it.text || '')).trim();
      return { ...it, place };
    })
    .filter((it) => it.place)
    .sort((a, b) => (a.dayIndex - b.dayIndex) || (a.time || '').localeCompare(b.time || ''));
  if (items.length === 0) {
    return `<section class="section">
      <div class="card"><p class="muted">這趟行程還沒設定地點。在「行程」分頁為每個項目填 place，這裡才會顯示地圖。</p></div>
    </section>`;
  }
  const markersJson = escape(JSON.stringify(
    items.map((it, idx) => ({
      idx: idx + 1,
      place: it.place,
      text: it.text || '',
      time: it.time || '',
      day: it.dayIndex + 1,
      dayZeroBased: it.dayIndex,
      coords: KNOWN_PLACES[it.place] || null,
      color: DAY_COLORS[it.dayIndex % DAY_COLORS.length],
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`,
    }))
  ));
  const mappedCount = items.filter((it) => KNOWN_PLACES[it.place]).length;

  // Group markers by day for the filter chips
  const dayGroups = {};
  items.forEach((it) => {
    if (!dayGroups[it.dayIndex]) dayGroups[it.dayIndex] = { day: it.dayIndex, count: 0 };
    dayGroups[it.dayIndex].count++;
  });
  const sortedDays = Object.values(dayGroups).sort((a, b) => a.day - b.day);
  const filterChips = sortedDays.map((d) => `
    <button type="button" class="day-chip active" data-day="${d.day}">
      <span class="day-dot" style="background:${DAY_COLORS[d.day % DAY_COLORS.length]}"></span>
      Day ${d.day + 1}
      <span class="day-count">${d.count}</span>
    </button>
  `).join('');

  return `<section class="section">
    <div class="card map-card">
      <h3>地圖總覽 <span class="muted" style="font-weight:400;font-size:13px">${items.length} 個地點 · ${mappedCount} 個有座標</span></h3>
      <div id="trip-map" class="trip-map" data-markers="${markersJson}"></div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">
        🗺 由 OpenStreetMap 提供 tiles · marker 顏色標日期 · 點 marker 看詳情 · 沒座標的地點列在下方清單
      </p>
    </div>
    <div class="card day-filter-card">
      <div class="day-filter-header">
        <h3>日期篩選</h3>
        <button type="button" class="btn btn-ghost day-filter-all" data-day-filter="all">全顯 / 全隱</button>
      </div>
      <div class="day-filter-chips">
        ${filterChips}
      </div>
    </div>
    <div class="card">
      <h3>所有地點（${items.length}）</h3>
      <div class="list">
        ${items.map((it, idx) => `
          <div class="list-item">
            <div class="grow">
              <div><strong>${idx + 1}. ${escape(it.text || it.place)}</strong></div>
              <div class="muted" style="font-size:12px">Day ${it.dayIndex + 1} · ${escape(it.time || '')}</div>
            </div>
            <a class="btn btn-icon btn-ghost maps-link" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}" target="_blank" rel="noopener noreferrer" title="在 Google Maps 開">📍</a>
          </div>
        `).join('')}
      </div>
    </div>
  </section>`;
};
