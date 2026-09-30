/* ============================================
   Mafia Night - Main Script
   كود اللعبة الكامل
   ============================================ */

/* ===== 1. الحالة الأساسية ===== */
const ROLES = {
  VILLAGER: 'villager',
  MAFIA: 'mafia',
  DOCTOR: 'doctor',
  DETECTIVE: 'detective'
};

const ROLE_INFO = {
  villager:  { name: 'قروي',   icon: '👨‍🌾', desc: 'مواطن بسيط. مهمتك اكتشاف المافيا بالتصويت.', color: '#00ff88' },
  mafia:     { name: 'مافيا',  icon: '🎭',  desc: 'أنت من العصابة! اقتل قروي كل ليلة.', color: '#c2003c' },
  doctor:    { name: 'طبيب',   icon: '💊',  desc: 'تحمي شخص من الموت كل ليلة.', color: '#f472b6' },
  detective: { name: 'محقق',   icon: '🔍',  desc: 'تحقق من هوية شخص كل ليلة.', color: '#38bdf8' }
};

const AVATARS = ['👨', '👩', '🧔', '👱', '👴', '👵', '🧑', '👦'];
const NAMES = ['أحمد', 'محمد', 'فاطمة', 'علي', 'نور', 'سارة', 'كريم', 'ليلى', 'يوسف', 'مريم'];

let game = {
  players: [],
  me: null,
  phase: 'night',
  day: 1,
  night: 1,
  votes: {},
  nightActions: {},
  alive: 0,
  dead: 0,
  winner: null,
  log: [],
  selectedTarget: null,
  phaseStep: null,
  isProcessing: false,
  difficulty: 'normal'
};

/* ===== 2. أدوات ===== */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

function addLog(text, type = 'system') {
  game.log.push({ text, type, day: game.day });
  renderLog();
}

function renderLog() {
  const list = document.getElementById('logList');
  if (!list) return;

  if (game.log.length === 0) {
    list.innerHTML = '<div class="log-empty">لا يوجد أحداث بعد</div>';
    return;
  }

  // آخر 30 حدث
  const recent = game.log.slice(-30);
  list.innerHTML = recent.map(l => 
    `<div class="log-item ${l.type}">${l.text}</div>`
  ).join('');

  list.scrollTop = list.scrollHeight;
}

function clearLog() {
  game.log = [];
  renderLog();
  showToast('🗑️ تم مسح السجل');
}

/* ===== 3. توليد اللاعبين ===== */
function generatePlayers() {
  const players = [];
  const shuffledNames = shuffle([...NAMES]);
  const shuffledAvatars = shuffle([...AVATARS]);

  // أنا (اللاعب)
  players.push({
    id: 0,
    name: 'أنت',
    avatar: '😎',
    role: null, // هيتحدد بعدين
    alive: true,
    isMe: true,
    suspicion: 0,
    aiLevel: 1
  });

  // باقي اللاعبين
  for (let i = 1; i < 8; i++) {
    players.push({
      id: i,
      name: shuffledNames[i - 1],
      avatar: shuffledAvatars[i - 1],
      role: null,
      alive: true,
      isMe: false,
      suspicion: 0,
      aiLevel: 1
    });
  }

  // توزيع الأدوار
  const roles = [
    ROLES.MAFIA,
    ROLES.MAFIA,
    ROLES.DOCTOR,
    ROLES.DETECTIVE,
    ROLES.VILLAGER,
    ROLES.VILLAGER,
    ROLES.VILLAGER,
    ROLES.VILLAGER
  ];
  const shuffledRoles = shuffle(roles);

  players.forEach((p, i) => {
    p.role = shuffledRoles[i];
  });

  game.players = players;
  game.me = players[0];
  game.alive = 8;
  game.dead = 0;
  game.votes = {};
  game.nightActions = {};
}

