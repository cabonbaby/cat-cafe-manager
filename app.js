const CUSTOMER_POOL = [
  { name: '拿鐵虎斑', avatar: '🐯', quote: '喵，我要濃一點。', order: { coffee: 1 }, reward: 18, rep: 10 },
  { name: '可頌三花', avatar: '🐱', quote: '魚麵包剛出爐最好吃。', order: { bun: 1 }, reward: 16, rep: 9 },
  { name: '伯爵白襪', avatar: '🤍', quote: '咖啡配點小點心最棒。', order: { coffee: 1, bun: 1 }, reward: 32, rep: 16 },
  { name: '社恐黑貓', avatar: '🐈‍⬛', quote: '我想安靜坐窗邊。', order: { coffee: 2 }, reward: 34, rep: 18 },
  { name: '小橘店長粉', avatar: '🧡', quote: '今天也要看店貓表演！', order: { bun: 2 }, reward: 30, rep: 18 },
  { name: '貴族布偶', avatar: '😺', quote: '請給我完整套餐，毛要蓬鬆。', order: { coffee: 2, bun: 1 }, reward: 48, rep: 24 },
  // 難度加強：複雜訂單
  { name: '挑嘴暹羅', avatar: '👤', quote: '我只要新鮮的特調奶咖。', order: { coffee: 1, milk: 1 }, reward: 55, rep: 30, complex: true },
  { name: '大胃王緬因', avatar: '🦁', quote: '夾魚的麵包才是極品。', order: { bun: 1, fish: 1 }, reward: 60, rep: 35, complex: true }
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
let isBusy = false;

// 輔助：顯示漂浮文字
function showFloatingText(text, x, y, color = '#fde68a') {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// 輔助：觸發元素彈跳特效
function triggerPop(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.classList.remove('pop-effect');
    void el.offsetWidth;
    el.classList.add('pop-effect');
  }
}

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
  nextDayBtn: document.getElementById('nextDayBtn'),
  // 抽屜相關
  logDrawer: document.getElementById('logDrawer'),
  shopDrawer: document.getElementById('shopDrawer'),
  toggleLogBtn: document.getElementById('toggleLogBtn'),
  toggleShopBtn: document.getElementById('toggleShopBtn'),
  // 像素劇場
  pixelCanvas: document.getElementById('pixelCanvas'),
  // BGM
  bgmBtn: document.getElementById('bgmBtn')
};

// YouTube BGM 系統
let ytPlayer = null;
let bgmPlaying = false;

function initBGM() {
  // 載入 YouTube API
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// YouTube API 回呼 (全域)
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('youtube-player', {
    height: '0',
    width: '0',
    videoId: 'bUQn_VttFe4', // 使用者提供的歌曲 ID
    playerVars: {
      'autoplay': 0,
      'loop': 1,
      'playlist': 'bUQn_VttFe4' // 循環播放需要設定 playlist
    },
    events: {
      'onReady': (event) => {
        event.target.setVolume(40); // 預設音量 40%
      }
    }
  });
};

function toggleBGM() {
  if (!ytPlayer || typeof ytPlayer.playVideo !== 'function') return;

  if (bgmPlaying) {
    ytPlayer.pauseVideo();
    els.bgmBtn.textContent = '🎵 BGM: 關閉';
  } else {
    ytPlayer.playVideo();
    els.bgmBtn.textContent = '🎵 BGM: 播放中';
  }
  bgmPlaying = !bgmPlaying;
}

/** 像素劇場引擎 **/
const ctx = els.pixelCanvas.getContext('2d');
const pixelState = {
  cats: [], // { id, x, targetX, y, color, state: 'walking'|'waiting'|'leaving', tailAngle: 0 }
  counterX: 40,
  spawnX: 240,
  exitX: -40
};

function initPixelScene() {
  setInterval(updatePixelScene, 1000 / 30); // 30 FPS
}

