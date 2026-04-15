const CUSTOMER_POOL = [
  { name: '拿鐵虎斑', avatar: '🐯', quote: '喵，我要濃一點。', order: { coffee: 1 }, reward: 18, rep: 10 },
  { name: '可頌三花', avatar: '🐱', quote: '魚麵包剛出爐最好吃。', order: { bun: 1 }, reward: 16, rep: 9 },
  { name: '伯爵白襪', avatar: '🤍', quote: '咖啡配點小點心最棒。', order: { coffee: 1, bun: 1 }, reward: 32, rep: 16 },
  { name: '社恐黑貓', avatar: '🐈‍⬛', quote: '我想安靜坐窗邊。', order: { coffee: 2 }, reward: 34, rep: 18 },
  { name: '小橘店長粉', avatar: '🧡', quote: '今天也要看店貓表演！', order: { bun: 2 }, reward: 30, rep: 18 },
  { name: '貴族布偶', avatar: '😺', quote: '請給我完整套餐，毛要蓬鬆。', order: { coffee: 2, bun: 1 }, reward: 48, rep: 24 }
];

const RESIDENT_CATS = [
  { name: '奶泡', avatar: '🐈', perk: '摸摸後讓下一位客人更有耐心。' },
  { name: '焦糖', avatar: '🐈‍⬛', perk: '人氣加成，讓宣傳更有效。' },
  { name: '麻糬', avatar: '🐱', perk: '店長休息時幫忙穩住氣氛。' }
];

const UPGRADE_DEFS = [
  { id: 'grinder', name: '升級磨豆機', cost: 60, desc: '每次煮咖啡改為 +2 杯。', apply: (s) => { s.brewPower = 2; } },
  { id: 'oven', name: '添購烤箱', cost: 70, desc: '每次烤魚麵包改為 +2 份。', apply: (s) => { s.bakePower = 2; } },
  { id: 'helper', name: '聘請貓店員', cost: 90, desc: '每 12 秒自動補 1 杯咖啡與 1 份麵包。', apply: (s) => { s.helper = true; } },
  { id: 'decor', name: '打造療癒角落', cost: 120, desc: '所有客人耐心 +18，人氣獎勵 +20%。', apply: (s) => { s.decor = true; } },
  { id: 'vip', name: '會員肉泥方案', cost: 150, desc: '客單價提高，完成訂單額外獲得 8 金幣。', apply: (s) => { s.vip = true; } },
  { id: 'festival', name: '街角貓祭活動', cost: 220, desc: '今日人氣目標 +40，但每位客人收益大幅提升。', apply: (s) => { s.festival = true; s.goal += 40; } }
];

// 動作時間配置 (毫秒)
const ACTION_TIMES = {
  brew: 1200,
  bake: 1500,
  pet: 800,
  restock: 1000,
  promo: 1200,
  nap: 2000
};

const state = {};
let tickHandle = null;
let audioTextEnabled = true;
let activeActions = new Set();