/* ===== 4. عرض اللاعبين ===== */
function renderPlayers() {
  const grid = document.getElementById('playersGrid');
  if (!grid) return;

  grid.innerHTML = game.players.map(p => {
    let classes = 'player-card';
    if (!p.alive) classes += ' dead';
    if (p.isMe) classes += ' me';
    if (game.selectedTarget === p.id) classes += ' selected';

    const voteCount = Object.values(game.votes).filter(v => v === p.id).length;
    const voteBadge = voteCount > 0 ? `<div class="player-vote-count">${voteCount}</div>` : '';

    // نظهر الدور فقط للأموات أو لو أنا مافيا وأعرف شركائي
    let roleBadge = '';
    if (!p.alive) {
      roleBadge = `<div class="player-role-badge ${p.role}">${ROLE_INFO[p.role].icon} ${ROLE_INFO[p.role].name}</div>`;
    } else if (game.phase === 'end') {
      roleBadge = `<div class="player-role-badge ${p.role}">${ROLE_INFO[p.role].icon} ${ROLE_INFO[p.role].name}</div>`;
    } else if (p.isMe) {
      roleBadge = `<div class="player-role-badge ${p.role}">${ROLE_INFO[p.role].icon} ${ROLE_INFO[p.role].name}</div>`;
    }

    return `
      <div class="${classes}" onclick="selectPlayer(${p.id})">
        ${voteBadge}
        <div class="player-avatar">${p.avatar}</div>
        <div class="player-name">${p.name}</div>
        ${roleBadge}
      </div>
    `;
  }).join('');
}

function updateInfo() {
  document.getElementById('aliveCount').textContent = game.players.filter(p => p.alive).length;
  document.getElementById('deadCount').textContent = game.players.filter(p => !p.alive).length;

  const mafiaAlive = game.players.filter(p => p.alive && p.role === ROLES.MAFIA).length;
  const mafiaEl = document.getElementById('mafiaCount');
  
  // نظهر عدد المافيا فقط لو أنا مافيا أو مات اللاعب
  if (game.me.role === ROLES.MAFIA || !game.me.alive) {
    mafiaEl.textContent = mafiaAlive;
  } else {
    mafiaEl.textContent = '?';
  }
}

function selectPlayer(id) {
  if (game.isProcessing) return;
  const p = game.players.find(x => x.id === id);
  if (!p || !p.alive) return;

  // لو المرحلة هي التصويت النهاري
  if (game.phase === 'day' && game.phaseStep === 'voting') {
    // ماينفعش تصوت لنفسك أو الأموات
    if (p.isMe) {
      showToast('⚠️ ماينفعش تصوت لنفسك');
      return;
    }
    if (!p.alive) return;

    game.selectedTarget = id;
    renderPlayers();
    renderActionArea();
    return;
  }

  // في المراحل الليلية
  if (game.phase === 'night' && game.me.alive) {
    if (game.phaseStep === 'mafia_kill' && game.me.role === ROLES.MAFIA) {
      if (p.role === ROLES.MAFIA) {
        showToast('⚠️ ماينفعش تقتل شريكك');
        return;
      }
    }
    if (game.phaseStep === 'doctor_save' && game.me.role === ROLES.DOCTOR) {
      // الطبيب يقدر يحمي نفسه
    }
    if (game.phaseStep === 'detective_check' && game.me.role === ROLES.DETECTIVE) {
      if (p.isMe) {
        showToast('⚠️ ماينفعش تحقق في نفسك');
        return;
      }
    }

    game.selectedTarget = id;
    renderPlayers();
    renderActionArea();
  }
}

/* ===== 5. تحديث المرحلة ===== */
function setPhase(phase, day, night) {
  game.phase = phase;
  game.day = day || game.day;
  game.night = night || game.night;

  const badge = document.getElementById('phaseBadge');
  const phaseText = document.getElementById('phaseText');
  const phaseIcon = badge.querySelector('.phase-icon');

  badge.classList.remove('night', 'day');
  
  if (phase === 'night') {
    badge.classList.add('night');
    phaseIcon.textContent = '🌙';
    phaseText.textContent = 'ليلة ' + game.night;
  } else if (phase === 'day') {
    badge.classList.add('day');
    phaseIcon.textContent = '☀️';
    phaseText.textContent = 'نهار ' + game.day;
  } else if (phase === 'end') {
    phaseIcon.textContent = '🏆';
    phaseText.textContent = 'انتهت اللعبة';
  }
}

