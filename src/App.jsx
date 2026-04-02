import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "qianqian_flow_v2";

const FLOW_TYPES = [
  { id: "flow",    emoji: "🌊", label: "Flow",    desc: "daily life"  },
  { id: "build",   emoji: "🌱", label: "Build",   desc: "future self" },
  { id: "impulse", emoji: "⚡", label: "Impulse", desc: "emotional"   },
  { id: "drain",   emoji: "🪨", label: "Drain",   desc: "unwanted"    },
];

const FLOW_COLORS = {
  flow:    "#7bbfa0",
  build:   "#8fc49a",
  impulse: "#c4b87b",
  drain:   "#a8a08a",
};

const TABS = ["Today", "This Week", "This Month"];

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function persist(entries) { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function startOfDay()   { const t = new Date(); t.setHours(0,0,0,0); return t.getTime(); }
function startOfWeek()  { const t = new Date(); t.setHours(0,0,0,0); t.setDate(t.getDate()-t.getDay()); return t.getTime(); }
function startOfMonth() { const t = new Date(); t.setHours(0,0,0,0); t.setDate(1); return t.getTime(); }

function filterByTab(entries, tab) {
  if (tab === "Today")      return entries.filter(e => e.ts >= startOfDay());
  if (tab === "This Week")  return entries.filter(e => e.ts >= startOfWeek());
  if (tab === "This Month") return entries.filter(e => e.ts >= startOfMonth());
  return entries;
}

function calcTotals(entries) {
  let income = 0, expense = 0;
  entries.forEach(e => {
    if (e.entryType === "income") income += Math.abs(e.amount);
    else expense += Math.abs(e.amount);
  });
  return { income, expense, net: income - expense };
}

function fmtNet(n) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (n >= 0 ? "+" : "−") + abs;
}
function fmtTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtDate(ts)  { return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" }); }
function fmtWday(ts)  { return new Date(ts).toLocaleDateString([], { weekday: "short" }); }

// ── Styles ────────────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #f2f8f4;
  --bg2:       #e8f2ec;
  --surface:   #ffffff;
  --sage:      #7aaa8a;
  --sage-light:#a8c9b2;
  --sage-deep: #4d8a64;
  --mint:      #c8e6d3;
  --foam:      #dff0e6;
  --text:      #3a5244;
  --text2:     #6b8c7a;
  --text3:     #9ab5a5;
  --border:    #d8eae0;
  --shadow:    rgba(60,100,75,0.07);
  --shadow2:   rgba(60,100,75,0.13);
  --danger:    #c4866a;
  --r: 20px; --r-sm: 12px; --r-xs: 8px;
}

html, body { height: 100%; background: var(--bg); }
body { font-family: 'Nunito', sans-serif; color: var(--text); font-weight: 400; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
::-webkit-scrollbar { width: 0; }

.app { max-width: 430px; margin: 0 auto; min-height: 100vh; background: var(--bg); display: flex; flex-direction: column; }

/* Header */
.header { padding: 52px 24px 18px; }
.header-top { display: flex; align-items: flex-start; justify-content: space-between; }
.header-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 500; line-height: 1.25; }
.header-title em { font-style: italic; color: var(--sage-deep); font-weight: 400; }
.header-sub { font-size: 12.5px; color: var(--text3); margin-top: 4px; letter-spacing: 0.02em; font-weight: 300; }
.header-leaf { font-size: 28px; opacity: 0.7; }

/* Tabs */
.tabs { display: flex; padding: 0 24px; margin-bottom: 20px; border-bottom: 1.5px solid var(--border); }
.tab-btn { flex: 1; padding: 11px 0 10px; background: none; border: none; font-family: 'Nunito', sans-serif; font-size: 13.5px; font-weight: 400; color: var(--text3); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1.5px; transition: all 0.2s; }
.tab-btn.active { color: var(--sage-deep); border-bottom-color: var(--sage-deep); font-weight: 600; }

/* Content */
.content { flex: 1; overflow-y: auto; padding: 0 24px 130px; }