const els = {
  statsGrid: document.getElementById('statsGrid'),
  goalLabel: document.getElementById('goalLabel'),
  goalFill: document.getElementById('goalFill'),
  dayLabel: document.getElementById('dayLabel'),
  timerLabel: document.getElementById('timerLabel'),
  queueCount: document.getElementById('queueCount'),
  ordersList: document.getElementById('ordersList'),
  upgradesList: document.getElementById('upgradesList'),
  logList: document.getElementById('logList'),
  residentCats: document.getElementById('residentCats'),
  headlineText: document.getElementById('headlineText'),
  restartBtn: document.getElementById('restartBtn'),
  muteBtn: document.getElementById('muteBtn'),
  orderCardTemplate: document.getElementById('orderCardTemplate'),
  // 新增結算元素
  summaryModal: document.getElementById('summaryModal'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryStats: document.getElementById('summaryStats'),
  summaryMessage: document.getElementById('summaryMessage'),
  nextDayBtn: document.getElementById('nextDayBtn')
};

function saveGame() {
  localStorage.setItem('catCafeSave', JSON.stringify({
    coins: state.coins,
    day: state.day,
    reputation: state.reputation,
    upgrades: state.upgrades,
    brewPower: state.brewPower,
    bakePower: state.bakePower,
    helper: state.helper,
    decor: state.decor,
    vip: state.vip,
    festival: state.festival
  }));
}

function loadGame() {
  const saved = localStorage.getItem('catCafeSave');
  if (saved) {
    const data = jsonParse(saved);
    Object.assign(state, data);
  }
}

function jsonParse(str) {
  try { return JSON.parse(str); } catch(e) { return null; }
}

function resetGame(fullReset = false) {
  if (fullReset) {
    localStorage.removeItem('catCafeSave');
  }

  const baseState = {
    coins: 80,
    beans: 8,
    milk: 8,
    fish: 6,
    catnip: 3,
    coffee: 0,
    bun: 0,
    reputation: 0,
    energy: 100,
    day: 1,
    minutes: 8 * 60,
    queue: [],
    logs: [],
    upgrades: [],
    helper: false,
    decor: false,
    vip: false,
    festival: false,
    brewPower: 1,
    bakePower: 1,
    promoCooldown: 0,
    petCooldown: 0,
    nextCustomerAt: 15,
    helperTick: 12,
    goal: 120,
    gameOver: false,
    todayCoins: 0,
    todayOrders: 0
  };

  Object.assign(state, baseState);
  loadGame();

  // 每一天的人氣目標會隨天數增長
  state.goal = 120 + (state.day - 1) * 40;
  state.minutes = 8 * 60;
  state.queue = [];
  state.todayCoins = 0;
  state.todayOrders = 0;
  state.gameOver = false;
  activeActions.clear();
  
  // 清除所有進度條
  document.querySelectorAll('.btn-progress').forEach(el => el.style.width = '0%');

  els.summaryModal.classList.add('hidden');
  addLog(`🐾 第 ${state.day} 天開店！奶泡已經在窗邊曬太陽。`, '開店');
  setHeadline('新的一天開始了，準備迎接客人吧。');
  render();
  startLoop();
}

function startLoop() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(gameTick, 1000);
}

function gameTick() {
  if (state.gameOver) return;
  advanceClock(5); // 每一秒遊戲內經過 5 分鐘
  state.energy = clamp(state.energy - 0.5, 0, 100);
  state.promoCooldown = Math.max(0, state.promoCooldown - 1);
  state.petCooldown = Math.max(0, state.petCooldown - 1);
  state.nextCustomerAt -= 1;
  state.helperTick -= 1;

  if (state.helper && state.helperTick <= 0) {
    state.coffee += 1;
    state.bun += 1;
    state.helperTick = 12;
    addLog('🐈 店員貓悄悄補好了一份飲品和點心。', '貓店員');
  }

  state.queue.forEach((customer) => {
    customer.patience -= 5;
  });

  const impatient = state.queue.filter((customer) => customer.patience <= 0);
  if (impatient.length) {
    impatient.forEach((customer) => {
      state.reputation = Math.max(0, state.reputation - 10);
      addLog(`${customer.avatar} ${customer.name} 等太久離開了。`, '客人流失');
    });
    state.queue = state.queue.filter((customer) => customer.patience > 0);
  }

  if (state.nextCustomerAt <= 0) {
    spawnCustomer();
  }

  if (state.energy <= 0) {
    state.reputation = Math.max(0, state.reputation - 2);
    setHeadline('你太累了，動作變得非常緩慢。');
  }

  if (state.minutes >= 20 * 60) {
    endDay();
  }

  render();
}

function advanceClock(minutes) {
  state.minutes += minutes;
}

function spawnCustomer() {
  if (state.queue.length >= 5) {
    state.nextCustomerAt = 5;
    return;
  }
  const base = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
  const patienceBoost = state.decor ? 20 : 0;
  const customer = {
    ...structuredClone(base),
    patience: 80 + Math.floor(Math.random() * 40) + patienceBoost,
    id: crypto.randomUUID()
  };
  state.queue.push(customer);
  state.nextCustomerAt = Math.max(5, 15 - Math.floor(state.reputation / 50)) + Math.floor(Math.random() * 5);
  addLog(`${customer.avatar} ${customer.name} 進店。`, '新客人');
  render();
}

