const KEY = 'travel-planner:v1';

const safeParse = (raw, fallback) => {
  try { return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
};

export const loadTrips = () => {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(KEY), []);
};

export const saveTrips = (trips) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(trips));
  } catch (err) {
    console.warn('localStorage save failed', err);
  }
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDays = (iso, days) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysBetween = (a, b) => {
  if (!a || !b) return 0;
  const ms = new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

export const fmtCurrency = (n) => {
  const v = Number(n) || 0;
  return 'NT$ ' + v.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
};

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${iso} (${wd})`;
};
