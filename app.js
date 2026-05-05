// ========== Firebase設定 ==========
// 新しいFirebaseプロジェクトを作成後、下記を置き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyBtmc7MADhsrRPKM6g4KpjrmM29vh7vVn8",
  authDomain: "yakyu-59345.firebaseapp.com",
  projectId: "yakyu-59345",
  storageBucket: "yakyu-59345.firebasestorage.app",
  messagingSenderId: "165804700362",
  appId: "1:165804700362:web:32fbc57b78221575d4ba33"
};

firebase.initializeApp(firebaseConfig);
const fsdb = firebase.firestore();
const dataRef = fsdb.collection('app').doc('data');

const STATE = {
  members: [],
  events: [],
  formations: [],
  notice: ''
};

dataRef.get().then(snap => {
  if (!snap.exists) dataRef.set(STATE);
});

dataRef.onSnapshot(snap => {
  if (!snap.exists) return;
  const d = snap.data();
  STATE.members   = d.members   || [];
  STATE.events    = d.events    || [];
  STATE.formations = d.formations || [];
  STATE.notice    = d.notice    || '';
  renderAll();
});

function save(key, val) {
  return dataRef.set({ [key]: val }, { merge: true });
}

// ========== タブ ==========
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
    if (btn.dataset.page === 'formation') renderBenchList();
  });
});

function renderAll() {
  renderDashboard();
  renderMembers();
  renderEvents();
  renderBenchList();
  renderSavedFormations();
}

// ========== ユーティリティ ==========
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function positionBadge(pos) {
  const cls = { GK: 'gk', DF: 'df', MF: 'mf', FW: 'fw' }[pos] || 'df';
  return `<span class="badge badge-${cls}">${pos}</span>`;
}

// ========== ダッシュボード ==========
function renderDashboard() {
  // お知らせ
  const noticeEl = document.getElementById('notice-display');
  const input = document.getElementById('notice-input');
  if (STATE.notice) {
    noticeEl.textContent = '📢 ' + STATE.notice;
    noticeEl.style.display = 'block';
  } else {
    noticeEl.style.display = 'none';
  }
  if (input && !input.dataset.dirty) input.value = STATE.notice;

  // 統計
  document.getElementById('stat-members').textContent = STATE.members.length;
  const now = new Date();
  const thisMonth = STATE.events.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  document.getElementById('stat-events').textContent = thisMonth.length;

  const upcoming = STATE.events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcoming.length > 0) {
    const next = upcoming[0];
    const yesCount = Object.values(next.attendance || {}).filter(v => v === 'yes').length;
    document.getElementById('stat-next-attend').textContent = yesCount + '人';
  } else {
    document.getElementById('stat-next-attend').textContent = '-';
  }

  // 直近スケジュール
  const container = document.getElementById('upcoming-events');
  if (upcoming.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">予定なし</p>';
    return;
  }
  container.innerHTML = upcoming.slice(0, 3).map(e => {
    const typeBadge = e.type === 'match'
      ? '<span class="badge badge-match">試合</span>'
      : '<span class="badge badge-practice">練習</span>';
    const yesCount = Object.values(e.attendance || {}).filter(v => v === 'yes').length;
    return `<div style="padding:10px 0;border-bottom:1px solid var(--gray-border);display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      ${typeBadge}
      <strong style="font-size:13px">${e.title}</strong>
      <span style="color:var(--text-muted);font-size:12px">${e.date} ${e.time || ''} ${e.place ? '@ ' + e.place : ''}</span>
      <span style="font-size:12px;color:var(--green);font-weight:700">参加予定 ${yesCount}人</span>
    </div>`;
  }).join('');
}

function saveNotice() {
  const val = document.getElementById('notice-input').value.trim();
  STATE.notice = val;
  save('notice', val).then(() => {
    document.getElementById('notice-input').dataset.dirty = '';
  });
}

document.getElementById('notice-input').addEventListener('input', function() {
  this.dataset.dirty = '1';
});

// ========== メンバー ==========
function addMember() {
  const name = document.getElementById('m-name').value.trim();
  if (!name) { alert('名前を入力してください'); return; }
  const member = {
    id: genId(),
    name,
    grade: document.getElementById('m-grade').value,
    position: document.getElementById('m-position').value,
    number: document.getElementById('m-number').value || ''
  };
  STATE.members.push(member);
  save('members', STATE.members).then(() => {
    document.getElementById('m-name').value = '';
    document.getElementById('m-number').value = '';
  });
}

function deleteMember(id) {
  if (!confirm('削除しますか？')) return;
  STATE.members = STATE.members.filter(m => m.id !== id);
  save('members', STATE.members);
}