function updatePixelScene() {
  // 清理畫布
  ctx.fillStyle = '#3a3a4a';
  ctx.fillRect(0, 0, 240, 100);

  // 晝夜遮罩 (簡單疊加一層透明色)
  const hour = Math.floor(state.minutes / 60);
  if (hour >= 18 || hour < 8) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
    ctx.fillRect(0, 0, 240, 100);
  }

  // 繪製吧檯
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(0, 60, 45, 40);
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(0, 60, 45, 5);

  // 繪製店長貓
  drawPixelCat(15, 65, '#333', 0, true);

  // 更新並繪製客貓
  pixelState.cats.forEach((pCat) => {
    const customer = state.queue.find(c => c.id === pCat.id);
    
    if (pCat.state === 'waiting') {
      if (!customer) {
        pCat.state = 'leaving';
        pCat.targetX = pixelState.exitX;
        pCat.mood = pCat.served ? 'happy' : 'angry';
      } else {
        const queueIndex = state.queue.findIndex(c => c.id === pCat.id);
        pCat.targetX = pixelState.counterX + 25 + (queueIndex * 35);
        pCat.patience = customer.patience;
        pCat.orderIcon = customer.order.coffee ? '☕' : (customer.order.bun ? '🥐' : '❓');
      }
    }

    // 移動邏輯
    const speed = pCat.state === 'leaving' ? 3.5 : 1.8;
    if (Math.abs(pCat.x - pCat.targetX) > 2) {
      pCat.x += pCat.x < pCat.targetX ? speed : -speed;
      pCat.tailAngle = Math.sin(Date.now() / 100) * 0.6;
    } else if (pCat.state === 'walking') {
      pCat.state = 'waiting';
    } else if (pCat.state === 'leaving' && Math.abs(pCat.x - pixelState.exitX) < 5) {
      pCat.toRemove = true;
    }

    drawPixelCat(pCat.x, pCat.y, pCat.color, pCat.tailAngle, false);
    
    // 繪製願望泡泡或心情
    if (pCat.state === 'waiting') {
      const mood = pCat.patience < 30 ? 'angry' : 'normal';
      drawMoodBubble(pCat.x + 5, pCat.y - 15, pCat.orderIcon, mood);
    } else if (pCat.state === 'leaving') {
      drawMoodBubble(pCat.x + 5, pCat.y - 15, pCat.mood === 'happy' ? '❤️' : '💢', 'normal');
    }
  });

  pixelState.cats = pixelState.cats.filter(c => !c.toRemove);

  // 同步新增貓
  state.queue.forEach((customer) => {
    if (!pixelState.cats.find(c => c.id === customer.id)) {
      pixelState.cats.push({
        id: customer.id,
        x: pixelState.spawnX,
        targetX: pixelState.spawnX,
        y: 65,
        color: ['#ffcc80', '#bcaaa4', '#eeeeee', '#90a4ae'][Math.floor(Math.random()*4)],
        state: 'walking',
        tailAngle: 0,
        served: false,
        mood: 'normal'
      });
    }
  });
}

function drawMoodBubble(x, y, icon, mood) {
  ctx.save();
  ctx.translate(x, y);

  // 泡泡背景
  ctx.fillStyle = mood === 'angry' ? '#ffcdd2' : '#fff';
  ctx.beginPath();
  ctx.roundRect(-10, -10, 20, 16, 4);
  ctx.fill();

  // 泡泡尖角
  ctx.beginPath();
  ctx.moveTo(-2, 6); ctx.lineTo(2, 6); ctx.lineTo(0, 10);
  ctx.fill();

  // 圖示文字
  ctx.fillStyle = '#000';
  ctx.font = '12px serif';
  ctx.textAlign = 'center';
  ctx.fillText(icon, 0, 2);

  ctx.restore();
}

