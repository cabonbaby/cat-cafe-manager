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

const state = {};
let tickHandle = null;
let audioTextEnabled = true;

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
  orderCardTemplate: document.getElementById('orderCardTemplate')
};

function resetGame() {
  Object.assign(state, {
    coins: 80,
    beans: 8,
    milk: 8,
    fish: 6,
    catnip: 3,
    coffee: 0,
    bun: 0,
    reputation: 0,
    energy: 82,
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
    nextCustomerAt: 30,
    helperTick: 12,
    goal: 120,
    gameOver: false
  });

  addLog('🐾 新的一天開始，奶泡已經在窗邊曬太陽。', '開店');
  setHeadline('先存一些咖啡和魚麵包，第一波客人快到了。');
  render();
  startLoop();
}

function startLoop() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = setInterval(gameTick, 1000);
}

function gameTick() {
  if (state.gameOver) return;
  advanceClock(10);
  state.energy = clamp(state.energy - 1, 0, 100);
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
    customer.patience -= 8;
  });

  const impatient = state.queue.filter((customer) => customer.patience <= 0);
  if (impatient.length) {
    impatient.forEach((customer) => {
      state.reputation = Math.max(0, state.reputation - 12);
      addLog(`${customer.avatar} ${customer.name} 等太久離開了，人氣下降。`, '客人流失');
    });
    state.queue = state.queue.filter((customer) => customer.patience > 0);
    setHeadline('排隊太久會掉人氣，先處理眼前最急的客人。');
  }

  if (state.nextCustomerAt <= 0) {
    spawnCustomer();
  }

  if (state.energy <= 0) {
    state.energy = 12;
    state.reputation = Math.max(0, state.reputation - 6);
    addLog('😵 店長太累打瞌睡，錯過幾位客人。', '體力不足');
    setHeadline('你太累了，記得偶爾偷睡 10 分鐘。');
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
    state.nextCustomerAt = 6;
    addLog('門口已經很擠，新的貓客人先在外面觀望。', '人潮過多');
    return;
  }
  const base = CUSTOMER_POOL[Math.floor(Math.random() * CUSTOMER_POOL.length)];
  const patienceBoost = state.decor ? 18 : 0;
  const customer = {
    ...structuredClone(base),
    patience: 70 + Math.floor(Math.random() * 30) + patienceBoost,
    id: crypto.randomUUID()
  };
  state.queue.push(customer);
  state.nextCustomerAt = Math.max(4, 12 - Math.min(6, Math.floor(state.reputation / 35))) + Math.floor(Math.random() * 5);
  addLog(`${customer.avatar} ${customer.name} 進店點餐。`, '新客人');
  setHeadline(`${customer.name} 來了，想要 ${describeOrder(customer.order)}。`);
}

function describeOrder(order) {
  const parts = [];
  if (order.coffee) parts.push(`咖啡 x${order.coffee}`);
  if (order.bun) parts.push(`魚麵包 x${order.bun}`);
  return parts.join('、');
}

function addLog(message, title = '消息') {
  const prefix = audioTextEnabled ? '♪ ' : '';
  state.logs.unshift({ id: crypto.randomUUID(), title, message: prefix + message });
  state.logs = state.logs.slice(0, 18);
}