/* ===== 6. منطقة اللعب ===== */
function renderActionArea() {
  const area = document.getElementById('actionArea');
  if (!area) return;

  // لو أنا ميت
  if (!game.me.alive && game.phase !== 'end') {
    area.innerHTML = `
      <div class="action-title">💀 أنت ميت</div>
      <div class="action-subtitle">شاهد اللعبة واستمتع بالمشاهدة</div>
    `;
    return;
  }

  // لو اللعبة خلصت
  if (game.phase === 'end') {
    area.innerHTML = `
      <div class="action-title">🏆 اللعبة انتهت</div>
      <div class="action-subtitle">الفائزين: ${game.winner === 'mafia' ? 'المافيا 🎭' : 'القرويين 👨‍🌾'}</div>
    `;
    return;
  }

  // === الليل ===
  if (game.phase === 'night') {
    if (game.phaseStep === 'intro') {
      area.innerHTML = `
        <div class="action-title">🌙 حل الظلام...</div>
        <div class="action-subtitle">القرية نائمة. المافيا تستعد للهجوم.</div>
        <button class="action-btn" onclick="continueNight()">▶️ متابعة</button>
      `;
      return;
    }

    // أنا مافيا - اختار ضحية
    if (game.phaseStep === 'mafia_kill' && game.me.role === ROLES.MAFIA) {
      const partner = game.players.find(p => p.role === ROLES.MAFIA && !p.isMe && p.alive);
      area.innerHTML = `
        <div class="action-title">🎭 دور المافيا</div>
        <div class="action-subtitle">اختار شخص لتقتله الليلة${partner ? `<br><small>شريكك: ${partner.avatar} ${partner.name}</small>` : ''}</div>
        ${game.selectedTarget !== null ? `
          <div class="action-info">🎯 اخترت: ${game.players[game.selectedTarget].avatar} ${game.players[game.selectedTarget].name}</div>
          <button class="action-btn" onclick="confirmNightAction()">✓ تأكيد القتل</button>
        ` : '<div class="action-info">👆 اضغط على لاعب لاختياره</div>'}
      `;
      return;
    }

    // أنا طبيب
    if (game.phaseStep === 'doctor_save' && game.me.role === ROLES.DOCTOR) {
      area.innerHTML = `
        <div class="action-title">💊 دور الطبيب</div>
        <div class="action-subtitle">اختار شخص لتحميه من الموت</div>
        ${game.selectedTarget !== null ? `
          <div class="action-info">🛡️ هتحمي: ${game.players[game.selectedTarget].avatar} ${game.players[game.selectedTarget].name}</div>
          <button class="action-btn" onclick="confirmNightAction()">✓ تأكيد الحماية</button>
        ` : '<div class="action-info">👆 اضغط على لاعب لحمايته</div>'}
      `;
      return;
    }

    // أنا محقق
    if (game.phaseStep === 'detective_check' && game.me.role === ROLES.DETECTIVE) {
      area.innerHTML = `
        <div class="action-title">🔍 دور المحقق</div>
        <div class="action-subtitle">اختار شخص لتعرف هويته</div>
        ${game.selectedTarget !== null ? `
          <button class="action-btn" onclick="confirmNightAction()">🔍 تحقق من ${game.players[game.selectedTarget].name}</button>
        ` : '<div class="action-info">👆 اضغط على لاعب للتحقق منه</div>'}
      `;
      return;
    }

    // باقي اللاعبين العاديين - انتظر
    area.innerHTML = `
      <div class="action-title">🌙 أنت نائم...</div>
      <div class="action-subtitle">القرية كلها نايمة. المافيا تتحرك في الظلام.</div>
      <button class="action-btn" onclick="continueNight()">⏭️ تخطي</button>
    `;
    return;
  }

  // === النهار ===
  if (game.phase === 'day') {
    if (game.phaseStep === 'announce') {
      const victim = game.nightVictim;
      const saved = game.nightSaved;
      let text = '';
      
      if (!victim) {
        text = '🕊️ لم يمت أحد الليلة!';
      } else if (saved) {
        text = `💊 حاولت المافيا قتل ${victim.avatar} ${victim.name} لكن الطبيب أنقذه!`;
      } else {
        text = `💀 مات ${victim.avatar} ${victim.name} الليلة!`;
      }

      area.innerHTML = `
        <div class="action-title">☀️ صباح يوم ${game.day}</div>
        <div class="action-subtitle">${text}</div>
        <button class="action-btn" onclick="startDiscussion()">💬 ابدأ المناقشة</button>
      `;
      return;
    }

    if (game.phaseStep === 'discussion') {
      area.innerHTML = `
        <div class="action-title">💬 المناقشة</div>
        <div class="action-subtitle">تبادلوا الشكوك حول من يكون المافيا</div>
        <div class="action-info" id="discussionText">📢 جاري المناقشة...</div>
        <button class="action-btn" onclick="startVoting()">🗳️ ابدأ التصويت</button>
      `;
      runDiscussion();
      return;
    }

    if (game.phaseStep === 'voting') {
      const myVote = game.votes[0];
      area.innerHTML = `
        <div class="action-title">🗳️ التصويت</div>
        <div class="action-subtitle">اختار شخص تعتقد إنه من المافيا</div>
        ${game.selectedTarget !== null ? `
          <div class="action-info">🗳️ صوّتت على: ${game.players[game.selectedTarget].avatar} ${game.players[game.selectedTarget].name}</div>
          <button class="action-btn" onclick="confirmVote()">✓ تأكيد التصويت</button>
        ` : '<div class="action-info">👆 اضغط على لاعب للتصويت ضده</div>'}
      `;
      return;
    }

    if (game.phaseStep === 'results') {
      area.innerHTML = `
        <div class="action-title">📊 نتيجة التصويت</div>
        <div class="action-subtitle" id="voteResults"></div>
        <button class="action-btn" onclick="continueToNight()">🌙 الليلة التالية</button>
      `;
      showVoteResults();
      return;
    }
  }
}