/* Summary card */
.summary-card { background: var(--surface); border-radius: var(--r); padding: 20px 22px 18px; margin-bottom: 20px; box-shadow: 0 2px 18px var(--shadow2); border: 1px solid var(--border); }
.summary-label { font-size: 11px; color: var(--text3); letter-spacing: 0.09em; text-transform: uppercase; margin-bottom: 14px; font-weight: 500; }
.summary-net { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 500; line-height: 1; margin-bottom: 16px; }
.summary-net.pos { color: var(--sage-deep); } .summary-net.neg { color: #b8725a; } .summary-net.zer { color: var(--text2); }
.summary-row { display: flex; gap: 12px; }
.summary-pill { flex: 1; background: var(--bg); border-radius: var(--r-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; }
.summary-pill-label { font-size: 10.5px; color: var(--text3); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500; }
.summary-pill-amt { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; }
.summary-pill-amt.inc { color: var(--sage-deep); } .summary-pill-amt.exp { color: #b8725a; }

/* Section title */
.section-title { font-family: 'Playfair Display', serif; font-size: 15px; font-style: italic; font-weight: 400; color: var(--text2); margin: 22px 0 12px; }

/* Entry card */
.entry-card { background: var(--surface); border-radius: var(--r); padding: 15px 16px; margin-bottom: 9px; display: flex; align-items: flex-start; gap: 13px; box-shadow: 0 1px 10px var(--shadow); border: 1px solid var(--border); cursor: pointer; transition: transform 0.15s; position: relative; overflow: hidden; animation: cardIn 0.25s ease both; }
.entry-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3.5px; background: var(--ec-color, var(--sage-light)); border-radius: 3px 0 0 3px; }
.entry-card:active { transform: scale(0.985); }
@keyframes cardIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }

.entry-icon { font-size: 20px; min-width: 28px; padding-top: 1px; }
.entry-body { flex: 1; min-width: 0; }
.entry-note { font-size: 14.5px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entry-note.empty { font-style: italic; color: var(--text3); font-weight: 300; font-size: 14px; }
.entry-obs { font-size: 12px; color: var(--text3); font-weight: 300; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.entry-meta { display: flex; align-items: center; gap: 7px; margin-top: 4px; flex-wrap: wrap; }
.entry-tag { font-size: 10.5px; color: var(--text3); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500; }
.entry-time { font-size: 11px; color: var(--text3); }
.entry-right { display: flex; flex-direction: column; align-items: flex-end; padding-top: 1px; }
.entry-amount { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 500; white-space: nowrap; }
.entry-amount.inc { color: var(--sage-deep); } .entry-amount.exp { color: #b8725a; }

/* Empty */
.empty { text-align: center; padding: 50px 16px; }
.empty-icon { font-size: 38px; margin-bottom: 14px; opacity: 0.6; }
.empty-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 400; font-style: italic; color: var(--text2); margin-bottom: 8px; }
.empty-hint { font-size: 13.5px; color: var(--text3); line-height: 1.65; font-weight: 300; }

/* Flow bars */
.flow-bars { margin-bottom: 4px; }
.flow-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; cursor: pointer; border-radius: var(--r-xs); padding: 6px 8px; margin-left: -8px; margin-right: -8px; transition: background 0.15s; }
.flow-bar-row:hover { background: var(--bg2); }
.flow-bar-row:active { background: var(--border); }
.flow-bar-row.no-entries { opacity: 0.4; cursor: default; }
.flow-bar-emoji { font-size: 17px; width: 22px; text-align: center; }
.flow-bar-track { flex: 1; height: 7px; background: var(--bg2); border-radius: 10px; overflow: hidden; }
.flow-bar-fill { height: 100%; border-radius: 10px; transition: width 0.7s cubic-bezier(0.34,1.3,0.64,1); }
.flow-bar-n { font-size: 12.5px; color: var(--text3); min-width: 18px; text-align: right; }
.flow-bar-chevron { font-size: 13px; color: var(--text3); opacity: 0.5; margin-left: 2px; }

/* Reflection */
.reflection-card { background: var(--foam); border-radius: var(--r); padding: 18px 20px; margin-bottom: 10px; border: 1px solid var(--mint); }
.reflection-prompt { font-family: 'Playfair Display', serif; font-size: 15px; font-style: italic; color: var(--sage-deep); margin-bottom: 14px; line-height: 1.45; }
.reflection-hl { background: var(--surface); border-radius: var(--r-sm); padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); }
.reflection-hl:last-child { margin-bottom: 0; }
.reflection-hl-emoji { font-size: 18px; }
.reflection-hl-note { font-size: 14px; font-weight: 500; color: var(--text); }
.reflection-hl-note.empty { font-style: italic; color: var(--text3); font-weight: 300; }
.reflection-hl-meta { font-size: 11px; color: var(--text3); margin-top: 2px; }

/* FAB */
.fab { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); width: calc(100% - 48px); max-width: 382px; background: var(--sage-deep); color: #fff; border: none; border-radius: 50px; padding: 17px 28px; font-family: 'Nunito', sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 0.03em; cursor: pointer; box-shadow: 0 6px 28px rgba(60,120,80,0.28); transition: transform 0.15s; display: flex; align-items: center; justify-content: center; gap: 9px; z-index: 100; }
.fab:active { transform: translateX(-50%) scale(0.97); }
.fab-icon { font-size: 20px; line-height: 1; }

/* Overlay + Sheet */
.overlay { position: fixed; inset: 0; background: rgba(30,60,40,0.28); backdrop-filter: blur(5px); z-index: 200; display: flex; align-items: flex-end; animation: fadeIn 0.22s ease; }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
.sheet { background: var(--surface); border-radius: 26px 26px 0 0; width: 100%; max-width: 430px; margin: 0 auto; max-height: 91vh; overflow-y: auto; animation: slideUp 0.28s cubic-bezier(0.32,0.72,0,1); padding-bottom: 44px; }
@keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
.sheet-handle { width: 38px; height: 4px; background: var(--border); border-radius: 4px; margin: 13px auto 0; }
.sheet-head { padding: 16px 24px 12px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.sheet-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 500; }
.sheet-title-row { display: flex; align-items: center; gap: 10px; }
.sheet-title-emoji { font-size: 22px; }
.sheet-subtitle { font-size: 12px; color: var(--text3); margin-top: 2px; }
.sheet-close { background: var(--bg2); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 17px; color: var(--text2); transition: background 0.15s; flex-shrink: 0; }
.sheet-close:active { background: var(--border); }
.sheet-body { padding: 20px 24px 0; }
.sheet-body-pad { padding: 16px 24px 0; }

/* Form fields */
.field-label { display: block; font-size: 11.5px; color: var(--text3); letter-spacing: 0.07em; text-transform: uppercase; font-weight: 600; margin-bottom: 9px; margin-top: 20px; }
.field-label:first-child { margin-top: 0; }

.type-toggle { display: flex; background: var(--bg2); border-radius: var(--r-sm); padding: 3px; }
.type-btn { flex: 1; padding: 11px 0; border: none; background: none; border-radius: var(--r-xs); font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.18s; color: var(--text3); }
.type-btn.inc.active { background: #d4edda; color: var(--sage-deep); box-shadow: 0 1px 6px rgba(60,120,80,0.12); }
.type-btn.exp.active { background: #f5ddd5; color: #a05a3f; box-shadow: 0 1px 6px rgba(160,90,63,0.12); }

.amount-row { display: flex; align-items: center; background: var(--bg); border-radius: var(--r-sm); overflow: hidden; border: 1.5px solid var(--border); transition: border-color 0.15s; }
.amount-row:focus-within { border-color: var(--sage-light); }
.amount-sign { padding: 0 16px; font-family: 'Playfair Display', serif; font-size: 22px; flex-shrink: 0; }
.amount-sign.inc { color: var(--sage-deep); } .amount-sign.exp { color: #b8725a; }
.amount-input { flex: 1; height: 52px; border: none; background: none; font-family: 'Playfair Display', serif; font-size: 24px; color: var(--text); outline: none; padding-right: 16px; }
.amount-input::placeholder { color: var(--border); }

.note-input { width: 100%; background: var(--bg); border: 1.5px solid var(--border); border-radius: var(--r-sm); padding: 14px 16px; font-family: 'Nunito', sans-serif; font-size: 15px; color: var(--text); outline: none; transition: border-color 0.15s; }
.note-input::placeholder { color: var(--text3); }
.note-input:focus { border-color: var(--sage-light); }
.note-chars { font-size: 11px; color: var(--text3); text-align: right; margin-top: 4px; }

.flow-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.flow-btn { display: flex; align-items: center; gap: 10px; padding: 13px; background: var(--bg); border: 1.5px solid transparent; border-radius: var(--r-sm); cursor: pointer; transition: all 0.15s; text-align: left; }
.flow-btn.selected { border-color: var(--sage-light); background: var(--foam); }
.flow-btn-emoji { font-size: 21px; flex-shrink: 0; }
.flow-btn-label { display: block; font-size: 13.5px; font-weight: 600; color: var(--text); line-height: 1.2; }
.flow-btn-desc { font-size: 10.5px; color: var(--text3); }

.actions-row { display: flex; gap: 10px; margin-top: 26px; }
.btn-save { flex: 1; background: var(--sage-deep); color: #fff; border: none; border-radius: 50px; padding: 16px; font-family: 'Nunito', sans-serif; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.btn-save:disabled { opacity: 0.3; cursor: default; }
.btn-delete { background: #f5eeeb; border: none; border-radius: 50px; padding: 16px 20px; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 500; color: var(--danger); cursor: pointer; }
.btn-delete:active { background: #f0e0d8; }

.del-confirm { background: #fdf3f0; border-radius: var(--r-sm); padding: 16px; margin-top: 10px; border: 1px solid #f0d5cc; text-align: center; }
.del-confirm-text { font-size: 14px; color: var(--text2); margin-bottom: 12px; line-height: 1.5; }
.del-confirm-btns { display: flex; gap: 8px; }
.btn-del-yes { flex: 1; background: var(--danger); color: white; border: none; border-radius: 50px; padding: 12px; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-del-no { flex: 1; background: var(--bg2); color: var(--text2); border: none; border-radius: 50px; padding: 12px; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }

/* Reset */
.reset-row { text-align: center; padding: 28px 0 4px; }
.btn-reset { background: none; border: none; font-family: 'Nunito', sans-serif; font-size: 12.5px; color: var(--text3); cursor: pointer; padding: 8px 14px; border-radius: 50px; transition: all 0.15s; }
.btn-reset:hover { color: var(--text2); background: var(--bg2); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(30,60,40,0.22); backdrop-filter: blur(4px); z-index: 400; display: flex; align-items: center; justify-content: center; padding: 28px; animation: fadeIn 0.2s ease; }
.modal { background: var(--surface); border-radius: var(--r); padding: 28px 24px 24px; width: 100%; max-width: 340px; box-shadow: 0 8px 40px rgba(40,80,55,0.16); animation: modalIn 0.22s cubic-bezier(0.32,0.72,0,1); }
@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(8px) } to { opacity:1; transform:none } }
.modal-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 500; color: var(--text); margin-bottom: 10px; }
.modal-msg { font-size: 14px; color: var(--text2); line-height: 1.6; font-weight: 300; margin-bottom: 24px; }
.modal-btns { display: flex; gap: 10px; }
.btn-modal-cancel { flex: 1; background: var(--bg2); border: none; border-radius: 50px; padding: 14px; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 500; color: var(--text2); cursor: pointer; }
.btn-modal-confirm { flex: 1; background: var(--foam); border: 1.5px solid var(--mint); border-radius: 50px; padding: 14px; font-family: 'Nunito', sans-serif; font-size: 14px; font-weight: 600; color: var(--sage-deep); cursor: pointer; }

/* Toast */
.toast { position: fixed; bottom: 108px; left: 50%; transform: translateX(-50%); background: var(--text); color: #fff; padding: 11px 22px; border-radius: 50px; font-size: 13.5px; font-weight: 500; z-index: 600; white-space: nowrap; animation: toastIn 0.25s ease, toastOut 0.22s ease 1.6s forwards; }
@keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
@keyframes toastOut { to   { opacity:0; transform:translateX(-50%) translateY(10px) } }
`;

// ── Components ────────────────────────────────────────────────────────────────

function SummaryCard({ entries, period }) {
  const { income, expense, net } = calcTotals(entries);
  return (
    <div className="summary-card">
      <div className="summary-label">{period} · net flow</div>
      <div className={`summary-net ${net > 0 ? "pos" : net < 0 ? "neg" : "zer"}`}>{fmtNet(net)}</div>
      <div className="summary-row">
        <div className="summary-pill">
          <span className="summary-pill-label">Income</span>
          <span className="summary-pill-amt inc">+{income.toLocaleString()}</span>
        </div>
        <div className="summary-pill">
          <span className="summary-pill-label">Spent</span>
          <span className="summary-pill-amt exp">−{expense.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function EntryCard({ entry, onClick, showDate }) {
  const ft = FLOW_TYPES.find(f => f.id === entry.flowType);
  const color = FLOW_COLORS[entry.flowType] || "#7aaa8a";
  return (
    <div className="entry-card" style={{ "--ec-color": color }} onClick={() => onClick(entry)}>
      <div className="entry-icon">{ft?.emoji}</div>
      <div className="entry-body">
        <div className={`entry-note${!entry.note ? " empty" : ""}`}>{entry.note || "a quiet moment"}</div>
        {entry.observation && <div className="entry-obs">{entry.observation}</div>}
        <div className="entry-meta">
          <span className="entry-tag">{ft?.label}</span>
          <span className="entry-time">
            {showDate ? `${fmtWday(entry.ts)} ${fmtDate(entry.ts)}` : fmtTime(entry.ts)}
          </span>
        </div>
      </div>
      <div className="entry-right">
        <span className={`entry-amount ${entry.entryType === "income" ? "inc" : "exp"}`}>
          {entry.entryType === "income" ? "+" : "−"}{Math.abs(entry.amount).toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function FlowBars({ entries, onSelect }) {
  const max = Math.max(...FLOW_TYPES.map(ft => entries.filter(e => e.flowType === ft.id).length), 1);
  return (
    <div className="flow-bars">
      {FLOW_TYPES.map(ft => {
        const count = entries.filter(e => e.flowType === ft.id).length;
        const hasEntries = count > 0;
        return (
          <div
            key={ft.id}
            className={`flow-bar-row${!hasEntries ? " no-entries" : ""}`}
            onClick={() => hasEntries && onSelect(ft.id)}
          >
            <span className="flow-bar-emoji">{ft.emoji}</span>
            <div className="flow-bar-track">
              <div className="flow-bar-fill" style={{ width: `${(count / max) * 100}%`, background: FLOW_COLORS[ft.id] }} />
            </div>
            <span className="flow-bar-n">{count}</span>
            {hasEntries && <span className="flow-bar-chevron">›</span>}
          </div>
        );
      })}
    </div>
  );
}

function ReflectionCard({ entries, prompt }) {
  const recent = entries.slice(0, 3);
  return (
    <div className="reflection-card">
      <div className="reflection-prompt">"{prompt}"</div>
      {recent.length === 0 && (
        <div style={{ fontSize: 13, color: "#9ab5a5", fontStyle: "italic" }}>Your moments will appear here.</div>
      )}
      {recent.map(e => {
        const ft = FLOW_TYPES.find(f => f.id === e.flowType);
        return (
          <div className="reflection-hl" key={e.id}>
            <span className="reflection-hl-emoji">{ft?.emoji}</span>
            <div>
              <div className={`reflection-hl-note${!e.note ? " empty" : ""}`}>{e.note || "a quiet moment"}</div>
              <div className="reflection-hl-meta">{ft?.label} · {e.entryType === "income" ? "+" : "−"}{Math.abs(e.amount).toLocaleString()} · {fmtDate(e.ts)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlowDetailSheet({ flowTypeId, entries, onClose, onTap }) {
  const ft = FLOW_TYPES.find(f => f.id === flowTypeId);
  const filtered = entries.filter(e => e.flowType === flowTypeId).sort((a, b) => b.ts - a.ts);
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="sheet-title-row">
              <span className="sheet-title-emoji">{ft?.emoji}</span>
              <span className="sheet-title">{ft?.label}</span>
            </div>
            <div className="sheet-subtitle">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
          </div>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body-pad">
          {filtered.length === 0 ? (
            <div className="empty" style={{ padding: "40px 0" }}>
              <div className="empty-icon">{ft?.emoji}</div>
              <div className="empty-hint">No entries in this flow.</div>
            </div>
          ) : (
            filtered.map(e => (
              <EntryCard key={e.id} entry={e} showDate={true} onClick={entry => { onClose(); onTap(entry); }} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EntrySheet({ entry, onClose, onSave, onDelete }) {
  const isEdit = !!entry;
  const [entryType, setEntryType] = useState(entry?.entryType || "expense");
  const [amount, setAmount]       = useState(entry ? String(Math.abs(entry.amount)) : "");
  const [note, setNote]           = useState(entry?.note || "");
  const [observation, setObservation] = useState(entry?.observation || "");
  const [flowType, setFlowType]   = useState(entry?.flowType || null);
  const [showDel, setShowDel]     = useState(false);

  const canSave = amount && parseFloat(amount) > 0 && flowType;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ id: entry?.id || uid(), entryType, amount: parseFloat(amount), note: note.trim(), observation: observation.trim(), flowType, ts: entry?.ts || Date.now() });
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div className="sheet-title">{isEdit ? "Edit this moment" : "A new moment"}</div>
          <button className="sheet-close" onClick={onClose}>✕</button>
        </div>
        <div className="sheet-body">

          <span className="field-label">Income or Expense?</span>
          <div className="type-toggle">
            <button className={`type-btn inc${entryType === "income" ? " active" : ""}`} onClick={() => setEntryType("income")}>💚 Income</button>
            <button className={`type-btn exp${entryType === "expense" ? " active" : ""}`} onClick={() => setEntryType("expense")}>🍂 Expense</button>
          </div>

          <span className="field-label">Amount</span>
          <div className="amount-row">
            <span className={`amount-sign ${entryType === "income" ? "inc" : "exp"}`}>{entryType === "income" ? "+" : "−"}</span>
            <input className="amount-input" type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
          </div>

          <span className="field-label">This was…</span>
          <input className="note-input" type="text" placeholder="This was…" maxLength={30} value={note} onChange={e => setNote(e.target.value)} />
          <div className="note-chars">{note.length}/30</div>

          <span className="field-label">Something you noticed… (optional)</span>
          <input className="note-input" type="text" placeholder="Something you noticed…" maxLength={60} value={observation} onChange={e => setObservation(e.target.value)} />

          <span className="field-label">What kind of flow?</span>
          <div className="flow-grid">
            {FLOW_TYPES.map(ft => (
              <button key={ft.id} className={`flow-btn${flowType === ft.id ? " selected" : ""}`} onClick={() => setFlowType(ft.id)}>
                <span className="flow-btn-emoji">{ft.emoji}</span>
                <div><span className="flow-btn-label">{ft.label}</span><span className="flow-btn-desc">{ft.desc}</span></div>
              </button>
            ))}
          </div>

          <div className="actions-row">
            {isEdit && <button className="btn-delete" onClick={() => setShowDel(true)}>Remove</button>}
            <button className="btn-save" disabled={!canSave} onClick={handleSave}>{isEdit ? "Save changes" : "Save this moment"}</button>
          </div>

          {showDel && (
            <div className="del-confirm">
              <div className="del-confirm-text">Remove this entry?<br /><span style={{ fontSize: 12, opacity: 0.7 }}>It will be gently let go.</span></div>
              <div className="del-confirm-btns">
                <button className="btn-del-no" onClick={() => setShowDel(false)}>Keep it</button>
                <button className="btn-del-yes" onClick={() => onDelete(entry.id)}>Let it go</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function TodayView({ entries, onTap }) {
  const items = filterByTab(entries, "Today").sort((a, b) => b.ts - a.ts);
  return (
    <>
      <SummaryCard entries={items} period="Today" />
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌿</div>
          <div className="empty-title">A fresh day begins</div>
          <div className="empty-hint">Just one entry is enough.<br />Notice one moment with money today.</div>
        </div>
      ) : (
        <>
          <div className="section-title">Today's moments</div>
          {items.map(e => <EntryCard key={e.id} entry={e} onClick={onTap} showDate={false} />)}
        </>
      )}
    </>
  );
}

function WeekView({ entries, onTap }) {
  const items = filterByTab(entries, "This Week").sort((a, b) => b.ts - a.ts);
  const [selectedFlow, setSelectedFlow] = useState(null);
  return (
    <>
      <SummaryCard entries={items} period="This week" />
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌱</div>
          <div className="empty-title">A quiet week so far</div>
          <div className="empty-hint">Begin whenever feels right.<br />One moment at a time.</div>
        </div>
      ) : (
        <>
          <div className="section-title">Flow patterns</div>
          <FlowBars entries={items} onSelect={setSelectedFlow} />
          <ReflectionCard entries={items} prompt="Which moment stayed with you this week?" />
          <div className="section-title">This week's moments</div>
          {items.map(e => <EntryCard key={e.id} entry={e} onClick={onTap} showDate={true} />)}
        </>
      )}
      {selectedFlow && <FlowDetailSheet flowTypeId={selectedFlow} entries={items} onClose={() => setSelectedFlow(null)} onTap={onTap} />}
    </>
  );
}

function MonthView({ entries, onTap }) {
  const items = filterByTab(entries, "This Month").sort((a, b) => b.ts - a.ts);
  const [selectedFlow, setSelectedFlow] = useState(null);
  return (
    <>
      <SummaryCard entries={items} period="This month" />
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌙</div>
          <div className="empty-title">This month is just beginning</div>
          <div className="empty-hint">Notice how money flows through your days.<br />Let it be gentle.</div>
        </div>
      ) : (
        <>
          <div className="section-title">Flow patterns</div>
          <FlowBars entries={items} onSelect={setSelectedFlow} />
          <ReflectionCard entries={items} prompt="What kind of flow shaped this month?" />
          <div className="section-title">This month's moments</div>
          {items.map(e => <EntryCard key={e.id} entry={e} onClick={onTap} showDate={true} />)}
        </>
      )}
      {selectedFlow && <FlowDetailSheet flowTypeId={selectedFlow} entries={items} onClose={() => setSelectedFlow(null)} onTap={onTap} />}
    </>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [entries, setEntries]     = useState(loadEntries);
  const [tab, setTab]             = useState("Today");
  const [sheet, setSheet]         = useState(null);
  const [toast, setToast]         = useState(null);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => { persist(entries); }, [entries]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSave = useCallback((entry) => {
    setEntries(prev => {
      const exists = prev.find(e => e.id === entry.id);
      return exists ? prev.map(e => e.id === entry.id ? entry : e) : [entry, ...prev];
    });
    setSheet(null);
    showToast(sheet === "add" ? "Moment recorded 🌿" : "Updated gently ✓");
  }, [sheet, showToast]);

  const handleDelete = useCallback((id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setSheet(null);
    showToast("Entry released 🍃");
  }, [showToast]);

  const handleReset = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
    setShowReset(false);
    showToast("All clear. A fresh start 🌱");
  }, [showToast]);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <div>
              <div className="header-title">Qianqian <em>Flow</em></div>
              <div className="header-sub">by Chieh · notice, not manage</div>
            </div>
            <div className="header-leaf">🌿</div>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div className="content">
          {tab === "Today"      && <TodayView entries={entries} onTap={e => setSheet(e)} />}
          {tab === "This Week"  && <WeekView  entries={entries} onTap={e => setSheet(e)} />}
          {tab === "This Month" && <MonthView entries={entries} onTap={e => setSheet(e)} />}
          <div className="reset-row">
            <button className="btn-reset" onClick={() => setShowReset(true)}>Start fresh</button>
          </div>
        </div>

        <button className="fab" onClick={() => setSheet("add")}>
          <span className="fab-icon">＋</span>
          Add a moment
        </button>

        {sheet && (
          <EntrySheet
            entry={sheet === "add" ? null : sheet}
            onClose={() => setSheet(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}

        {showReset && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReset(false)}>
            <div className="modal">
              <div className="modal-title">Start fresh?</div>
              <div className="modal-msg">This will remove all your entries. This action cannot be undone.</div>
              <div className="modal-btns">
                <button className="btn-modal-cancel" onClick={() => setShowReset(false)}>Cancel</button>
                <button className="btn-modal-confirm" onClick={handleReset}>Start fresh</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}
