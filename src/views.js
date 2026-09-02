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
            <label>行程名稱</label>
            <input class="input" data-edit="name" value="${escape(trip.name)}" placeholder="例：東京賞櫻 2026" />
          </div>
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
          : `<div class="list">${items.map((it) => `
              <div class="itinerary-item" data-itinerary-id="${escape(it.id)}">
                <input class="input" data-itinerary-time="${escape(it.id)}" value="${escape(it.time || '')}" placeholder="09:00" />
                <input class="input" data-itinerary-text="${escape(it.id)}" value="${escape(it.text || '')}" placeholder="景點 / 餐廳 / 備註…" />
                <div class="actions"><button class="btn btn-icon btn-ghost btn-danger" data-del-itinerary="${escape(it.id)}" title="刪除">✕</button></div>
              </div>
            `).join('')}</div>`
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
  { id: 'packing', label: '打包' },
  { id: 'budget', label: '預算' },
  { id: 'notes', label: '筆記' },
];