function performAction(action) {
  if (state.gameOver || activeActions.has(action)) return;

  const costMap = {
    brew: { beans: 1, milk: 1 },
    bake: { fish: 1 },
    restock: { coins: 25 },
    promo: {},
    pet: { catnip: 1 },
    nap: {}
  };

  const cost = costMap[action];
  if (!canAfford(cost)) {
    return failAction('資源不足。');
  }

  // 開始動作
  activeActions.add(action);
  const btn = document.querySelector(`.action-btn[data-action="${action}"]`);
  const progressEl = btn.querySelector('.btn-progress');
  const duration = ACTION_TIMES[action] * (state.energy <= 0 ? 2 : 1);
  
  let startTime = Date.now();
  
  const updateProgress = () => {
    let elapsed = Date.now() - startTime;
    let pct = Math.min(100, (elapsed / duration) * 100);
    progressEl.style.width = `${pct}%`;
    
    if (elapsed < duration) {
      requestAnimationFrame(updateProgress);
    } else {
      finalizeAction(action, cost);
      activeActions.delete(action);
      setTimeout(() => { progressEl.style.width = '0%'; }, 200);
      render();
    }
  };
  
  requestAnimationFrame(updateProgress);
}

function finalizeAction(action, cost) {
  spend(cost);
  const logic = {
    brew: () => {
      state.coffee += state.brewPower;
      state.energy -= 4;
      addLog(`☕ 煮好了 ${state.brewPower} 杯咖啡。`, '吧台');
    },
    bake: () => {
      state.bun += state.bakePower;
      state.energy -= 3;
      addLog(`🥐 烤好了 ${state.bakePower} 份魚麵包。`, '廚房');
    },
    restock: () => {
      state.beans += 5; state.milk += 5; state.fish += 4; state.catnip += 1;
      addLog('📦 補貨完成。', '補貨');
    },
    promo: () => {
      state.promoCooldown = 12;
      state.reputation += state.decor ? 25 : 15;
      state.energy -= 5;
      addLog('📣 宣傳大幅提升人氣。', '宣傳');
    },
    pet: () => {
      state.petCooldown = 8;
      state.reputation += 8;
      state.queue.forEach(c => c.patience += 15);
      state.energy += 5;
      addLog('🐾 摸摸店貓，大家都很開心。', '店貓互動');
    },
    nap: () => {
      state.energy = clamp(state.energy + 30, 0, 100);
      advanceClock(20);
      addLog('😴 休息後體力充沛。', '休息');
    }
  };
  logic[action]();
  saveGame();
}

function canAfford(costs) {
  return Object.entries(costs).every(([key, value]) => state[key] >= value);
}

function spend(costs) {
  Object.entries(costs).forEach(([key, value]) => {
    state[key] -= value;
  });
}

function failAction(reason) {
  addLog(`⚠️ ${reason}`, '失敗');
}

function serveCustomer(id) {
  if (state.gameOver) return;
  const customer = state.queue.find((entry) => entry.id === id);
  if (!customer) return;
  const need = { coffee: customer.order.coffee || 0, bun: customer.order.bun || 0 };
  
  if (state.coffee < need.coffee || state.bun < need.bun) {
    failAction(`庫存不足。`);
    return;
  }

  state.coffee -= need.coffee;
  state.bun -= need.bun;
  const coinGain = customer.reward + (state.vip ? 8 : 0);
  state.coins += coinGain;
  state.todayCoins += coinGain;
  state.todayOrders += 1;
  state.reputation += Math.round(customer.rep * (state.decor ? 1.2 : 1));
  state.energy -= 2;
  state.queue = state.queue.filter((entry) => entry.id !== id);

  addLog(`${customer.avatar} 已服務，獲得 ${coinGain} 金。`, '完成訂單');
  saveGame();
  render();
}

function buyUpgrade(id) {
  const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
  if (!upgrade || state.upgrades.includes(id) || state.coins < upgrade.cost) return;
  
  state.coins -= upgrade.cost;
  state.upgrades.push(id);
  upgrade.apply(state);
  addLog(`✨ 已解鎖 ${upgrade.name}。`, '升級');
  saveGame();
  render();
}

function endDay() {
  state.gameOver = true;
  if (tickHandle) clearInterval(tickHandle);
  
  const reached = state.reputation >= state.goal;
  els.summaryTitle.textContent = reached ? '🎊 今日營運大成功！' : '🌙 今日營業結束';
  
  els.summaryStats.innerHTML = `
    <div class="summary-item"><label>今日營收</label><span>${state.todayCoins} 金</span></div>
    <div class="summary-item"><label>服務貓數</label><span>${state.todayOrders} 位</span></div>
    <div class="summary-item"><label>當前人氣</label><span>${state.reputation}</span></div>
    <div class="summary-item"><label>累積資產</label><span>${state.coins} 金</span></div>
  `;
  
  els.summaryMessage.textContent = reached 
    ? `你成功達成了 ${state.goal} 人氣目標！店裡的聲譽正穩定增長。`
    : `雖然今天沒達到 ${state.goal} 人氣目標，但累積的經驗會讓明天更好。`;
  
  state.day += 1;
  saveGame();
  
  els.summaryModal.classList.remove('hidden');
}