function renderMembers() {
  document.getElementById('member-count').textContent = STATE.members.length;
  const tbody = document.getElementById('members-tbody');
  if (STATE.members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">メンバーなし</td></tr>';
    return;
  }
  const sorted = [...STATE.members].sort((a, b) => (Number(a.number) || 99) - (Number(b.number) || 99));
  tbody.innerHTML = sorted.map(m => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px">${m.number || '-'}</td>
      <td><strong>${m.name}</strong></td>
      <td>${m.grade}</td>
      <td>${positionBadge(m.position)}</td>
      <td style="color:var(--text-muted)">${m.number || '-'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteMember('${m.id}')">削除</button></td>
    </tr>
  `).join('');
}

// ========== スケジュール ==========
function addEvent() {
  const title = document.getElementById('e-title').value.trim();
  const date  = document.getElementById('e-date').value;
  if (!title || !date) { alert('タイトルと日付を入力してください'); return; }
  const ev = {
    id: genId(),
    title,
    type: document.getElementById('e-type').value,
    date,
    time: document.getElementById('e-time').value,
    place: document.getElementById('e-place').value.trim(),
    attendance: {}
  };
  STATE.events.push(ev);
  save('events', STATE.events).then(() => {
    ['e-title', 'e-date', 'e-time', 'e-place'].forEach(id => document.getElementById(id).value = '');
  });
}

function deleteEvent(id) {
  if (!confirm('削除しますか？')) return;
  STATE.events = STATE.events.filter(e => e.id !== id);
  save('events', STATE.events);
}

function renderEvents() {
  const container = document.getElementById('events-list');
  const sorted = [...STATE.events].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">予定なし</p>';
    return;
  }
  const now = new Date().toISOString().slice(0, 10);
  container.innerHTML = sorted.map(e => {
    const past = e.date < now;
    const typeBadge = e.type === 'match'
      ? '<span class="badge badge-match">試合</span>'
      : '<span class="badge badge-practice">練習</span>';
    const yesCount  = Object.values(e.attendance || {}).filter(v => v === 'yes').length;
    const noCount   = Object.values(e.attendance || {}).filter(v => v === 'no').length;
    const maybeCount= Object.values(e.attendance || {}).filter(v => v === 'maybe').length;
    return `<div style="padding:12px 0;border-bottom:1px solid var(--gray-border);opacity:${past?0.6:1}">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        ${typeBadge}
        <strong style="font-size:14px">${e.title}</strong>
        ${past ? '<span style="font-size:11px;color:var(--text-muted)">[終了]</span>' : ''}
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
        📅 ${e.date} ${e.time ? '🕐 ' + e.time : ''} ${e.place ? '📍 ' + e.place : ''}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span class="badge badge-yes">○ ${yesCount}</span>
        <span class="badge badge-no">× ${noCount}</span>
        <span class="badge badge-maybe">△ ${maybeCount}</span>
        <button class="btn btn-ghost btn-sm" onclick="openAttendModal('${e.id}')">出欠確認</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEvent('${e.id}')">削除</button>
      </div>
    </div>`;
  }).join('');
}

// ========== 出欠モーダル ==========
function openAttendModal(eventId) {
  const ev = STATE.events.find(e => e.id === eventId);
  if (!ev) return;
  document.getElementById('attend-modal-title').textContent = ev.title + '　出欠状況';

  const att = ev.attendance || {};
  const yesCount   = STATE.members.filter(m => att[m.id] === 'yes').length;
  const noCount    = STATE.members.filter(m => att[m.id] === 'no').length;
  const maybeCount = STATE.members.filter(m => att[m.id] === 'maybe').length;
  const unanswered = STATE.members.filter(m => !att[m.id]).length;

  document.getElementById('attend-summary').innerHTML = `
    <span class="attend-count"><span class="badge badge-yes">○</span>${yesCount}人</span>
    <span class="attend-count"><span class="badge badge-no">×</span>${noCount}人</span>
    <span class="attend-count"><span class="badge badge-maybe">△</span>${maybeCount}人</span>
    <span class="attend-count" style="color:var(--text-muted)">未回答 ${unanswered}人</span>
  `;

  const sorted = [...STATE.members].sort((a, b) => {
    const order = { yes: 0, maybe: 1, '': 2, no: 3 };
    return (order[att[a.id] || ''] ?? 2) - (order[att[b.id] || ''] ?? 2);
  });

  document.getElementById('attend-tbody').innerHTML = sorted.map(m => {
    const status = att[m.id] || '';
    const badge = status === 'yes' ? '<span class="badge badge-yes">○ 参加</span>'
                : status === 'no'  ? '<span class="badge badge-no">× 欠席</span>'
                : status === 'maybe' ? '<span class="badge badge-maybe">△ 未定</span>'
                : '<span style="color:var(--text-muted);font-size:12px">未回答</span>';
    return `<tr><td>${m.name}</td><td>${positionBadge(m.position)}</td><td>${badge}</td></tr>`;
  }).join('');

  openModal('attend-modal');
}

// ========== フォーメーション（野球） ==========
const PRESETS = {
  '標準守備': [
    { role: 'C',  x: 50, y: 88 },  // 捕手
    { role: 'P',  x: 50, y: 68 },  // 投手
    { role: '1B', x: 78, y: 74 },  // 一塁手
    { role: '2B', x: 64, y: 60 },  // 二塁手
    { role: '3B', x: 22, y: 74 },  // 三塁手
    { role: 'SS', x: 36, y: 60 },  // 遊撃手
    { role: 'LF', x: 18, y: 32 },  // 左翼手
    { role: 'CF', x: 50, y: 18 },  // 中堅手
    { role: 'RF', x: 82, y: 32 },  // 右翼手
  ],
  'DH制': [
    { role: 'C',  x: 50, y: 88 },
    { role: 'P',  x: 50, y: 68 },
    { role: '1B', x: 78, y: 74 },
    { role: '2B', x: 64, y: 60 },
    { role: '3B', x: 22, y: 74 },
    { role: 'SS', x: 36, y: 60 },
    { role: 'LF', x: 18, y: 32 },
    { role: 'CF', x: 50, y: 18 },
    { role: 'RF', x: 82, y: 32 },
    { role: 'DH', x: 88, y: 90 },  // 指名打者
  ],
  '内野シフト': [
    { role: 'C',  x: 50, y: 88 },
    { role: 'P',  x: 50, y: 68 },
    { role: '1B', x: 72, y: 70 },
    { role: '2B', x: 68, y: 62 },
    { role: '3B', x: 30, y: 70 },
    { role: 'SS', x: 56, y: 62 },  // シフト右寄り
    { role: 'LF', x: 18, y: 32 },
    { role: 'CF', x: 50, y: 18 },
    { role: 'RF', x: 82, y: 32 },
  ],
};

let currentFormation = [];
let selectedMemberId = null;

function applyPreset() {
  const preset = document.getElementById('formation-preset').value;
  currentFormation = PRESETS[preset].map((p, i) => ({ ...p, id: 'slot_' + i, memberId: null }));
  renderPitch();
}

function renderPitch() {
  const pitch = document.getElementById('pitch');
  pitch.querySelectorAll('.player-dot, .player-label').forEach(el => el.remove());

  currentFormation.forEach((slot, i) => {
    const dot = document.createElement('div');
    dot.className = 'player-dot' + (slot.role === 'C' ? ' gk' : '') + (slot.memberId ? '' : ' empty');
    dot.style.left = slot.x + '%';
    dot.style.top = slot.y + '%';

    const member = slot.memberId ? STATE.members.find(m => m.id === slot.memberId) : null;
    if (member) {
      dot.textContent = member.name.length > 4 ? member.name.slice(0, 4) : member.name;
      dot.classList.remove('empty');
    } else {
      dot.textContent = slot.role;
    }

    dot.addEventListener('click', () => assignToSlot(i));
    pitch.appendChild(dot);

    if (member && member.number) {
      const lbl = document.createElement('div');
      lbl.className = 'player-label';
      lbl.style.left = slot.x + '%';
      lbl.style.top = (slot.y + 5.5) + '%';
      lbl.textContent = '#' + member.number;
      pitch.appendChild(lbl);
    }
  });
}

function assignToSlot(slotIndex) {
  if (selectedMemberId === null) {
    alert('左のメンバー一覧からメンバーを選んでください');
    return;
  }
  // 既に他のスロットに配置されていたら外す
  currentFormation.forEach((s, i) => {
    if (i !== slotIndex && s.memberId === selectedMemberId) s.memberId = null;
  });
  const slot = currentFormation[slotIndex];
  if (slot.memberId === selectedMemberId) {
    slot.memberId = null;
  } else {
    slot.memberId = selectedMemberId;
  }
  renderPitch();
  renderBenchList();
}

function renderBenchList() {
  const list = document.getElementById('bench-list');
  if (!list) return;
  if (STATE.members.length === 0) {
    list.innerHTML = '<li style="color:var(--text-muted);font-size:12px;padding:6px">メンバーなし</li>';
    return;
  }
  const assignedIds = new Set(currentFormation.map(s => s.memberId).filter(Boolean));
  list.innerHTML = STATE.members.map(m => {
    const isAssigned = assignedIds.has(m.id);
    const isSelected = selectedMemberId === m.id;
    return `<li class="bench-item${isSelected ? ' selected' : ''}" onclick="selectMember('${m.id}')"
      style="${isAssigned ? 'opacity:0.5;' : ''}">
      ${isAssigned ? '✓ ' : ''}${m.name}
      <span style="color:var(--text-muted);font-size:11px;margin-left:4px">${m.position}${m.number ? ' #' + m.number : ''}</span>
    </li>`;
  }).join('');
}

function selectMember(id) {
  selectedMemberId = selectedMemberId === id ? null : id;
  renderBenchList();
}

function clearFormation() {
  currentFormation.forEach(s => s.memberId = null);
  selectedMemberId = null;
  renderPitch();
  renderBenchList();
}

function saveFormation() {
  const name = document.getElementById('formation-name').value.trim();
  if (!name) { alert('フォーメーションに名前をつけてください'); return; }
  const preset = document.getElementById('formation-preset').value;
  const formation = {
    id: genId(),
    name,
    preset,
    slots: currentFormation.map(s => ({ ...s })),
    createdAt: new Date().toISOString().slice(0, 10)
  };
  STATE.formations.push(formation);
  save('formations', STATE.formations).then(() => {
    document.getElementById('formation-name').value = '';
  });
}

function deleteFormation(id) {
  if (!confirm('削除しますか？')) return;
  STATE.formations = STATE.formations.filter(f => f.id !== id);
  save('formations', STATE.formations);
}

function renderSavedFormations() {
  const container = document.getElementById('saved-formations');
  if (!container) return;
  if (STATE.formations.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">保存済みなし</p>';
    return;
  }
  container.innerHTML = [...STATE.formations].reverse().map(f => {
    const assignedCount = f.slots.filter(s => s.memberId).length;
    return `<div class="formation-card">
      <div>
        <div class="formation-card-name">${f.name}</div>
        <div class="formation-card-sub">${f.preset} ・ ${assignedCount}/11人 ・ ${f.createdAt}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" onclick="viewFormation('${f.id}')">表示</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFormation('${f.id}')">削除</button>
      </div>
    </div>`;
  }).join('');
}

function viewFormation(id) {
  const f = STATE.formations.find(x => x.id === id);
  if (!f) return;
  document.getElementById('view-formation-title').textContent = f.name + '　(' + f.preset + ')';

  const wrap = document.getElementById('view-formation-pitch-wrap');
  const pitchEl = document.createElement('div');
  pitchEl.style.cssText = 'position:relative;width:100%;padding-bottom:150%;background:#c8a060;border-radius:8px;border:3px solid #a07840;overflow:hidden;max-width:360px;margin:0 auto';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 150');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  svg.innerHTML = `
    <path d="M 50,102 L 3,20 Q 50,2 97,20 Z" fill="#3d7a3d"/>
    <circle cx="50" cy="76" r="30" fill="#c8a060" opacity="0.85"/>
    <polygon points="50,102 78,78 50,54 22,78" fill="#3d7a3d" opacity="0.7"/>
    <polygon points="50,102 78,78 50,54 22,78" fill="none" stroke="white" stroke-width="0.8" opacity="0.8"/>
    <line x1="50" y1="102" x2="3" y2="20" stroke="white" stroke-width="0.7" opacity="0.6"/>
    <line x1="50" y1="102" x2="97" y2="20" stroke="white" stroke-width="0.7" opacity="0.6"/>
    <path d="M 3,20 Q 50,2 97,20" fill="none" stroke="white" stroke-width="1" opacity="0.6"/>
    <circle cx="50" cy="72" r="3.5" fill="#b09050"/>
    <polygon points="50,99 53,102 50,105 47,102" fill="white"/>
    <rect x="76" y="76" width="4" height="4" fill="white" transform="rotate(45 78 78)"/>
    <rect x="48" y="52" width="4" height="4" fill="white" transform="rotate(45 50 54)"/>
    <rect x="20" y="76" width="4" height="4" fill="white" transform="rotate(45 22 78)"/>
  `;
  pitchEl.appendChild(svg);

  f.slots.forEach(slot => {
    const member = slot.memberId ? STATE.members.find(m => m.id === slot.memberId) : null;
    const dot = document.createElement('div');
    dot.style.cssText = `position:absolute;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;transform:translate(-50%,-50%);text-align:center;line-height:1.1;z-index:10;`;
    dot.style.left = slot.x + '%';
    dot.style.top = slot.y + '%';
    dot.style.background = slot.role === 'C' ? '#c0a020' : (member ? '#1a4a8a' : 'rgba(255,255,255,0.2)');
    dot.style.border = member ? '2px solid #fff' : '2px dashed rgba(255,255,255,0.5)';
    dot.textContent = member ? (member.name.length > 4 ? member.name.slice(0, 4) : member.name) : slot.role;
    pitchEl.appendChild(dot);
  });

  wrap.innerHTML = '';
  wrap.appendChild(pitchEl);
  openModal('view-formation-modal');
}

// ========== 初期化 ==========
window.addEventListener('load', () => {
  applyPreset();
});