/* ===== 7. بدء الليل ===== */
function startNight() {
  setPhase('night', game.day, game.night);
  game.phaseStep = 'intro';
  game.selectedTarget = null;
  game.nightActions = {};
  game.nightVictim = null;
  game.nightSaved = false;
  
  addLog(`🌙 ليلة ${game.night} بدأت`, 'night');
  renderPlayers();
  updateInfo();
  renderActionArea();

  // بعد 2 ثانية، نبدأ المراحل
  setTimeout(() => {
    runNightSequence();
  }, 2000);
}

function continueNight() {
  game.phaseStep = 'processing';
  renderActionArea();
  runNightSequence();
}

function runNightSequence() {
  // المرحلة 1: المافيا
  if (game.me.role === ROLES.MAFIA && game.me.alive) {
    game.phaseStep = 'mafia_kill';
    game.selectedTarget = null;
    renderActionArea();
    return;
  }

  // مش أنا مافيا - نختار ضحية تلقائياً
  aiMafiaKill();
  nextNightStep();
}

function nextNightStep() {
  // المرحلة 2: الطبيب
  if (game.me.role === ROLES.DOCTOR && game.me.alive) {
    game.phaseStep = 'doctor_save';
    game.selectedTarget = null;
    renderActionArea();
    return;
  }

  aiDoctorSave();
  nextNightStep2();
}

function nextNightStep2() {
  // المرحلة 3: المحقق
  if (game.me.role === ROLES.DETECTIVE && game.me.alive) {
    game.phaseStep = 'detective_check';
    game.selectedTarget = null;
    renderActionArea();
    return;
  }

  aiDetectiveCheck();
  endNight();
}

function confirmNightAction() {
  if (game.selectedTarget === null) return;

  const step = game.phaseStep;
  const target = game.selectedTarget;

  if (step === 'mafia_kill') {
    game.nightActions.mafia = target;
    addLog(`🎭 المافيا اختارت ضحيتها`, 'mafia');
    nextNightStep();
  } else if (step === 'doctor_save') {
    game.nightActions.doctor = target;
    addLog(`💊 الطبيب اختار شخص ليحميه`, 'info');
    nextNightStep2();
  } else if (step === 'detective_check') {
    game.nightActions.detective = target;
    const p = game.players[target];
    const isMafia = p.role === ROLES.MAFIA;
    addLog(`🔍 المحقق حقق في ${p.name}: ${isMafia ? 'مافيا! 🎭' : 'بريء 👨‍🌾'}`, 'info');
    showToast(`🔍 ${p.name}: ${isMafia ? 'مافيا!' : 'بريء'}`);
    setTimeout(() => endNight(), 2000);
  }
}