function drawPixelCat(x, y, color, tailAngle, isChef) {
  ctx.save();
  ctx.translate(x, y);
  if (isChef) ctx.scale(-1, 1); // 店長面向右

  // 身體
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 18, 12);
  
  // 尾巴
  ctx.save();
  ctx.translate(18, 10);
  ctx.rotate(tailAngle);
  ctx.fillRect(0, -8, 4, 8);
  ctx.restore();

  // 頭
  ctx.fillRect(-6, -6, 10, 10);
  
  // 耳朵
  ctx.fillRect(-6, -10, 3, 4);
  ctx.fillRect(1, -10, 3, 4);

  // 眼睛
  ctx.fillStyle = '#000';
  ctx.fillRect(-4, -4, 2, 2);
  ctx.fillRect(0, -4, 2, 2);

  ctx.restore();
}

function toggleDrawer(drawer) {
  drawer.classList.toggle('hidden');
}

// 事件綁定
els.toggleLogBtn.addEventListener('click', () => toggleDrawer(els.logDrawer));
els.toggleShopBtn.addEventListener('click', () => toggleDrawer(els.shopDrawer));

document.querySelectorAll('.close-drawer').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.target.closest('.drawer').classList.add('hidden');
  });
});

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
    festival: state.festival,
    rent: state.rent
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
    todayOrders: 0,
    crisisTimer: 0,
    rent: 40
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
  isBusy = false; // 確保重置忙碌狀態
  
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
  state.crisisTimer = Math.max(0, state.crisisTimer - 1);

  if (state.helper && state.helperTick <= 0) {
    state.coffee += 1;
    state.bun += 1;
    state.helperTick = 12;
    addLog('🐈 店員貓悄悄補好了一份飲品和點心。', '貓店員');
  }

  state.queue.forEach((customer) => {
    customer.patience -= 5;
    // 更新畫面上該客人的耐心條
    const card = document.querySelector(`[data-customer-id="${customer.id}"]`);
    if (card) {
      const fill = card.querySelector('.patience-fill');
      const pct = Math.max(0, customer.patience);
      fill.style.width = `${pct}%`;
      if (pct < 30) fill.style.backgroundColor = 'var(--danger)';
      else if (pct < 60) fill.style.backgroundColor = 'var(--gold)';
      else fill.style.backgroundColor = 'var(--mint)';
    }
  });

  const impatient = state.queue.filter((customer) => customer.patience <= 0);
  if (impatient.length) {
    impatient.forEach((customer) => {
      state.reputation = Math.max(0, state.reputation - 15);
      addLog(`${customer.avatar} ${customer.name} 等太久離開了並留下負評。`, '評價危機');
      // 負評危機：凍結新客人
      state.crisisTimer = 12; 
      setHeadline('糟糕！店裡出現了負評，大家暫時不敢進來了。');
    });
    state.queue = state.queue.filter((customer) => customer.patience > 0);
  }

  if (state.nextCustomerAt <= 0 && state.crisisTimer <= 0) {
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
  if (state.gameOver || isBusy) return;

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
  isBusy = true;
  const btn = document.querySelector(`.action-btn[data-action="${action}"]`);
  const progressEl = btn.querySelector('.btn-progress');
  const duration = ACTION_TIMES[action] * (state.energy <= 0 ? 2 : 1);
  
  // 禁用所有按鈕
  render();
  
  let startTime = Date.now();
  
  const updateProgress = () => {
    let elapsed = Date.now() - startTime;
    let pct = Math.min(100, (elapsed / duration) * 100);
    progressEl.style.width = `${pct}%`;
    
    if (elapsed < duration) {
      requestAnimationFrame(updateProgress);
    } else {
      finalizeAction(action, cost);
      isBusy = false;
      setTimeout(() => { progressEl.style.width = '0%'; }, 200);
      render();
    }
  };
  
  requestAnimationFrame(updateProgress);
}