function render() {
  const stats = [
    ['金幣', `${state.coins}`],
    ['咖啡庫存', `${state.coffee}`],
    ['魚麵包庫存', `${state.bun}`],
    ['豆子 / 牛奶', `${state.beans} / ${state.milk}`],
    ['魚肉 / 貓草', `${state.fish} / ${state.catnip}`],
    ['店長體力', `${Math.floor(state.energy)}%`],
    ['人氣', `${state.reputation}`],
    ['已解鎖升級', `${state.upgrades.length}`]
  ];

  els.statsGrid.innerHTML = stats.map(([label, value]) => `
    <div class="stat-card"><p>${label}</p><strong>${value}</strong></div>
  `).join('');

  els.goalLabel.textContent = `${state.reputation} / ${state.goal}`;
  els.goalFill.style.width = `${Math.min(100, (state.reputation / state.goal) * 100)}%`;
  els.dayLabel.textContent = `Day ${state.day}`;
  els.timerLabel.textContent = String(Math.floor(state.minutes / 60)).padStart(2, '0') + ':' + String(state.minutes % 60).padStart(2, '0');
  
  els.queueCount.textContent = `${state.queue.length} 位`;
  renderOrders();
  renderUpgrades();
  renderLog();
  
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.disabled = state.gameOver || activeActions.has(btn.dataset.action);
    if (btn.dataset.action === 'promo' && state.promoCooldown > 0) btn.disabled = true;
    if (btn.dataset.action === 'pet' && state.petCooldown > 0) btn.disabled = true;
  });
}

function renderOrders() {
  if (!state.queue.length) {
    els.ordersList.innerHTML = '<div class="empty">目前沒有客貓。</div>';
    return;
  }
  els.ordersList.innerHTML = '';
  state.queue.forEach((customer) => {
    const frag = els.orderCardTemplate.content.cloneNode(true);
    frag.querySelector('.order-name').textContent = `${customer.avatar} ${customer.name}`;
    frag.querySelector('.order-quote').textContent = customer.quote;
    frag.querySelector('.order-patience').textContent = `耐心 ${customer.patience}`;
    const tagsEl = frag.querySelector('.order-tags');
    tagsEl.innerHTML = (customer.order.coffee ? `<span class="tag">咖啡 x${customer.order.coffee}</span>` : '') +
                       (customer.order.bun ? `<span class="tag">魚麵包 x${customer.order.bun}</span>` : '') +
                       `<span class="tag">獎勵 ${customer.reward} 金</span>`;
    frag.querySelector('.serve-btn').addEventListener('click', () => serveCustomer(customer.id));
    els.ordersList.appendChild(frag);
  });
}

function renderUpgrades() {
  els.upgradesList.innerHTML = UPGRADE_DEFS.map((upgrade) => {
    const owned = state.upgrades.includes(upgrade.id);
    return `<article class="upgrade-card ${owned ? '' : 'locked'}">
      <div class="upgrade-top"><div><h3 class="upgrade-name">${upgrade.name}</h3><p class="upgrade-desc">${upgrade.desc}</p></div><span class="badge">${upgrade.cost} 金</span></div>
      <button ${owned || state.coins < upgrade.cost ? 'disabled' : ''} onclick="buyUpgrade('${upgrade.id}')">${owned ? '已擁有' : '購買'}</button>
    </article>`;
  }).join('');
}

function renderLog() {
  els.logList.innerHTML = state.logs.map((entry) => `
    <article class="log-entry"><strong>${entry.title}</strong><div>${entry.message}</div></article>
  `).join('');
}

document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', () => performAction(btn.dataset.action));
});

els.restartBtn.addEventListener('click', () => resetGame(true));
els.nextDayBtn.addEventListener('click', () => resetGame(false));
els.residentCats.innerHTML = RESIDENT_CATS.map(cat => `<article class="cat-card"><div class="cat-avatar">${cat.avatar}</div><h3>${cat.name}</h3><p>${cat.perk}</p></article>`).join('');

resetGame();