function setHeadline(text) {
  els.headlineText.textContent = text;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canAfford(costs) {
  return Object.entries(costs).every(([key, value]) => state[key] >= value);
}

function spend(costs) {
  Object.entries(costs).forEach(([key, value]) => {
    state[key] -= value;
  });
}

function performAction(action) {
  if (state.gameOver) return;

  const actions = {
    brew: () => {
      const cost = { beans: 1, milk: 1 };
      if (!canAfford(cost)) return failAction('豆子或牛奶不夠了。');
      spend(cost);
      state.coffee += state.brewPower;
      state.energy = clamp(state.energy - 3, 0, 100);
      addLog(`☕ 煮好了 ${state.brewPower} 杯咖啡。`, '吧台');
      setHeadline('香味飄出來了，附近的貓客人正在靠近。');
    },
    bake: () => {
      const cost = { fish: 1 };
      if (!canAfford(cost)) return failAction('魚肉存貨不夠，烤箱空空。');
      spend(cost);
      state.bun += state.bakePower;
      state.energy = clamp(state.energy - 2, 0, 100);
      addLog(`🥐 烤好了 ${state.bakePower} 份魚麵包。`, '廚房');
      setHeadline('魚麵包出爐，店裡的幸福感上升。');
    },
    pet: () => {
      if (state.petCooldown > 0) return failAction('店貓剛剛才被抱抱，先讓牠們休息。');
      state.petCooldown = 6;
      state.catnip = clamp(state.catnip - 1, 0, 99);
      state.reputation += 6;
      state.queue.forEach((customer) => { customer.patience += 10; });
      state.energy = clamp(state.energy + 4, 0, 100);
      addLog('🐾 店貓撒嬌成功，整間店都放鬆下來。', '店貓互動');
      setHeadline('摸摸店貓讓大家心情變好，排隊耐心也增加了。');
    },
    restock: () => {
      const cost = { coins: 24 };
      if (!canAfford(cost)) return failAction('金幣不夠補貨。');
      spend(cost);
      state.beans += 4;
      state.milk += 4;
      state.fish += 3;
      state.catnip += 1;
      addLog('📦 供應商送來新鮮食材和一些貓草。', '補貨');
      setHeadline('補貨完畢，接下來可以衝一波營業。');
    },
    promo: () => {
      if (state.promoCooldown > 0) return failAction('宣傳還在冷卻中。');
      state.promoCooldown = 9;
      const bonus = state.decor ? 22 : 14;
      state.reputation += bonus;
      state.nextCustomerAt = Math.max(2, state.nextCustomerAt - 3);
      state.energy = clamp(state.energy - 4, 0, 100);
      addLog('📣 你發了一則可愛短影片，街坊貓咪開始議論。', '宣傳');
      setHeadline('宣傳奏效，客人很快就會湧進來。');
    },
    nap: () => {
      state.energy = clamp(state.energy + 26, 0, 100);
      advanceClock(10);
      addLog('😴 你躲到後台偷睡 10 分鐘，精神恢復了。', '休息');
      setHeadline('短暫休息後，準備再戰一波晚餐時段。');
    }
  };

  actions[action]?.();
  render();
}

function failAction(reason) {
  addLog(`⚠️ ${reason}`, '失敗');
  setHeadline(reason);
}

function serveCustomer(id) {
  if (state.gameOver) return;
  const customer = state.queue.find((entry) => entry.id === id);
  if (!customer) return;
  const need = {
    coffee: customer.order.coffee || 0,
    bun: customer.order.bun || 0
  };
  if (state.coffee < need.coffee || state.bun < need.bun) {
    failAction(`${customer.name} 的餐點還沒準備好。`);
    render();
    return;
  }

  state.coffee -= need.coffee;
  state.bun -= need.bun;
  const festivalMult = state.festival ? 1.4 : 1;
  const vipBonus = state.vip ? 8 : 0;
  const repGain = Math.round(customer.rep * (state.decor ? 1.2 : 1));
  const coinGain = Math.round(customer.reward * festivalMult) + vipBonus;
  state.coins += coinGain;
  state.reputation += repGain;
  state.energy = clamp(state.energy - 2, 0, 100);
  state.queue = state.queue.filter((entry) => entry.id !== id);

  addLog(`${customer.avatar} ${customer.name} 很滿意地離開，留下 ${coinGain} 金幣。`, '完成訂單');
  setHeadline(`成功服務 ${customer.name}，人氣穩穩上升。`);
  render();
}

function buyUpgrade(id) {
  if (state.gameOver) return;
  const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
  if (!upgrade || state.upgrades.includes(id)) return;
  if (state.coins < upgrade.cost) {
    failAction(`還差 ${upgrade.cost - state.coins} 金幣才能升級。`);
    render();
    return;
  }
  state.coins -= upgrade.cost;
  state.upgrades.push(id);
  upgrade.apply(state);
  addLog(`✨ 已解鎖「${upgrade.name}」。`, '升級完成');
  setHeadline(`${upgrade.name} 生效，經營節奏更順了。`);
  render();
}

function endDay() {
  const reached = state.reputation >= state.goal;
  state.gameOver = true;
  if (tickHandle) clearInterval(tickHandle);
  if (reached) {
    addLog('🏆 今日人氣達標！你的貓咖成了街角最熱門的聚點。', '收店');
    setHeadline('恭喜達標！你可以重新開店挑戰更漂亮的經營路線。');
  } else {
    addLog('🌙 打烊了，今天還差一點人氣目標。再試一次一定能衝上去。', '收店');
    setHeadline('今天差一點就成功，試著更早補貨和升級吧。');
  }
  render();
}

function renderStats() {
  const stats = [
    ['金幣', `${state.coins}`],
    ['咖啡庫存', `${state.coffee}`],
    ['魚麵包庫存', `${state.bun}`],
    ['豆子 / 牛奶', `${state.beans} / ${state.milk}`],
    ['魚肉 / 貓草', `${state.fish} / ${state.catnip}`],
    ['店長體力', `${state.energy}%`],
    ['人氣', `${state.reputation}`],
    ['已解鎖升級', `${state.upgrades.length}`]
  ];

  els.statsGrid.innerHTML = stats.map(([label, value]) => `
    <div class="stat-card">
      <p>${label}</p>
      <strong>${value}</strong>
    </div>
  `).join('');

  els.goalLabel.textContent = `${state.reputation} / ${state.goal}`;
  els.goalFill.style.width = `${Math.min(100, (state.reputation / state.goal) * 100)}%`;
  els.dayLabel.textContent = `Day ${state.day}`;
  els.timerLabel.textContent = formatTime(state.minutes);
  els.queueCount.textContent = `${state.queue.length} 位`;
}

function formatTime(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function renderResidentCats() {
  els.residentCats.innerHTML = RESIDENT_CATS.map((cat) => `
    <article class="cat-card">
      <div class="cat-avatar">${cat.avatar}</div>
      <h3>${cat.name}</h3>
      <p>${cat.perk}</p>
    </article>
  `).join('');
}

function renderOrders() {
  if (!state.queue.length) {
    els.ordersList.innerHTML = '<div class="empty">還沒有客人排隊，趁現在先備餐吧。</div>';
    return;
  }
  els.ordersList.innerHTML = '';
  state.queue.forEach((customer) => {
    const frag = els.orderCardTemplate.content.cloneNode(true);
    frag.querySelector('.order-name').textContent = `${customer.avatar} ${customer.name}`;
    frag.querySelector('.order-quote').textContent = customer.quote;
    frag.querySelector('.order-patience').textContent = `耐心 ${customer.patience}`;
    const tagsEl = frag.querySelector('.order-tags');
    tagsEl.innerHTML = `
      ${(customer.order.coffee ? `<span class="tag">咖啡 x${customer.order.coffee}</span>` : '')}
      ${(customer.order.bun ? `<span class="tag">魚麵包 x${customer.order.bun}</span>` : '')}
      <span class="tag">獎勵 ${customer.reward} 金</span>
    `;
    frag.querySelector('.serve-btn').addEventListener('click', () => serveCustomer(customer.id));
    els.ordersList.appendChild(frag);
  });
}

function renderUpgrades() {
  els.upgradesList.innerHTML = UPGRADE_DEFS.map((upgrade) => {
    const owned = state.upgrades.includes(upgrade.id);
    return `
      <article class="upgrade-card ${owned ? '' : 'locked'}">
        <div class="upgrade-top">
          <div>
            <h3 class="upgrade-name">${upgrade.name}</h3>
            <p class="upgrade-desc">${upgrade.desc}</p>
          </div>
          <span class="badge">${upgrade.cost} 金</span>
        </div>
        <button ${owned ? 'disabled' : ''} data-upgrade="${upgrade.id}">${owned ? '已購買' : '購買升級'}</button>
      </article>
    `;
  }).join('');

  els.upgradesList.querySelectorAll('button[data-upgrade]').forEach((btn) => {
    btn.addEventListener('click', () => buyUpgrade(btn.dataset.upgrade));
  });
}

function renderLog() {
  els.logList.innerHTML = state.logs.map((entry) => `
    <article class="log-entry">
      <strong>${entry.title}</strong>
      <div>${entry.message}</div>
    </article>
  `).join('');
}

function updateActionAvailability() {
  document.querySelectorAll('.action-btn').forEach((btn) => {
    if (state.gameOver) {
      btn.disabled = true;
      return;
    }
    if (btn.dataset.action === 'promo') btn.disabled = state.promoCooldown > 0;
    else if (btn.dataset.action === 'pet') btn.disabled = state.petCooldown > 0;
    else btn.disabled = false;
  });
}

function render() {
  renderStats();
  renderResidentCats();
  renderOrders();
  renderUpgrades();
  renderLog();
  updateActionAvailability();
}

document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', () => performAction(btn.dataset.action));
});

els.restartBtn.addEventListener('click', resetGame);
els.muteBtn.addEventListener('click', () => {
  audioTextEnabled = !audioTextEnabled;
  els.muteBtn.textContent = audioTextEnabled ? '關閉音效文字' : '開啟音效文字';
  addLog(audioTextEnabled ? '🔔 文字音效感回來了。' : '🤫 文字音效感已關閉。', '設定');
  render();
});

resetGame();