function aiMafiaKill() {
  const alive = game.players.filter(p => p.alive && p.role !== ROLES.MAFIA);
  if (alive.length > 0) {
    // بذكاء: يقتلوا أكتر شخص مثير للشك من ناحيتهم
    const target = alive[Math.floor(Math.random() * alive.length)];
    game.nightActions.mafia = target.id;
    addLog(`🎭 المافيا تحركت في الظلام...`, 'mafia');
  }
}

function aiDoctorSave() {
  const alive = game.players.filter(p => p.alive);
  if (alive.length > 0) {
    // الطبيب بيحمي نفسه أو شخص عشوائي
    const protectSelf = Math.random() < 0.3 && game.me.alive;
    const target = protectSelf ? game.me : alive[Math.floor(Math.random() * alive.length)];
    game.nightActions.doctor = target.id;
  }
}

function aiDetectiveCheck() {
  const alive = game.players.filter(p => p.alive && p.id !== 0);
  if (alive.length > 0) {
    // المحقق العشوائي بيتحقق من شخص
    // (لكن AI ده للاعبين مش ليا)
  }
}

function endNight() {
  const mafiaTarget = game.nightActions.mafia;
  const doctorTarget = game.nightActions.doctor;

  game.nightVictim = null;
  game.nightSaved = false;

  if (mafiaTarget !== undefined) {
    const victim = game.players[mafiaTarget];
    
    if (doctorTarget === mafiaTarget) {
      // الطبيب أنقذ
      game.nightSaved = true;
      game.nightVictim = victim;
      addLog(`💊 الطبيب أنقذ ${victim.avatar} ${victim.name} من الموت`, 'info');
    } else {
      // مات
      victim.alive = false;
      game.nightVictim = victim;
      game.dead++;
      addLog(`💀 مات ${victim.avatar} ${victim.name} الليلة`, 'death');
    }
  }

  // نبدأ النهار
  setTimeout(() => {
    startDay();
  }, 1000);
}

/* ===== 8. بدء النهار ===== */
function startDay() {
  setPhase('day', game.day, game.night);
  game.phaseStep = 'announce';
  game.day++;
  game.selectedTarget = null;
  game.votes = {};

  renderPlayers();
  updateInfo();
  renderActionArea();

  // فحص الفوز
  setTimeout(checkWin, 500);
}

function startDiscussion() {
  game.phaseStep = 'discussion';
  renderActionArea();
}

function runDiscussion() {
  const textEl = document.getElementById('discussionText');
  if (!textEl) return;

  const alivePlayers = game.players.filter(p => p.alive && !p.isMe);
  const messages = [];

  alivePlayers.forEach(p => {
    const suspicion = Math.random();
    let msg = '';
    const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    
    if (p.role === ROLES.MAFIA) {
      // المافيا بتشكك في حد بريء
      const innocents = alivePlayers.filter(x => x.role !== ROLES.MAFIA);
      if (innocents.length > 0) {
        const targetInnocent = innocents[Math.floor(Math.random() * innocents.length)];
        msg = `${p.avatar} ${p.name}: أنا شاكك في ${targetInnocent.name}، شكله مريب! 🤔`;
      }
    } else {
      // قروي عادي بيشك عشوائي
      if (target) {
        msg = `${p.avatar} ${p.name}: أنا مش متأكد من ${target.name}...`;
      }
    }

    if (msg) messages.push(msg);
  });

  // نعرضهم واحد ورا التاني
  messages.forEach((m, i) => {
    setTimeout(() => {
      if (!textEl) return;
      textEl.innerHTML = m;
      addLog(m, 'day');
    }, i * 1500);
  });
}

function startVoting() {
  game.phaseStep = 'voting';
  game.selectedTarget = null;
  game.votes = {};
  renderPlayers();
  renderActionArea();
  addLog(`🗳️ بدأ التصويت`, 'day');
}

function confirmVote() {
  if (game.selectedTarget === null) return;
  game.votes[0] = game.selectedTarget;
  addLog(`🗳️ صوّتت على ${game.players[game.selectedTarget].name}`, 'day');
  renderPlayers();

  // باقي اللاعبين يصوتوا
  aiVote();

  setTimeout(() => {
    game.phaseStep = 'results';
    renderActionArea();
  }, 1500);
}