function finalizeAction(action, cost) {
  spend(cost);
  
  const btn = document.querySelector(`.action-btn[data-action="${action}"]`);
  const rect = btn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top;

  const logic = {
    brew: () => {
      state.coffee += state.brewPower;
      state.energy -= 4;
      showFloatingText(`+${state.brewPower} ☕`, centerX, centerY, '#fff');
      triggerPop('.stat-card:nth-child(2)');
      addLog(`☕ 煮好了 ${state.brewPower} 杯咖啡。`, '吧台');
      setHeadline('香味飄出來了，附近客貓正在靠近。');
    },
    bake: () => {
      state.bun += state.bakePower;
      state.energy -= 3;
      showFloatingText(`+${state.bakePower} 🥐`, centerX, centerY, '#fff');
      triggerPop('.stat-card:nth-child(3)');
      addLog(`🥐 烤好了 ${state.bakePower} 份魚麵包。`, '廚房');
      setHeadline('魚麵包出爐，幸福感上升。');
    },
    restock: () => {
      state.beans += 5; state.milk += 5; state.fish += 4; state.catnip += 1;
      showFloatingText(`補貨成功 📦`, centerX, centerY, '#fff');
      addLog('📦 補貨完成。', '補貨');
      setHeadline('材料充足，可以大顯身手。');
    },
    promo: () => {
      state.promoCooldown = 12;
      const gain = state.decor ? 25 : 15;
      state.reputation += gain;
      state.energy -= 5;
      showFloatingText(`+${gain} 人氣 📣`, centerX, centerY, '#fde68a');
      triggerPop('.stat-card:nth-child(7)');
      addLog('📣 宣傳大幅提升人氣。', '宣傳');
      setHeadline('宣傳奏效，客人很快就會湧進來。');
    },
    pet: () => {
      state.petCooldown = 8;
      state.reputation += 8;
      state.queue.forEach(c => c.patience += 15);
      state.energy += 5;
      state.crisisTimer = 0; // 摸摸貓可以解除評價危機
      showFloatingText(`摸摸 🐾`, centerX, centerY, '#ffb7b7');
      addLog('🐾 摸摸店貓，化解了負評危機！', '公關應對');
      setHeadline('摸摸店貓讓大家心情變好，耐心也增加了。');
    },
    nap: () => {
      state.energy = clamp(state.energy + 30, 0, 100);
      advanceClock(20);
      showFloatingText(`Zzz... 😴`, centerX, centerY, '#a78bfa');
      addLog('😴 休息後體力充沛。', '休息');
      setHeadline('精神百倍，準備迎接晚間客群。');
    }
  };
  logic[action]();
  saveGame();
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

function failAction(reason) {
  addLog(`⚠️ ${reason}`, '失敗');
}

function serveCustomer(id) {
  if (state.gameOver) return;
  const customer = state.queue.find((entry) => entry.id === id);
  if (!customer) return;
  
  const need = { 
    coffee: customer.order.coffee || 0, 
    bun: customer.order.bun || 0,
    milk: customer.order.milk || 0,
    fish: customer.order.fish || 0
  };
  
  if (state.coffee < need.coffee || state.bun < need.bun || state.milk < need.milk || state.fish < need.fish) {
    failAction(`資源或預製品不足。`);
    return;
  }

  const card = document.querySelector(`[data-customer-id="${id}"]`);
  const rect = card.getBoundingClientRect();
  showFloatingText(`+${customer.reward} 💰`, rect.left + rect.width / 2, rect.top, '#ffd700');
  triggerPop('.stat-card:nth-child(1)');

  state.coffee -= need.coffee;
  state.bun -= need.bun;
  state.milk -= need.milk;
  state.fish -= need.fish;
  
  const coinGain = customer.reward + (state.vip ? 8 : 0);
  state.coins += coinGain;
  state.todayCoins += coinGain;
  state.todayOrders += 1;
  state.reputation += Math.round(customer.rep * (state.decor ? 1.2 : 1));
  state.energy -= 2;
  
  // 標記像素貓已送餐
  const pCat = pixelState.cats.find(c => c.id === id);
  if (pCat) pCat.served = true;

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
  
  // 1. 租金壓力
  state.coins -= state.rent;
  const isBankrupt = state.coins < 0;
  
  // 2. 鮮度損耗 (沒用完的材料過期)
  const lostMilk = Math.floor(state.milk * 0.4);
  const lostFish = Math.floor(state.fish * 0.4);
  state.milk -= lostMilk;
  state.fish -= lostFish;

  const reached = state.reputation >= state.goal;
  
  if (isBankrupt) {
    els.summaryTitle.textContent = '💸 店鋪破產...';
    els.summaryMessage.textContent = `很遺憾，你無法支付今天的租金 ${state.rent} 金。咖啡店被迫倒閉。`;
    els.nextDayBtn.textContent = '重新開始經營';
    els.nextDayBtn.onclick = () => resetGame(true);
  } else {
    els.summaryTitle.textContent = reached ? '🎊 今日營運大成功！' : '🌙 今日營業結束';
    els.summaryMessage.textContent = `今日付清租金 ${state.rent} 金。` + 
      (lostMilk + lostFish > 0 ? ` 另外有 ${lostMilk} 份牛奶和 ${lostFish} 份魚肉過期丟棄了。` : '') +
      (reached ? ` 你成功達成了 ${state.goal} 人氣目標！` : ` 你沒能達成 ${state.goal} 人氣目標。`);
    
    state.rent += 15; // 租金隨天數增加
    state.day += 1;
    els.nextDayBtn.textContent = '開始下一天';
    els.nextDayBtn.onclick = () => resetGame(false);
  }
  
  els.summaryStats.innerHTML = `
    <div class="summary-item"><label>今日營收</label><span>${state.todayCoins} 金</span></div>
    <div class="summary-item"><label>支付租金</label><span>-${state.rent - 15} 金</span></div>
    <div class="summary-item"><label>服務貓數</label><span>${state.todayOrders} 位</span></div>
    <div class="summary-item"><label>當前資產</label><span>${state.coins} 金</span></div>
  `;
  
  saveGame();
  els.summaryModal.classList.remove('hidden');
}

function updateTheme() {
  const hour = Math.floor(state.minutes / 60);
  const body = document.body;
  
  let theme = 'theme-morning';
  if (hour >= 12 && hour < 17) theme = 'theme-afternoon';
  else if (hour >= 17 && hour < 20) theme = 'theme-evening';
  else if (hour >= 20 || hour < 8) theme = 'theme-night';

  if (!body.classList.contains(theme)) {
    body.classList.remove('theme-morning', 'theme-afternoon', 'theme-evening', 'theme-night');
    body.classList.add(theme);
  }
}

function render() {
  updateTheme();
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
  
  document.querySelectorAll('.actions-grid .action-btn').forEach(btn => {
    btn.disabled = state.gameOver || isBusy;
    if (!isBusy) {
      if (btn.dataset.action === 'promo' && state.promoCooldown > 0) btn.disabled = true;
      if (btn.dataset.action === 'pet' && state.petCooldown > 0) btn.disabled = true;
    }
  });
}

function renderOrders() {
  if (!state.queue.length) {
    els.ordersList.innerHTML = '<div class="empty">目前沒有客貓。</div>';
    return;
  }
  
  // 找出目前 DOM 中已存在的卡片 ID
  const existingIds = Array.from(els.ordersList.querySelectorAll('[data-customer-id]'))
    .map(el => el.dataset.customerId);
  
  // 移除已經不在 queue 裡的卡片
  existingIds.forEach(id => {
    if (!state.queue.find(c => c.id === id)) {
      const el = els.ordersList.querySelector(`[data-customer-id="${id}"]`);
      if (el) el.remove();
    }
  });

  state.queue.forEach((customer) => {
    let card = els.ordersList.querySelector(`[data-customer-id="${customer.id}"]`);
    
    if (!card) {
      const frag = els.orderCardTemplate.content.cloneNode(true);
      card = frag.querySelector('.order-card');
      card.dataset.customerId = customer.id;
      card.querySelector('.order-name').textContent = `${customer.avatar} ${customer.name}`;
      card.querySelector('.order-quote').textContent = customer.quote;
      
      const tagsEl = card.querySelector('.order-tags');
      let tagsHTML = '';
      if (customer.order.coffee) tagsHTML += `<span class="tag">咖啡 x${customer.order.coffee}</span>`;
      if (customer.order.bun) tagsHTML += `<span class="tag">魚麵包 x${customer.order.bun}</span>`;
      if (customer.order.milk) tagsHTML += `<span class="tag">牛奶 x${customer.order.milk}</span>`;
      if (customer.order.fish) tagsHTML += `<span class="tag">鮮魚 x${customer.order.fish}</span>`;
      tagsHTML += `<span class="tag">獎勵 ${customer.reward} 金</span>`;
      
      tagsEl.innerHTML = tagsHTML;
      card.querySelector('.serve-btn').addEventListener('click', () => serveCustomer(customer.id));
      els.ordersList.appendChild(frag);
      
      // 重新取得剛剛 append 進去的 card
      card = els.ordersList.querySelector(`[data-customer-id="${customer.id}"]`);
    }

    // 更新進度條樣式
    const fill = card.querySelector('.patience-fill');
    const pct = Math.max(0, customer.patience);
    fill.style.width = `${pct}%`;
    if (pct < 30) fill.style.backgroundColor = 'var(--danger)';
    else if (pct < 60) fill.style.backgroundColor = 'var(--gold)';
    else fill.style.backgroundColor = 'var(--mint)';
  });
}

function renderUpgrades() {
  els.upgradesList.innerHTML = UPGRADE_DEFS.map((upgrade) => {
    const owned = state.upgrades.includes(upgrade.id);
    return `<article class="upgrade-card ${owned ? '' : 'locked'}">
      <div class="upgrade-top"><div><h3 class="upgrade-name">${upgrade.name}</h3><p class="upgrade-desc">${upgrade.desc}</p></div><span class="badge">${upgrade.cost} 金</span></div>
      <button ${owned || state.coins < upgrade.cost ? 'disabled' : ''} data-upgrade="${upgrade.id}">${owned ? '已擁有' : '購買'}</button>
    </article>`;
  }).join('');

  els.upgradesList.querySelectorAll('button[data-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => buyUpgrade(btn.dataset.upgrade));
  });
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

  // --- 像素劇場互動功能 ---
  els.pixelCanvas.addEventListener('mousemove', (e) => {
    const rect = els.pixelCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (els.pixelCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (els.pixelCanvas.height / rect.height);
    
    // 檢查游標下是否有貓
    const hoveredCat = pixelState.cats.find(c => 
      c.state === 'waiting' && Math.abs(x - (c.x + 8)) < 15 && Math.abs(y - 70) < 20
    );
    els.pixelCanvas.style.cursor = hoveredCat ? 'pointer' : 'default';
  });

  els.pixelCanvas.addEventListener('click', (e) => {
    const rect = els.pixelCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (els.pixelCanvas.width / rect.width);
    
    const clickedCat = pixelState.cats.find(c => 
      c.state === 'waiting' && Math.abs(x - (c.x + 8)) < 15
    );

    if (clickedCat) {
      // 點擊特效
      createClickRipple(e.clientX - rect.left, e.clientY - rect.top);
      // 執行送餐
      serveCustomer(clickedCat.id);
    }
  });

  function createClickRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    els.pixelCanvas.parentElement.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }
  // ---------------------------

  initPixelScene();
  els.bgmBtn.addEventListener('click', toggleBGM);
  initBGM();
  resetGame();