function aiVote() {
  const alive = game.players.filter(p => p.alive && !p.isMe);
  
  alive.forEach(p => {
    let target;
    
    if (p.role === ROLES.MAFIA) {
      // المافيا تصوت ضد قروي
      const innocents = alive.filter(x => x.role !== ROLES.MAFIA);
      if (innocents.length > 0) {
        target = innocents[Math.floor(Math.random() * innocents.length)];
      }
    } else {
      // القروي يصوت عشوائي
      const candidates = alive.filter(x => x.id !== p.id);
      if (candidates.length > 0) {
        target = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (target) {
      game.votes[p.id] = target.id;
    }
  });
}

function showVoteResults() {
  const results = document.getElementById('voteResults');
  if (!results) return;

  // عدد الأصوات لكل شخص
  const counts = {};
  Object.values(game.votes).forEach(tid => {
    counts[tid] = (counts[tid] || 0) + 1;
  });

  // أكثر شخص حصل على أصوات
  let maxVotes = 0;
  let eliminatedId = null;
  
  Object.entries(counts).forEach(([id, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      eliminatedId = parseInt(id);
    }
  });

  let html = '<div style="text-align:right;line-height:2">';
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([id, count]) => {
    const p = game.players[id];
    html += `<div>${p.avatar} ${p.name}: <b>${count}</b> صوت</div>`;
  });
  html += '</div>';

  if (eliminatedId !== null && maxVotes >= 2) {
    const p = game.players[eliminatedId];
    p.alive = false;
    game.dead++;
    html += `<div style="margin-top:14px;font-size:16px;font-weight:900;color:var(--blood-light)">💀 تم إعدام ${p.avatar} ${p.name}!</div>`;
    html += `<div style="font-size:13px;color:var(--ink-soft);margin-top:6px">كان دوره: ${ROLE_INFO[p.role].icon} ${ROLE_INFO[p.role].name}</div>`;
    addLog(`🗳️ تم إعدام ${p.name} (${ROLE_INFO[p.role].name})`, 'death');
  } else {
    html += `<div style="margin-top:14px;color:var(--muted)">🤷 لا أحد حصل على أغلبية الأصوات</div>`;
    addLog(`🤷 انتهى التصويت بدون إعدام`, 'day');
  }

  results.innerHTML = html;
  renderPlayers();
  updateInfo();

  // فحص الفوز
  setTimeout(checkWin, 500);
}

function continueToNight() {
  game.night++;
  startNight();
}

/* ===== 9. فحص الفوز ===== */
function checkWin() {
  const aliveMafia = game.players.filter(p => p.alive && p.role === ROLES.MAFIA).length;
  const aliveVillagers = game.players.filter(p => p.alive && p.role !== ROLES.MAFIA).length;

  if (aliveMafia === 0) {
    game.winner = 'village';
    endGame();
  } else if (aliveMafia >= aliveVillagers) {
    game.winner = 'mafia';
    endGame();
  }
}

function endGame() {
  setPhase('end', game.day, game.night);
  renderPlayers();

  const resultModal = document.getElementById('resultModal');
  const resultIcon = document.getElementById('resultIcon');
  const resultTitle = document.getElementById('resultTitle');
  const resultText = document.getElementById('resultText');
  const resultDetails = document.getElementById('resultDetails');

  const isWinner = (game.winner === 'mafia' && game.me.role === ROLES.MAFIA) ||
                   (game.winner === 'village' && game.me.role !== ROLES.MAFIA);

  if (isWinner) {
    resultIcon.textContent = '🏆';
    resultTitle.textContent = '🎉 مبروك! كسبت!';
    resultText.textContent = game.winner === 'mafia' ? 'المافيا انتصرت!' : 'القرويين انتصروا!';
  } else {
    resultIcon.textContent = '💔';
    resultTitle.textContent = '😢 للأسف، خسرت';
    resultText.textContent = game.winner === 'mafia' ? 'المافيا انتصرت!' : 'القرويين انتصروا!';
  }

  // تفاصيل
  let details = `<div style="font-weight:900;margin-bottom:8px">🎭 كشف الأدوار:</div>`;
  game.players.forEach(p => {
    details += `<div>${p.avatar} ${p.name} - ${ROLE_INFO[p.role].icon} ${ROLE_INFO[p.role].name} ${p.alive ? '✅' : '💀'}</div>`;
  });
  resultDetails.innerHTML = details;

  addLog(`🏆 ${game.winner === 'mafia' ? 'المافيا' : 'القرويين'} انتصروا!`, 'system');

  // حفظ النتيجة
  saveStats(isWinner);
  setTimeout(() => {
    resultModal.classList.add('active');
  }, 800);
}

/* ===== 10. حفظ الإحصائيات ===== */
function saveStats(isWinner) {
  try {
    const stats = JSON.parse(localStorage.getItem('mafia_stats') || '{}');
    stats.games = (stats.games || 0) + 1;
    if (isWinner) stats.wins = (stats.wins || 0) + 1;
    if (game.me.role === ROLES.MAFIA) stats.mafiaGames = (stats.mafiaGames || 0) + 1;
    if (game.me.role === ROLES.DOCTOR) stats.doctorGames = (stats.doctorGames || 0) + 1;
    if (game.me.role === ROLES.DETECTIVE) stats.detectiveGames = (stats.detectiveGames || 0) + 1;
    stats.lastGame = new Date().toISOString();
    localStorage.setItem('mafia_stats', JSON.stringify(stats));
  } catch (e) {}
}

/* ===== 11. التحكم ===== */
function showHelp() {
  document.getElementById('helpModal').classList.add('active');
}
function closeHelp() {
  document.getElementById('helpModal').classList.remove('active');
}

function showRoles() {
  const list = document.getElementById('rolesList');
  list.innerHTML = game.players.map(p => {
    const showRole = !p.alive || p.isMe || game.phase === 'end';
    return `
      <div class="role-row ${p.alive ? '' : 'dead'}">
        <div class="role-row-avatar">${p.avatar}</div>
        <div class="role-row-info">
          <div class="role-row-name">${p.name} ${p.isMe ? '(أنت)' : ''}</div>
          <div class="role-row-role">${showRole ? ROLE_INFO[p.role].icon + ' ' + ROLE_INFO[p.role].name : '❓ مجهول'}</div>
        </div>
        <div>${p.alive ? '✅' : '💀'}</div>
      </div>
    `;
  }).join('');
  document.getElementById('rolesModal').classList.add('active');
}
function closeRoles() {
  document.getElementById('rolesModal').classList.remove('active');
}

function restartGame() {
  closeResult();
  initGame();
}

function backToMenu() {
  closeResult();
  location.reload();
}

function closeResult() {
  document.getElementById('resultModal').classList.remove('active');
}

/* ===== 12. التشغيل ===== */
function initGame() {
  generatePlayers();
  renderPlayers();
  updateInfo();
  renderLog();

  // عرض الدور
  const roleInfo = ROLE_INFO[game.me.role];
  document.getElementById('roleDisplay').innerHTML = 
    `${roleInfo.icon} <b>${roleInfo.name}</b>`;

  setPhase('night', 1, 1);
  game.phaseStep = 'intro';

  document.getElementById('mafiaApp').classList.add('active');
  renderActionArea();

  addLog(`🎭 بدأت اللعبة! دورك: ${roleInfo.name}`, 'system');
  addLog(`🎭 ${roleInfo.desc}`, 'system');
}

window.addEventListener('DOMContentLoaded', () => {
  // Splash
  setTimeout(() => {
    document.getElementById('mafiaSplash').classList.add('hide');
    setTimeout(() => {
      // نظهر شاشة التعليمات الأول (بس أول مرة بس)
      const seenTutorial = localStorage.getItem('mafia_tutorial_seen');
      if (!seenTutorial) {
        document.getElementById('tutorialScreen').classList.add('active');
      } else {
        document.getElementById('storyScreen').classList.add('active');
      }
    }, 500);
  }, 2200);

  // زرار التعليمات
  document.getElementById('startAfterTutorialBtn').onclick = () => {
    localStorage.setItem('mafia_tutorial_seen', '1');
    document.getElementById('tutorialScreen').classList.remove('active');
    document.getElementById('storyScreen').classList.add('active');
  };

  // زرار البدء
  document.getElementById('startGameBtn').onclick = () => {
    document.getElementById('storyScreen').classList.remove('active');
    initGame();
  };
});