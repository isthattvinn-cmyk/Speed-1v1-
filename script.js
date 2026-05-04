const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.getElementById("minimap-canvas");
const miniCtx = miniCanvas.getContext("2d");

const refs = {
  partyCode: document.getElementById("party-code"),
  timer: document.getElementById("timer"),
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  serverStatus: document.getElementById("server-status"),
  versionLabel: document.getElementById("version-label"),
  playerList: document.getElementById("player-list"),
  seedButton: document.getElementById("seed-button"),
  spectatePanel: document.getElementById("spectate-panel"),
  spectateName: document.getElementById("spectate-name"),
  overlay: document.getElementById("overlay"),
  message: document.getElementById("message"),
  accountUsername: document.getElementById("account-username"),
  accountPassword: document.getElementById("account-password"),
  playerColor: document.getElementById("player-color"),
  accountMessage: document.getElementById("account-message"),
  loginBtn: document.getElementById("login-btn"),
  signupBtn: document.getElementById("signup-btn"),
  rewardsBtn: document.getElementById("rewards-btn"),
  profileBtn: document.getElementById("profile-btn"),
  createForm: document.getElementById("create-form"),
  joinForm: document.getElementById("join-form"),
  soloBtn: document.getElementById("solo-btn"),
  dailyBtn: document.getElementById("daily-btn"),
  enduranceBtn: document.getElementById("endurance-btn"),
  hostName: document.getElementById("host-name"),
  guestName: document.getElementById("guest-name"),
  joinCode: document.getElementById("join-code"),
  lengthSelect: document.getElementById("length-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  leaveBtn: document.getElementById("leave-btn"),
  startRaceBtn: document.getElementById("start-race-btn"),
  preSpectateBtn: document.getElementById("pre-spectate-btn"),
  resultsPanel: document.getElementById("results-panel"),
  resultsList: document.getElementById("results-list"),
  rematchBtn: document.getElementById("rematch-btn"),
  closeResultsBtn: document.getElementById("close-results-btn"),
  rewardsPanel: document.getElementById("rewards-panel"),
  closeRewardsBtn: document.getElementById("close-rewards-btn"),
  rewardSummary: document.getElementById("reward-summary"),
  rewardsList: document.getElementById("rewards-list"),
  profilePanel: document.getElementById("profile-panel"),
  closeProfileBtn: document.getElementById("close-profile-btn"),
  profileCard: document.getElementById("profile-card"),
  badgeList: document.getElementById("badge-list"),
  levelLeaderboard: document.getElementById("level-leaderboard"),
  chatPanel: document.getElementById("chat-panel"),
  chatLog: document.getElementById("chat-log"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  leaderboardPanel: document.getElementById("leaderboard-panel"),
  leaderboardList: document.getElementById("leaderboard-list"),
  transitionOverlay: document.getElementById("transition-overlay"),
  transitionText: document.getElementById("transition-text"),
  countdownText: document.getElementById("countdown-text")
};

const LOBBY_PREFIX = "cave-swinger-lobby-";
const SERVER_URL = "wss://speed-1v1.onrender.com";
const BUILD_VERSION = "v0.4.0";
const ACCOUNT_KEY = "cave-swinger-accounts-v1";
const CURRENT_ACCOUNT_KEY = "cave-swinger-current-account-v1";
const WIN_XP = 100;
const XP_PER_LEVEL = 100;
const MAX_LEVEL = 100;
const TARGET_FPS = 60;
const GRAVITY = 0.45;
const CENTER_PULL = GRAVITY * 0.15;
const AIR_RESISTANCE = 0.9995;
const SWING_FORCE = 0.315;
const AIR_STRAFE_FORCE = 0.5625;
const CLIMB_SPEED = 8.0;
const TENSION_ELASTICITY = 0.05;
const TILE_SIZE = 60;
const BASE_GRID_WIDTH = 450;
const LOBBY_LENGTH_SCALE = 0.5;
const GRID_HEIGHT = 160;
const PLAYER_COLORS = ["#ff4b5c", "#4ecca3", "#f9d423", "#64b5f6"];
const PHASE = {
  MENU: "MENU",
  LOBBY: "LOBBY",
  LOADING: "LOADING",
  COUNTDOWN: "COUNTDOWN",
  RACING: "RACING"
};
const COUNTDOWN_MS = 15000;
const LOAD_FADE_MS = 900;
const SERVER_CONNECT_TIMEOUT_MS = 65000;
const PING_INTERVAL_MS = 4000;
const DAILY_LENGTH_SCALE = 1;
const SOLO_GHOST_KEY = "cave-swinger-ghosts-v1";
const SOLO_QUESTS = [
  { id: "finish3", label: "Finish 3 solo runs", target: 3, xp: 150 },
  { id: "hard1", label: "Finish 1 hard solo run", target: 1, xp: 200 },
  { id: "clean1", label: "Finish a no-respawn solo run", target: 1, xp: 175 }
];
const LEVEL_TITLES = [
  [1, "Rookie Swinger"],
  [10, "Cave Runner"],
  [25, "Momentum Scout"],
  [50, "Velocity Ace"],
  [75, "Apex Diver"],
  [100, "Cave Legend"]
];
const PROFILE_BORDERS = [
  [1, "Stone Frame"],
  [10, "Moss Frame"],
  [25, "Neon Frame"],
  [50, "Gold Frame"],
  [75, "Prismatic Frame"],
  [100, "Legend Frame"]
];
const MILESTONE_BADGES = [
  { id: "wins10", label: "10 Wins", test: (a) => a.totalWins >= 10 },
  { id: "races100", label: "100 Races", test: (a) => a.totalRaces >= 100 },
  { id: "solo50", label: "50 Solo Finishes", test: (a) => a.soloRuns >= 50 },
  { id: "streak5", label: "5 Win Streak", test: (a) => a.bestWinStreak >= 5 },
  { id: "level50", label: "Level 50", test: (a) => getLevelFromXp(a.xp) >= 50 },
  { id: "level100", label: "Level 100", test: (a) => getLevelFromXp(a.xp) >= 100 }
];

let gridWidth = BASE_GRID_WIDTH;
let gameState = PHASE.MENU;
let lastTime = performance.now();
let cameraX = 0;
let cameraY = 0;
let particles = [];
let tiles = [];
let cavePath = [];
let checkpoints = [];
let exitPortal = null;
let keys = {};
let mouseX = 0;
let mouseY = 0;
let channel = null;
let socket = null;
let serverConnected = false;
let pingTimer = null;
let pendingPingAt = 0;
let lobby = null;
let transitionTimer = null;
let currentAccount = null;
let spectating = false;
let preGameSpectating = false;
let spectateIndex = 0;
let resultsShownForWinner = null;
let chatMessages = [];
let leaderboardEntries = [];
let countedRaceKey = null;
let runStats = createRunStats();
let ghostSamples = [];
let activeGhost = [];

const player = {
  id: "",
  name: "Runner",
  color: PLAYER_COLORS[0],
  x: 0,
  y: 0,
  width: 28,
  height: 28,
  velX: 0,
  velY: 0,
  isAttached: false,
  anchorX: 0,
  anchorY: 0,
  ropeLength: 0,
  checkpointIndex: 0,
  finished: false,
  finishTime: null,
  level: 1,
  xp: 0,
  totalWins: 0,
  totalRaces: 0,
  winStreak: 0,
  bestWinStreak: 0,
  bestTimes: {},
  ping: null,
  winRewarded: false
};

const remotePlayers = new Map();

function createId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`;
}

function createCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function createRunStats() {
  return {
    startedAt: 0,
    checkpointsReached: 0,
    respawns: 0,
    maxSpeed: 0,
    combo: 0,
    bestCombo: 0,
    lastGhostSampleAt: 0,
    mode: "race",
    xpSummary: null
  };
}

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
}

function getLevelFromXp(xp = 0) {
  return Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(xp || 0) / XP_PER_LEVEL) + 1));
}

function getTitleForLevel(level) {
  return LEVEL_TITLES.reduce((title, item) => level >= item[0] ? item[1] : title, LEVEL_TITLES[0][1]);
}

function getBorderForLevel(level) {
  return PROFILE_BORDERS.reduce((border, item) => level >= item[0] ? item[1] : border, PROFILE_BORDERS[0][1]);
}

function getRewardForLevel(level) {
  if (level === 100) return "Legend Frame + Cave Legend title";
  if (level % 10 === 0) return `${getBorderForLevel(level)} + rare drop roll`;
  if (level % 5 === 0) return `Milestone reward + ${getTitleForLevel(level)} title progress`;
  if (level % 3 === 0) return "New player color preset";
  return "XP progress + profile glow charge";
}

function normalizeAccount(account) {
  return {
    password: account?.password || "",
    color: account?.color || refs.playerColor.value || PLAYER_COLORS[0],
    xp: Number(account?.xp || 0),
    totalWins: Number(account?.totalWins || 0),
    totalRaces: Number(account?.totalRaces || 0),
    winStreak: Number(account?.winStreak || 0),
    bestWinStreak: Number(account?.bestWinStreak || 0),
    bestTimes: account?.bestTimes || {},
    soloRuns: Number(account?.soloRuns || 0),
    soloCrashes: Number(account?.soloCrashes || 0),
    soloBestCombo: Number(account?.soloBestCombo || 0),
    dailyStreak: Number(account?.dailyStreak || 0),
    lastSoloDate: account?.lastSoloDate || "",
    quests: account?.quests || {},
    drops: account?.drops || [],
    teamXp: Number(account?.teamXp || 0)
  };
}

function getCurrentAccountStats() {
  if (!currentAccount) {
    return { xp: 0, level: 1 };
  }

  const account = normalizeAccount(loadAccounts()[currentAccount]);
  return {
    xp: account.xp,
    level: getLevelFromXp(account.xp),
    totalWins: account.totalWins,
    totalRaces: account.totalRaces,
    winStreak: account.winStreak,
    bestWinStreak: account.bestWinStreak,
    bestTimes: account.bestTimes,
    soloRuns: account.soloRuns,
    soloCrashes: account.soloCrashes,
    soloBestCombo: account.soloBestCombo,
    dailyStreak: account.dailyStreak,
    quests: account.quests,
    drops: account.drops,
    teamXp: account.teamXp
  };
}

function syncPlayerProfileFromAccount() {
  const stats = getCurrentAccountStats();
  player.xp = stats.xp;
  player.level = stats.level;
  player.totalWins = stats.totalWins || 0;
  player.totalRaces = stats.totalRaces || 0;
  player.winStreak = stats.winStreak || 0;
  player.bestWinStreak = stats.bestWinStreak || 0;
  player.bestTimes = stats.bestTimes || {};
}

function updateAccountMessage() {
  if (!currentAccount) {
    refs.accountMessage.textContent = "Local account saves on this browser. Cross-device lobbies need a realtime server.";
    return;
  }

  const stats = getCurrentAccountStats();
  const nextLevelXp = Math.min(MAX_LEVEL - 1, stats.level) * XP_PER_LEVEL;
  const progress = stats.level >= MAX_LEVEL ? "MAX" : `${stats.xp}/${nextLevelXp} XP`;
  refs.accountMessage.textContent = `Logged in as ${currentAccount}. ${getTitleForLevel(stats.level)} - Level ${stats.level} - ${progress}. Wins ${stats.totalWins || 0}, solo ${stats.soloRuns || 0}, daily x${stats.dailyStreak || 0}.`;
}

function setCurrentAccount(username) {
  const accounts = loadAccounts();
  accounts[username] = normalizeAccount(accounts[username]);
  saveAccounts(accounts);
  currentAccount = username;
  localStorage.setItem(CURRENT_ACCOUNT_KEY, username);
  refs.hostName.value = username;
  refs.guestName.value = username;
  refs.accountUsername.value = username;
  refs.accountPassword.value = "";
  if (accounts[username]?.color) {
    refs.playerColor.value = accounts[username].color;
  }
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function createAccount() {
  const username = refs.accountUsername.value.trim();
  const password = refs.accountPassword.value;

  if (!username || !password) {
    refs.accountMessage.textContent = "Enter a username and password.";
    return;
  }

  const accounts = loadAccounts();
  if (accounts[username]) {
    refs.accountMessage.textContent = "That username already exists on this browser.";
    return;
  }

  accounts[username] = { password, color: refs.playerColor.value, xp: 0, totalWins: 0, totalRaces: 0, winStreak: 0, bestWinStreak: 0, bestTimes: {}, soloRuns: 0, soloCrashes: 0, soloBestCombo: 0, dailyStreak: 0, lastSoloDate: "", quests: {}, drops: [], teamXp: 0 };
  saveAccounts(accounts);
  setCurrentAccount(username);
}

function loginAccount() {
  const username = refs.accountUsername.value.trim();
  const password = refs.accountPassword.value;
  const accounts = loadAccounts();

  if (!accounts[username] || accounts[username].password !== password) {
    refs.accountMessage.textContent = "Username or password did not match.";
    return;
  }

  setCurrentAccount(username);
}

function updateAccountColor() {
  player.color = refs.playerColor.value;

  if (currentAccount) {
    const accounts = loadAccounts();
    if (accounts[currentAccount]) {
      accounts[currentAccount] = {
        ...normalizeAccount(accounts[currentAccount]),
        color: refs.playerColor.value
      };
      saveAccounts(accounts);
    }
  }

  syncPlayerProfileFromAccount();
  saveLobby();
  broadcast("player-update", { player: snapshotPlayer(player) });
  renderLobbyList();
}

function restoreAccount() {
  const username = localStorage.getItem(CURRENT_ACCOUNT_KEY);
  const accounts = loadAccounts();
  if (username && accounts[username]) {
    setCurrentAccount(username);
  }
}

function createSeed() {
  return Math.floor(100000000 + Math.random() * 900000000);
}

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function readLobby(code) {
  try {
    return JSON.parse(localStorage.getItem(`${LOBBY_PREFIX}${code}`));
  } catch (error) {
    return null;
  }
}

function saveLobby() {
  if (!lobby || lobby.code === "SOLO") return;

  localStorage.setItem(`${LOBBY_PREFIX}${lobby.code}`, JSON.stringify({
    code: lobby.code,
    lengthScale: lobby.lengthScale,
    difficulty: lobby.difficulty,
    createdAt: lobby.createdAt,
    startTime: lobby.startTime,
    phase: lobby.phase,
    lobbySeed: lobby.lobbySeed,
    raceSeed: lobby.raceSeed,
    loadingStartedAt: lobby.loadingStartedAt,
    countdownStartedAt: lobby.countdownStartedAt,
    raceStartedAt: lobby.raceStartedAt,
    chatMessages,
    winner: lobby.winner,
    hostId: lobby.hostId,
    players: [snapshotPlayer(player), ...remotePlayers.values()].map((item) => ({
      ...item,
      lastSeen: Date.now()
    }))
  }));
}

function snapshotPlayer(source) {
  return {
    id: source.id,
    name: source.name,
    color: source.color,
    x: source.x,
    y: source.y,
    width: source.width,
    height: source.height,
    velX: source.velX,
    velY: source.velY,
    isAttached: source.isAttached,
    anchorX: source.anchorX,
    anchorY: source.anchorY,
    ropeLength: source.ropeLength,
    checkpointIndex: source.checkpointIndex,
    finished: source.finished,
    finishTime: source.finishTime,
    level: source.level || 1,
    xp: source.xp || 0,
    totalWins: source.totalWins || 0,
    totalRaces: source.totalRaces || 0,
    winStreak: source.winStreak || 0,
    bestWinStreak: source.bestWinStreak || 0,
    ping: source.ping ?? null,
    spectator: Boolean(source.spectator || preGameSpectating),
    progress: exitPortal ? Math.max(0, Math.min(100, Math.floor((source.x / exitPortal.x) * 100))) : 0,
    lastSeen: Date.now()
  };
}

function setupChannel(code) {
  if (channel) channel.close();
  if (!("BroadcastChannel" in window) || code === "SOLO") {
    channel = null;
    return;
  }

  channel = new BroadcastChannel(`cave-swinger-${code}`);
  channel.addEventListener("message", (event) => {
    handleRealtimeMessage(event.data);
  });
}

function connectServer() {
  return new Promise((resolve) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      serverConnected = true;
      setServerStatus("Online");
      resolve(true);
      return;
    }

    if (socket && socket.readyState === WebSocket.CONNECTING) {
      const startedAt = Date.now();
      const check = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          clearInterval(check);
          serverConnected = true;
          setServerStatus("Online");
          resolve(true);
        } else if (Date.now() - startedAt > SERVER_CONNECT_TIMEOUT_MS || socket.readyState === WebSocket.CLOSED) {
          clearInterval(check);
          resolve(false);
        }
      }, 100);
      return;
    }

    try {
      setServerStatus("Connecting");
      socket = new WebSocket(SERVER_URL);
    } catch (error) {
      serverConnected = false;
      setServerStatus("Offline fallback");
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(false);
    }, SERVER_CONNECT_TIMEOUT_MS);

    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      serverConnected = true;
      setServerStatus("Online");
      startPingLoop();
      refs.message.textContent = "Connected to online server.";
      resolve(true);
    });

    socket.addEventListener("message", (event) => {
      handleServerMessage(event.data);
    });

    socket.addEventListener("close", () => {
      serverConnected = false;
      setServerStatus("Offline fallback");
      stopPingLoop();
    });

    socket.addEventListener("error", () => {
      serverConnected = false;
      setServerStatus("Server waking");
      refs.message.textContent = "Online server is waking up or unavailable. Try again in a moment.";
    });
  });
}

function setServerStatus(label) {
  refs.serverStatus.textContent = label;
}

function startPingLoop() {
  stopPingLoop();
  sendPing();
  pingTimer = setInterval(sendPing, PING_INTERVAL_MS);
}

function stopPingLoop() {
  clearInterval(pingTimer);
  pingTimer = null;
}

function sendPing() {
  if (!serverConnected) return;
  pendingPingAt = performance.now();
  sendServer({ type: "ping", sentAt: Date.now() });
}

function sendServer(message) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  socket.send(JSON.stringify(message));
  return true;
}

function handleServerMessage(raw) {
  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    return;
  }

  if (data.type === "lobby-created") {
    refs.message.textContent = `Online lobby ${data.code} created.`;
    if (data.leaderboard) {
      leaderboardEntries = data.leaderboard;
      renderLeaderboard();
    }
    return;
  }

  if (data.type === "lobby-joined") {
    const config = {
      ...data.state,
      code: data.code,
      localPlayerId: player.id,
      players: data.players || []
    };
    startRun(config, refs.guestName.value.trim() || getAccountName("Runner"), (data.players || []).length);
    refs.message.textContent = `Joined online lobby ${data.code}.`;
    leaderboardEntries = data.leaderboard || leaderboardEntries;
    renderLeaderboard();
    return;
  }

  if (data.type === "lobby-not-found") {
    refs.message.textContent = "Lobby not found on the online server. Check the 5 digit code.";
    return;
  }

  if (data.type === "lobby-exists") {
    refs.message.textContent = "That lobby code already exists. Try Create Lobby again.";
    return;
  }

  if (data.type === "player-joined" && data.player && data.player.id !== player.id) {
    remotePlayers.set(data.player.id, { ...data.player, lastSeen: Date.now() });
    renderLobbyList();
    return;
  }

  if (data.type === "pong") {
    player.ping = Math.max(0, Math.round(performance.now() - pendingPingAt));
    broadcast("player-update", { player: snapshotPlayer(player) });
    renderLobbyList();
    return;
  }

  if (data.type === "leaderboard") {
    leaderboardEntries = data.entries || [];
    renderLeaderboard();
    return;
  }

  handleRealtimeMessage(data);
}

function handleRealtimeMessage(data) {
  if (!data || data.playerId === player.id || !lobby) return;

  if (data.type === "player-update") {
    remotePlayers.set(data.player.id, {
      ...data.player,
      lastSeen: Date.now()
    });
  }

  if (data.type === "player-left") {
    remotePlayers.delete(data.playerId);
    saveLobby();
  }

  if (data.type === "winner") {
    lobby.winner = data.winner;
    showResults();
  }

  if (data.type === "race-start") {
    beginRaceTransition(data.race);
  }

  if (data.type === "rematch") {
    beginRematch(data.rematch);
  }

  if (data.type === "chat-message") {
    addChatMessage(data.message, false);
  }

  if (data.type === "kick-player" && data.targetId === player.id) {
    leaveGame("You were kicked by the host.");
  }

  if (data.type === "kick-player" && isHost()) {
    remotePlayers.delete(data.targetId);
    renderLobbyList();
  }

  if (data.type === "host-transfer") {
    lobby.hostId = data.newHostId;
    syncStartButton();
    renderLobbyList();
  }
}

function broadcast(type, payload = {}) {
  const message = { type, playerId: player.id, ...payload };
  if (serverConnected) {
    sendServer(message);
  }
  if (channel) {
    channel.postMessage(message);
  }
}

function getDifficultySettings(difficulty) {
  if (difficulty === "endurance") {
    return { bigTurnChance: 0.2, smallTurnChance: 0.48, bigTurn: 5, smallTurn: 2, caveHeight: 22 };
  }

  if (difficulty === "easy") {
    return { bigTurnChance: 0.07, smallTurnChance: 0.24, bigTurn: 2, smallTurn: 1, caveHeight: 28 };
  }

  if (difficulty === "hard") {
    return { bigTurnChance: 0.24, smallTurnChance: 0.38, bigTurn: 6, smallTurn: 2, caveHeight: 21 };
  }

  return { bigTurnChance: 0.15, smallTurnChance: 0.50, bigTurn: 4, smallTurn: 2, caveHeight: 24 };
}

function generateLevel(seed, lengthScale, difficulty = "normal") {
  tiles = [];
  particles = [];
  cavePath = [];
  checkpoints = [];

  const random = seededRandom(seed);
  const settings = getDifficultySettings(difficulty);
  gridWidth = Math.max(120, Math.round(BASE_GRID_WIDTH * lengthScale));
  const grid = Array(GRID_HEIGHT).fill().map(() => Array(gridWidth).fill("X"));
  let centerLine = Math.floor(GRID_HEIGHT / 2);
  const caveHeight = settings.caveHeight;

  for (let x = 0; x < gridWidth; x += 1) {
    if (x > 15) {
      const roll = random();
      if (roll < settings.bigTurnChance) centerLine -= settings.bigTurn;
      else if (roll < settings.bigTurnChance * 2) centerLine += settings.bigTurn;
      else if (roll < settings.smallTurnChance) centerLine += random() > 0.5 ? settings.smallTurn : -settings.smallTurn;
    }

    centerLine = Math.max(25, Math.min(GRID_HEIGHT - 25, centerLine));
    cavePath.push(centerLine);

    const ceilingNoise = Math.sin(x * 0.2) * 4;
    const floorNoise = Math.cos(x * 0.15) * 4;
    const ceilingY = Math.floor(centerLine - caveHeight / 2 + ceilingNoise);
    const floorY = Math.floor(centerLine + caveHeight / 2 + floorNoise);

    for (let y = 0; y < GRID_HEIGHT; y += 1) {
      if (y > ceilingY && y < floorY) grid[y][x] = " ";
    }
  }

  grid.forEach((row, y) => {
    row.forEach((char, x) => {
      if (char === "X") {
        tiles.push({ x: x * TILE_SIZE, y: y * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE });
      }
    });
  });

  for (let i = 0; i < 10; i += 1) {
    const gridX = Math.floor((gridWidth - 1) * (i / 10));
    checkpoints.push({
      index: i,
      percent: i * 10,
      x: gridX * TILE_SIZE + TILE_SIZE / 2,
      y: cavePath[gridX] * TILE_SIZE
    });
  }

  exitPortal = {
    x: (gridWidth - 5) * TILE_SIZE,
    y: cavePath[gridWidth - 1] * TILE_SIZE - TILE_SIZE * 5,
    w: TILE_SIZE,
    h: TILE_SIZE * 12
  };
}

function resetPlayer() {
  player.x = 5 * TILE_SIZE;
  player.y = cavePath[5] * TILE_SIZE;
  player.velX = 0;
  player.velY = 0;
  player.isAttached = false;
  player.anchorX = 0;
  player.anchorY = 0;
  player.ropeLength = 0;
  player.checkpointIndex = 0;
  player.finished = false;
  player.finishTime = null;
  player.winRewarded = false;
  syncPlayerProfileFromAccount();
  runStats = createRunStats();
  runStats.startedAt = Date.now();
  runStats.mode = lobby?.solo ? (lobby?.difficulty === "endurance" ? "endurance" : "solo") : "race";
  ghostSamples = [];
  activeGhost = lobby?.solo ? loadGhostForCurrentRun() : [];
  spectating = false;
  preGameSpectating = false;
  spectateIndex = 0;
  resultsShownForWinner = null;
  refs.spectatePanel.style.display = "none";
  cameraX = player.x - canvas.width / 2;
  cameraY = player.y - canvas.height / 2;
  attachWeb(false);
}

function isHost() {
  return lobby && lobby.hostId === player.id;
}

function isRaceActive() {
  return lobby?.phase === PHASE.RACING;
}

function isFreeRoam() {
  return lobby?.phase === PHASE.LOBBY;
}

function startRun(config, localName, colorIndex) {
  lobby = {
    code: config.code,
    phase: config.phase || (config.code === "SOLO" ? PHASE.RACING : PHASE.LOBBY),
    lobbySeed: config.lobbySeed || config.seed || createSeed(),
    raceSeed: config.raceSeed || config.seed || createSeed(),
    lengthScale: Number(config.lengthScale || 1),
    difficulty: config.difficulty || "normal",
    createdAt: config.createdAt || Date.now(),
    startTime: config.startTime || config.raceStartedAt || Date.now(),
    loadingStartedAt: config.loadingStartedAt || null,
    countdownStartedAt: config.countdownStartedAt || null,
    raceStartedAt: config.raceStartedAt || config.startTime || Date.now(),
    winner: config.winner || null,
    hostId: config.hostId || "",
    solo: config.code === "SOLO"
  };

  player.id = config.localPlayerId || createId();
  player.name = localName || (lobby.solo ? "Solo" : "Runner");
  player.color = refs.playerColor.value || PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
  syncPlayerProfileFromAccount();
  remotePlayers.clear();
  chatMessages = Array.isArray(config.chatMessages) ? config.chatMessages.slice(-40) : [];
  (config.players || []).forEach((remote) => {
    if (remote.id !== player.id) remotePlayers.set(remote.id, remote);
  });

  const activeSeed = lobby.phase === PHASE.LOBBY ? lobby.lobbySeed : lobby.raceSeed;
  const activeLength = lobby.phase === PHASE.LOBBY ? LOBBY_LENGTH_SCALE : lobby.lengthScale;
  generateLevel(activeSeed, activeLength, lobby.phase === PHASE.LOBBY ? "easy" : lobby.difficulty);
  resetPlayer();
  setupChannel(lobby.code);
  gameState = lobby.phase;
  refs.overlay.style.display = "none";
  refs.partyCode.textContent = lobby.code;
  refs.status.textContent = lobby.solo ? "Solo run" : "Free roam";
  refs.message.textContent = "Create a 5 digit lobby, join one, or practice solo. First player through the exit wins.";
  syncStartButton();

  if (lobby.phase === PHASE.LOADING || lobby.phase === PHASE.COUNTDOWN) {
    beginRaceTransition(lobby);
  }

  if (lobby.phase === PHASE.RACING) {
    countRaceStarted();
  }

  saveLobby();
  broadcast("player-update", { player: snapshotPlayer(player) });
  renderLobbyList();
  renderChat();
}

async function createLobby(event) {
  event.preventDefault();

  refs.message.textContent = "Connecting to online server. Free Render servers may take up to 60 seconds to wake.";
  await connectServer();
  let code = createCode();
  while (readLobby(code)) code = createCode();

  const hostId = createId();
  const config = {
    code,
    phase: PHASE.LOBBY,
    lobbySeed: createSeed(),
    raceSeed: null,
    lengthScale: Number(refs.lengthSelect.value),
    difficulty: refs.difficultySelect.value,
    createdAt: Date.now(),
    startTime: null,
    winner: null,
    hostId,
    localPlayerId: hostId,
    chatMessages: [],
    players: []
  };

  startRun(config, refs.hostName.value.trim() || getAccountName("Host"), 0);
  lobby.hostId = hostId;
  saveLobby();
  sendServer({
    type: "create-lobby",
    code,
    state: config,
    player: snapshotPlayer(player)
  });
}

function startSolo() {
  startRun({
    code: "SOLO",
    phase: PHASE.RACING,
    lobbySeed: createSeed(),
    raceSeed: createSeed(),
    lengthScale: Number(refs.lengthSelect.value),
    difficulty: refs.difficultySelect.value,
    createdAt: Date.now(),
    startTime: Date.now(),
    raceStartedAt: Date.now(),
    winner: null,
    chatMessages: [],
    players: []
  }, refs.hostName.value.trim() || getAccountName("Solo"), 0);
}

function startDailyChallenge() {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  startRun({
    code: "SOLO",
    phase: PHASE.RACING,
    lobbySeed: Number(dateKey),
    raceSeed: Number(dateKey),
    lengthScale: DAILY_LENGTH_SCALE,
    difficulty: "normal",
    createdAt: Date.now(),
    startTime: Date.now(),
    raceStartedAt: Date.now(),
    winner: null,
    chatMessages: [],
    players: []
  }, refs.hostName.value.trim() || getAccountName("Solo"), 0);
  refs.message.textContent = `Daily challenge ${dateKey} started.`;
}

function startEnduranceMode() {
  startRun({
    code: "SOLO",
    phase: PHASE.RACING,
    lobbySeed: createSeed(),
    raceSeed: createSeed(),
    lengthScale: 2,
    difficulty: "endurance",
    createdAt: Date.now(),
    startTime: Date.now(),
    raceStartedAt: Date.now(),
    winner: null,
    chatMessages: [],
    players: []
  }, refs.hostName.value.trim() || getAccountName("Solo"), 0);
  refs.message.textContent = "Endurance mode started. Go as far as you can for bonus XP.";
}

async function joinLobby(event) {
  event.preventDefault();
  const code = refs.joinCode.value.trim();

  if (!/^\d{5}$/.test(code)) {
    refs.message.textContent = "Enter a 5 digit party code.";
    return;
  }

  refs.message.textContent = "Connecting to online server. Free Render servers may take up to 60 seconds to wake.";

  if (await connectServer()) {
    const joinId = createId();
    player.id = joinId;
    player.name = refs.guestName.value.trim() || getAccountName("Runner");
    player.color = refs.playerColor.value;
    syncPlayerProfileFromAccount();
    sendServer({
      type: "join-lobby",
      code,
      player: snapshotPlayer(player)
    });
    refs.message.textContent = "Joining online lobby...";
    return;
  }

  const config = readLobby(code);
  if (!config) {
    refs.message.textContent = "Online server did not connect. Wait a moment for Render to wake, then try Join Lobby again.";
    return;
  }

  startRun(config, refs.guestName.value.trim() || getAccountName("Runner"), (config.players || []).length + 1);
}

function startRaceAsHost() {
  if (!isHost() || !lobby || lobby.phase !== PHASE.LOBBY) return;

  const now = Date.now();
  const race = {
    ...lobby,
    phase: PHASE.LOADING,
    raceSeed: createSeed(),
    difficulty: lobby.difficulty,
    loadingStartedAt: now,
    countdownStartedAt: now + LOAD_FADE_MS,
    raceStartedAt: now + LOAD_FADE_MS + COUNTDOWN_MS,
    startTime: now + LOAD_FADE_MS + COUNTDOWN_MS,
    winner: null
  };

  beginRaceTransition(race);
  broadcast("race-start", { race });
}

function beginRaceTransition(race) {
  if (!lobby) return;

  lobby.phase = race.phase || PHASE.LOADING;
  lobby.raceSeed = race.raceSeed;
  lobby.difficulty = race.difficulty || lobby.difficulty;
  lobby.loadingStartedAt = race.loadingStartedAt;
  lobby.countdownStartedAt = race.countdownStartedAt;
  lobby.raceStartedAt = race.raceStartedAt;
  lobby.startTime = race.raceStartedAt;
  lobby.winner = null;
  gameState = PHASE.LOADING;
  syncStartButton();
  saveLobby();

  showTransition("Generating map...", "", true);
  clearTimeout(transitionTimer);
  const delay = Math.max(0, (lobby.countdownStartedAt || Date.now()) - Date.now());
  transitionTimer = setTimeout(() => {
    generateLevel(lobby.raceSeed, lobby.lengthScale, lobby.difficulty);
    resetPlayer();
    lobby.phase = PHASE.COUNTDOWN;
    gameState = PHASE.COUNTDOWN;
    saveLobby();
    broadcast("player-update", { player: snapshotPlayer(player) });
    showTransition("Get ready", "", false);
  }, delay);
}

function showTransition(text, countdown, solid) {
  refs.transitionText.textContent = text;
  refs.countdownText.textContent = countdown;
  refs.transitionOverlay.classList.remove("hidden", "countdown");
  if (!solid) refs.transitionOverlay.classList.add("countdown");
  requestAnimationFrame(() => refs.transitionOverlay.classList.add("active"));
}

function hideTransition() {
  clearTimeout(transitionTimer);
  refs.transitionOverlay.classList.remove("active", "countdown");
  refs.transitionOverlay.classList.add("hidden");
  refs.countdownText.textContent = "";
}

function getAccountName(fallback) {
  return currentAccount || fallback;
}

function syncStartButton() {
  const canStart = isHost() && lobby?.phase === PHASE.LOBBY;
  refs.startRaceBtn.style.display = canStart ? "block" : "none";
  refs.preSpectateBtn.style.display = lobby?.phase === PHASE.LOBBY ? "block" : "none";
  refs.preSpectateBtn.textContent = preGameSpectating ? "Play" : "Spectate";
  refs.chatPanel.style.display = lobby && !lobby.solo ? "block" : "none";
  refs.leaderboardPanel.style.display = lobby ? "block" : "none";
}

function togglePreGameSpectate() {
  if (!lobby || lobby.phase !== PHASE.LOBBY) return;
  preGameSpectating = !preGameSpectating;
  spectating = preGameSpectating;
  syncStartButton();
  broadcast("player-update", { player: snapshotPlayer(player) });
}

function beginRematch(rematch) {
  if (!lobby) return;
  hideResults();
  beginRaceTransition({
    ...lobby,
    phase: PHASE.LOADING,
    raceSeed: rematch.raceSeed,
    difficulty: rematch.difficulty || lobby.difficulty,
    loadingStartedAt: rematch.loadingStartedAt,
    countdownStartedAt: rematch.countdownStartedAt,
    raceStartedAt: rematch.raceStartedAt,
    startTime: rematch.raceStartedAt,
    winner: null
  });
  resultsShownForWinner = null;
}

function rematchAsHost() {
  if (!isHost() || !lobby) return;

  const now = Date.now();
  const rematch = {
    raceSeed: createSeed(),
    difficulty: lobby.difficulty,
    loadingStartedAt: now,
    countdownStartedAt: now + LOAD_FADE_MS,
    raceStartedAt: now + LOAD_FADE_MS + COUNTDOWN_MS
  };

  beginRematch(rematch);
  broadcast("rematch", { rematch });
}

function leaveGame(message = "Left the run. Create or join another 5 digit party.") {
  if (typeof message !== "string") {
    message = "Left the run. Create or join another 5 digit party.";
  }
  if (gameState !== PHASE.MENU) {
    broadcast("player-left");
    saveLobby();
  }
  gameState = PHASE.MENU;
  lobby = null;
  remotePlayers.clear();
  if (channel) channel.close();
  channel = null;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  socket = null;
  serverConnected = false;
  hideTransition();
  refs.overlay.style.display = "flex";
  refs.status.textContent = "Menu";
  refs.message.textContent = message;
  syncStartButton();
  renderLobbyList();
  chatMessages = [];
  renderChat();
  hideResults();
}

function attachWeb(isMouse = false, targetWorldX = 0, targetWorldY = 0) {
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  let bestTile = null;
  let bestScore = -Infinity;

  if (isMouse && targetWorldY < py) {
    const dirX = targetWorldX - px;
    const dirY = targetWorldY - py;
    const length = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const normX = dirX / length;
    const normY = dirY / length;

    tiles.forEach((tile) => {
      if (tile.y + tile.h >= py) return;
      const tileCenterX = tile.x + tile.w / 2;
      const tileCenterY = tile.y + tile.h;
      const toTileX = tileCenterX - px;
      const toTileY = tileCenterY - py;
      const dist = Math.sqrt(toTileX * toTileX + toTileY * toTileY);
      const dot = toTileX * normX + toTileY * normY;
      const alignment = dot / (dist + 1);
      const score = alignment * 120 - dist * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestTile = tile;
      }
    });
  } else {
    let minYOverlap = -Infinity;
    tiles.forEach((tile) => {
      if (px >= tile.x && px <= tile.x + tile.w && tile.y + tile.h <= py && tile.y + tile.h > minYOverlap) {
        minYOverlap = tile.y + tile.h;
        bestTile = tile;
      }
    });
  }

  if (bestTile) {
    player.isAttached = true;
    player.anchorX = bestTile.x + bestTile.w / 2;
    player.anchorY = bestTile.y + bestTile.h;
    const dx = px - player.anchorX;
    const dy = py - player.anchorY;
    player.ropeLength = Math.sqrt(dx * dx + dy * dy);
    player.velY *= 0.5;
  }
}

function update(dt) {
  if (gameState === PHASE.MENU) return;

  updatePhase();
  updateSpectatorControls();
  renderResults();

  if (lobby?.phase === PHASE.LOADING) {
    updateHud();
    return;
  }

  if (!player.finished && !(preGameSpectating && lobby?.phase === PHASE.LOBBY)) {
    updatePlayerPhysics(dt);
    if (isRaceActive()) {
      updateCheckpoints();
    }
    checkFailureAndFinish();
    saveLobby();
    broadcast("player-update", { player: snapshotPlayer(player) });
  }

  pruneRemotePlayers();
  renderLobbyList();
  updateCamera(dt);
  updateHud();
}

function updatePhase() {
  if (!lobby) return;

  if (lobby.phase === PHASE.COUNTDOWN) {
    const remaining = Math.max(0, lobby.raceStartedAt - Date.now());
    refs.countdownText.textContent = String(Math.ceil(remaining / 1000));
    refs.transitionText.textContent = "Map preview";

    if (remaining <= 0) {
      lobby.phase = PHASE.RACING;
      lobby.startTime = lobby.raceStartedAt;
      gameState = PHASE.RACING;
      countRaceStarted();
      hideTransition();
      saveLobby();
    }
  }
}

function updatePlayerPhysics(dt) {
  const speed = Math.sqrt(player.velX * player.velX + player.velY * player.velY);
  runStats.maxSpeed = Math.max(runStats.maxSpeed, speed);
  if (lobby?.solo && isRaceActive()) {
    if (speed > 9) {
      runStats.combo += 1;
      runStats.bestCombo = Math.max(runStats.bestCombo, runStats.combo);
    } else {
      runStats.combo = Math.max(0, runStats.combo - 0.5);
    }
    captureGhostSample();
  }

  if (speed > 14 && Math.random() < 0.6) {
    particles.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      vx: -player.velX * 0.05,
      vy: -player.velY * 0.05,
      life: 1.0
    });
  }

  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.06 * dt;
    if (particle.life <= 0) particles.splice(index, 1);
  });

  const gridX = Math.max(0, Math.min(gridWidth - 1, Math.floor((player.x + player.width / 2) / TILE_SIZE)));
  const targetCenterY = cavePath[gridX] * TILE_SIZE;
  const currentY = player.y + player.height / 2;
  const assistPull = (currentY < targetCenterY ? 1 : -1) * CENTER_PULL;

  if (player.isAttached) {
    if (keys.KeyW || keys.ArrowUp) player.ropeLength = Math.max(30, player.ropeLength - CLIMB_SPEED * dt);
    if (keys.KeyS || keys.ArrowDown) player.ropeLength = Math.min(1500, player.ropeLength + CLIMB_SPEED * dt);
    if (keys.KeyA || keys.ArrowLeft) player.velX -= SWING_FORCE * 0.85 * dt;
    if (keys.KeyD || keys.ArrowRight) player.velX += SWING_FORCE * 0.60 * dt;

    player.velY += (GRAVITY + assistPull) * dt;
    let nextX = player.x + player.width / 2 + player.velX * dt;
    let nextY = player.y + player.height / 2 + player.velY * dt;
    const dx = nextX - player.anchorX;
    const dy = nextY - player.anchorY;
    const currentDist = Math.sqrt(dx * dx + dy * dy);

    if (currentDist > player.ropeLength) {
      const nx = dx / currentDist;
      const ny = dy / currentDist;
      const overstretch = currentDist - player.ropeLength;
      nextX = player.anchorX + nx * player.ropeLength;
      nextY = player.anchorY + ny * player.ropeLength;
      const dot = player.velX * nx + player.velY * ny;
      player.velX = (player.velX - dot * nx) * 0.999;
      player.velY = (player.velY - dot * ny) * 0.999;
      player.velX -= nx * overstretch * TENSION_ELASTICITY;
      player.velY -= ny * overstretch * TENSION_ELASTICITY;
    }

    player.x = nextX - player.width / 2;
    player.y = nextY - player.height / 2;
  } else {
    if (keys.KeyA || keys.ArrowLeft) player.velX -= AIR_STRAFE_FORCE * 0.85 * dt;
    if (keys.KeyD || keys.ArrowRight) player.velX += AIR_STRAFE_FORCE * 0.60 * dt;
    if (keys.KeyW || keys.ArrowUp) player.velY -= 0.15 * dt;
    if (keys.KeyS || keys.ArrowDown) player.velY += 0.15 * dt;

    player.velY += (GRAVITY + assistPull) * dt;
    player.velX *= Math.pow(AIR_RESISTANCE, dt);
    player.x += player.velX * dt;
    player.y += player.velY * dt;
  }
}

function updateCheckpoints() {
  const finishX = exitPortal.x;
  const progress = Math.max(0, Math.min(0.999, player.x / finishX));
  const checkpointIndex = Math.floor(progress * 10);
  if (checkpointIndex > player.checkpointIndex) {
    player.checkpointIndex = checkpointIndex;
    runStats.checkpointsReached = Math.max(runStats.checkpointsReached, checkpointIndex);
  }
}

function respawnAtCheckpoint() {
  if (gameState === PHASE.MENU || gameState === PHASE.LOADING) return;
  if (player.finished) return;
  const checkpoint = checkpoints[player.checkpointIndex] || checkpoints[0];
  runStats.respawns += 1;
  runStats.combo = 0;
  player.x = checkpoint.x;
  player.y = checkpoint.y;
  player.velX = 0;
  player.velY = 0;
  player.isAttached = false;
  attachWeb(false);
}

function checkFailureAndFinish() {
  for (const tile of tiles) {
    if (player.x < tile.x + tile.w && player.x + player.width > tile.x && player.y < tile.y + tile.h && player.y + player.height > tile.y) {
      respawnAtCheckpoint();
      return;
    }
  }

  if (player.y > (GRID_HEIGHT + 10) * TILE_SIZE || player.y < -10 * TILE_SIZE) {
    respawnAtCheckpoint();
  }

  if (isRaceActive() && exitPortal && player.x > exitPortal.x && !player.finished) {
    player.finished = true;
    player.finishTime = Date.now() - lobby.startTime;
    recordFinishStats(player.finishTime);

    if (lobby.solo) {
      const summary = grantSoloRunXp(player.finishTime);
      runStats.xpSummary = summary;
      refs.message.textContent = `Solo finished in ${formatTime(player.finishTime)}. +${summary.total} XP.`;
      saveBestGhostIfNeeded(player.finishTime, summary.personalBest);
      submitLeaderboard(player.finishTime);
      showResults();
      return;
    }

    if (lobby.winner) {
      recordNonWinFinishStats();
      saveLobby();
      broadcast("player-update", { player: snapshotPlayer(player) });
      showResults();
      return;
    }

    recordWinStats();
    const xpMessage = grantWinXp();
    lobby.winner = {
      id: player.id,
      name: player.name,
      time: player.finishTime
    };
    refs.message.textContent = `${player.name} wins in ${formatTime(player.finishTime)}.${xpMessage ? ` ${xpMessage}` : ""}`;
    saveLobby();
    broadcast("player-update", { player: snapshotPlayer(player) });
    broadcast("winner", { winner: lobby.winner });
    submitLeaderboard(player.finishTime);
    showResults();
  }
}

function grantWinXp() {
  if (player.winRewarded) return "";
  player.winRewarded = true;

  if (!currentAccount) {
    return "";
  }

  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  const beforeLevel = getLevelFromXp(account.xp);
  account.xp = Math.min((MAX_LEVEL - 1) * XP_PER_LEVEL, account.xp + WIN_XP);
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();

  const afterLevel = getLevelFromXp(account.xp);
  const levelText = afterLevel > beforeLevel ? ` Level up to ${afterLevel}!` : "";
  return `You earned ${WIN_XP} XP.${levelText}`;
}

function grantSoloRunXp(finishTime) {
  const difficultyMultiplier = lobby.difficulty === "hard" ? 1.8 : lobby.difficulty === "endurance" ? 2.2 : lobby.difficulty === "normal" ? 1.35 : 1;
  const lengthMultiplier = Number(lobby.lengthScale || 1);
  const base = Math.round(40 * difficultyMultiplier * lengthMultiplier);
  const checkpoint = runStats.checkpointsReached * 8;
  const clean = runStats.respawns === 0 ? 75 : 0;
  const comeback = runStats.respawns > 0 ? Math.min(60, runStats.respawns * 15) : 0;
  const combo = Math.min(100, Math.floor(runStats.bestCombo / 40));
  const bestKey = getRunBestKey();
  const currentBest = getCurrentAccountStats().bestTimes?.[bestKey];
  const personalBest = !currentBest || finishTime < currentBest;
  const pb = personalBest ? 125 : 0;
  const streak = updateSoloDailyStreak();
  const streakBonus = Math.min(100, streak * 10);
  const quest = updateSoloQuests();
  const total = base + checkpoint + clean + comeback + combo + pb + streakBonus + quest.xp;

  addAccountXp(total);
  updateSoloStats();

  return { base, checkpoint, clean, comeback, combo, pb, streakBonus, quest, total, personalBest };
}

function addAccountXp(amount) {
  if (!currentAccount) return;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  const beforeLevel = getLevelFromXp(account.xp);
  account.xp = Math.min((MAX_LEVEL - 1) * XP_PER_LEVEL, account.xp + amount);
  const afterLevel = getLevelFromXp(account.xp);
  if (afterLevel > beforeLevel) {
    applyLevelRewards(account, beforeLevel + 1, afterLevel);
  }
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function applyLevelRewards(account, fromLevel, toLevel) {
  account.drops = account.drops || [];
  for (let level = fromLevel; level <= toLevel; level += 1) {
    if (level % 10 === 0 || Math.random() < 0.08) {
      account.drops.push(`Rare drop: ${getRewardForLevel(level)} at level ${level}`);
    }
  }
  account.drops = account.drops.slice(-20);
}

function updateSoloStats() {
  if (!currentAccount) return;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  account.soloRuns += 1;
  account.soloCrashes += runStats.respawns;
  account.soloBestCombo = Math.max(account.soloBestCombo, Math.floor(runStats.bestCombo));
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function updateSoloDailyStreak() {
  if (!currentAccount) return 0;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (account.lastSoloDate === today) {
    return account.dailyStreak || 1;
  }

  account.dailyStreak = account.lastSoloDate === yesterday ? account.dailyStreak + 1 : 1;
  account.lastSoloDate = today;
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  return account.dailyStreak;
}

function updateSoloQuests() {
  if (!currentAccount) return { xp: 0, completed: [] };
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  const completed = [];
  let xp = 0;

  for (const quest of SOLO_QUESTS) {
    const state = account.quests[quest.id] || { progress: 0, done: false };
    if (!state.done) {
      if (quest.id === "finish3") state.progress += 1;
      if (quest.id === "hard1" && lobby.difficulty === "hard") state.progress += 1;
      if (quest.id === "clean1" && runStats.respawns === 0) state.progress += 1;
      if (state.progress >= quest.target) {
        state.done = true;
        xp += quest.xp;
        completed.push(quest.label);
      }
      account.quests[quest.id] = state;
    }
  }

  accounts[currentAccount] = account;
  saveAccounts(accounts);
  return { xp, completed };
}

function countRaceStarted() {
  if (!currentAccount || !lobby || preGameSpectating) return;
  const raceKey = `${lobby.code}-${lobby.raceSeed}-${lobby.raceStartedAt}`;
  if (countedRaceKey === raceKey) return;
  countedRaceKey = raceKey;

  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  account.totalRaces += 1;
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function recordFinishStats(finishTime) {
  if (!currentAccount || !lobby) return;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  const key = `${lobby.difficulty}-${lobby.lengthScale}`;
  const previousBest = account.bestTimes[key];

  if (!previousBest || finishTime < previousBest) {
    account.bestTimes[key] = finishTime;
  }

  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function getRunBestKey() {
  return `${lobby?.difficulty || "normal"}-${lobby?.lengthScale || 1}`;
}

function recordWinStats() {
  if (!currentAccount) return;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  account.totalWins += 1;
  account.winStreak += 1;
  account.bestWinStreak = Math.max(account.bestWinStreak, account.winStreak);
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function recordNonWinFinishStats() {
  if (!currentAccount) return;
  const accounts = loadAccounts();
  const account = normalizeAccount(accounts[currentAccount]);
  account.winStreak = 0;
  accounts[currentAccount] = account;
  saveAccounts(accounts);
  syncPlayerProfileFromAccount();
  updateAccountMessage();
}

function pruneRemotePlayers() {
  const now = Date.now();
  remotePlayers.forEach((remote, id) => {
    if (now - (remote.lastSeen || now) > 12000) remotePlayers.delete(id);
  });
}

function updateCamera(dt) {
  const target = getCameraTarget();
  if (!target) return;
  cameraX += (target.x - canvas.width / 2 - cameraX) * 0.1 * dt;
  cameraY += (target.y - canvas.height / 2 - cameraY) * 0.1 * dt;
  cameraX = Math.max(0, Math.min(cameraX, gridWidth * TILE_SIZE - canvas.width));
  cameraY = Math.max(0, Math.min(cameraY, GRID_HEIGHT * TILE_SIZE - canvas.height));
}

function getAllPlayers() {
  return [snapshotPlayer(player), ...Array.from(remotePlayers.values())];
}

function getSpectateTargets() {
  return getAllPlayers().filter((item) => item.id !== player.id);
}

function getCameraTarget() {
  if (lobby?.phase === PHASE.COUNTDOWN) {
    return getCountdownPreviewTarget();
  }

  if (preGameSpectating && lobby?.phase === PHASE.LOBBY) {
    const targets = getSpectateTargets();
    if (!targets.length) return player;
    spectateIndex = ((spectateIndex % targets.length) + targets.length) % targets.length;
    const target = targets[spectateIndex];
    refs.spectateName.textContent = target.name || "Player";
    refs.spectatePanel.style.display = "block";
    return target;
  }

  if (!spectating) return player;
  const targets = getSpectateTargets();
  if (!targets.length) {
    spectating = false;
    refs.spectatePanel.style.display = "none";
    return player;
  }
  spectateIndex = ((spectateIndex % targets.length) + targets.length) % targets.length;
  const target = targets[spectateIndex];
  refs.spectateName.textContent = target.name || "Player";
  return target;
}

function getCountdownPreviewTarget() {
  const startedAt = lobby.countdownStartedAt || Date.now();
  const duration = Math.max(1, lobby.raceStartedAt - startedAt);
  const elapsed = Math.max(0, Math.min(duration, Date.now() - startedAt));
  const progress = elapsed / duration;
  const index = Math.max(0, Math.min(cavePath.length - 1, Math.floor(progress * (cavePath.length - 1))));

  return {
    x: index * TILE_SIZE + TILE_SIZE / 2,
    y: cavePath[index] * TILE_SIZE
  };
}

function updateSpectatorControls() {
  if (preGameSpectating && lobby?.phase === PHASE.LOBBY) {
    spectating = true;
    refs.spectatePanel.style.display = "block";
    return;
  }

  const canSpectate = player.finished && getSpectateTargets().length > 0;
  spectating = canSpectate;
  refs.spectatePanel.style.display = canSpectate ? "block" : "none";
}

function cycleSpectate(direction) {
  if (!spectating) return;
  const targets = getSpectateTargets();
  if (!targets.length) return;
  spectateIndex = (spectateIndex + direction + targets.length) % targets.length;
}

function updateHud() {
  if (!lobby) {
    refs.timer.textContent = "0:00.00";
    refs.progress.textContent = "0%";
    return;
  }

  const elapsed = isRaceActive() ? player.finishTime || Date.now() - lobby.startTime : 0;
  const progress = isRaceActive() ? Math.max(0, Math.min(100, Math.floor((player.x / exitPortal.x) * 100))) : 0;
  refs.timer.textContent = formatTime(elapsed);
  refs.progress.textContent = isRaceActive() ? `${progress}%` : "--";

  if (lobby.winner) {
    refs.status.textContent = `${lobby.winner.name} wins`;
  } else if (lobby.phase === PHASE.LOADING) {
    refs.status.textContent = "Generating";
  } else if (lobby.phase === PHASE.COUNTDOWN) {
    refs.status.textContent = "Countdown";
  } else if (lobby.solo) {
    refs.status.textContent = "Solo run";
  } else if (lobby.phase === PHASE.LOBBY) {
    refs.status.textContent = isHost() ? "Host lobby" : "Free roam";
  } else {
    refs.status.textContent = remotePlayers.size ? `${remotePlayers.size + 1} racing` : "Waiting";
  }
}

function renderLobbyList() {
  if (!lobby || !refs.playerList) {
    refs.playerList.innerHTML = "";
    return;
  }

  const rows = getAllPlayers()
    .sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity))
    .map((item) => {
      const tag = item.id === lobby.hostId ? "HOST" : item.finished ? "DONE" : `${item.progress || 0}%`;
      const ping = item.ping == null ? "--" : `${item.ping}ms`;
      const hostActions = isHost() && item.id !== player.id
        ? `<span class="host-actions"><button type="button" data-kick-player="${item.id}">Kick</button><button type="button" data-host-transfer="${item.id}">Host</button></span>`
        : `<small>${tag} ${ping}</small>`;
      return `
        <div class="player-row">
          <span class="player-dot${(item.winStreak || 0) >= 3 ? " streak-fire" : ""}" style="background:${item.color || "#fff"}"></span>
          <span>${escapeHtml(item.name || "Runner")} <em>Lv ${item.level || 1}</em></span>
          ${hostActions}
        </div>
      `;
    })
    .join("");

  refs.playerList.innerHTML = rows || `<div class="player-row"><span></span><span>No players</span><small></small></div>`;
  refs.seedButton.textContent = `Seed: ${lobby.raceSeed || lobby.lobbySeed || "--"}`;
}

function handleLobbyListClick(event) {
  const kickButton = event.target.closest("[data-kick-player]");
  const hostButton = event.target.closest("[data-host-transfer]");

  if (kickButton) {
    kickPlayer(kickButton.dataset.kickPlayer);
  }

  if (hostButton) {
    transferHost(hostButton.dataset.hostTransfer);
  }
}

function kickPlayer(targetId) {
  if (!isHost() || !targetId) return;
  remotePlayers.delete(targetId);
  broadcast("kick-player", { targetId });
  renderLobbyList();
}

function transferHost(newHostId) {
  if (!isHost() || !newHostId) return;
  lobby.hostId = newHostId;
  broadcast("host-transfer", { newHostId, state: { hostId: newHostId } });
  syncStartButton();
  renderLobbyList();
}

async function copySeed() {
  if (!lobby) return;
  const seed = String(lobby.raceSeed || lobby.lobbySeed || "");
  if (!seed) return;
  try {
    await navigator.clipboard.writeText(seed);
    refs.seedButton.textContent = "Seed copied";
  } catch (error) {
    refs.seedButton.textContent = `Seed: ${seed}`;
  }
}

function addChatMessage(message, shouldBroadcast = true) {
  if (!message || !lobby || lobby.solo) return;

  const normalized = {
    id: message.id || createId(),
    name: message.name || player.name,
    color: message.color || player.color,
    text: String(message.text || "").slice(0, 90),
    createdAt: message.createdAt || Date.now()
  };

  if (!normalized.text.trim() || chatMessages.some((item) => item.id === normalized.id)) return;

  chatMessages.push(normalized);
  chatMessages = chatMessages.slice(-40);
  renderChat();
  saveLobby();

  if (shouldBroadcast) {
    broadcast("chat-message", { message: normalized });
  }
}

function sendChatMessage(event) {
  event.preventDefault();
  const text = refs.chatInput.value.trim();
  if (!text) return;

  refs.chatInput.value = "";
  addChatMessage({
    name: player.name,
    color: player.color,
    text
  });
}

function renderChat() {
  if (!refs.chatLog) return;

  refs.chatLog.innerHTML = chatMessages.map((message) => `
    <article class="chat-message">
      <strong style="color:${message.color || "#4ecca3"}">${escapeHtml(message.name || "Player")}</strong>
      <span>${escapeHtml(message.text || "")}</span>
    </article>
  `).join("");
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight;
}

function showResults() {
  if (!lobby?.winner || resultsShownForWinner === lobby.winner.id) return;
  resultsShownForWinner = lobby.winner.id;
  renderResults();
  refs.resultsPanel.classList.remove("hidden");
}

function hideResults() {
  refs.resultsPanel.classList.add("hidden");
}

function renderResults() {
  const players = getAllPlayers().sort((a, b) => {
    if (a.finishTime && b.finishTime) return a.finishTime - b.finishTime;
    if (a.finishTime) return -1;
    if (b.finishTime) return 1;
    return (b.progress || 0) - (a.progress || 0);
  });

  refs.resultsList.innerHTML = players.map((item, index) => {
    const detail = item.finishTime ? formatTime(item.finishTime) : `${item.progress || 0}%`;
    return `
      <div class="result-row">
        <strong>#${index + 1}</strong>
        <span>${escapeHtml(item.name || "Runner")} <em>Lv ${item.level || 1}</em></span>
        <small>${detail}</small>
      </div>
    `;
  }).join("");

  if (lobby?.solo && runStats.xpSummary) {
    const s = runStats.xpSummary;
    refs.resultsList.innerHTML += `
      <div class="result-row"><strong>XP</strong><span>Base ${s.base}, checkpoints ${s.checkpoint}, clean ${s.clean}, comeback ${s.comeback}, combo ${s.combo}, PB ${s.pb}, streak ${s.streakBonus}, quests ${s.quest.xp}</span><small>+${s.total}</small></div>
      <div class="result-row"><strong>Tip</strong><span>${escapeHtml(getRunTip())}</span><small></small></div>
      <div class="result-row"><strong>Stats</strong><span>Respawns ${runStats.respawns}, best combo ${Math.floor(runStats.bestCombo)}, max speed ${runStats.maxSpeed.toFixed(1)}</span><small></small></div>
    `;
  }

  refs.rematchBtn.style.display = isHost() ? "block" : "none";
}

function getRunTip() {
  if (runStats.respawns > 2) return "Practice checkpoint sections where you crash most; clean runs give a big XP bonus.";
  if (runStats.maxSpeed < 10) return "Hold momentum longer before detaching; higher speed builds combo XP faster.";
  if (runStats.bestCombo < 120) return "Try smoother swings without slowing down to raise your combo bonus.";
  if (runStats.xpSummary?.personalBest) return "Great personal best. Next target: no-respawn bonus plus checkpoint splits.";
  return "You are consistent. Push harder through sharp turns for a better time.";
}

function submitLeaderboard(finishTime) {
  const entry = {
    name: player.name,
    level: player.level,
    time: finishTime,
    difficulty: lobby?.difficulty || "normal",
    lengthScale: lobby?.lengthScale || 1,
    speed: runStats.maxSpeed,
    category: `${lobby?.difficulty || "normal"} / ${lobby?.lengthScale || 1}x`,
    createdAt: Date.now()
  };

  if (!sendServer({ type: "leaderboard-submit", entry })) {
    leaderboardEntries.push(entry);
    leaderboardEntries = sortLeaderboard(leaderboardEntries).slice(0, 10);
    renderLeaderboard();
  }
}

function sortLeaderboard(entries) {
  return [...entries].sort((a, b) => a.time - b.time);
}

function renderLeaderboard() {
  if (!refs.leaderboardList) return;
  const visible = sortLeaderboard(leaderboardEntries).slice(0, 8);
  refs.leaderboardList.innerHTML = visible.length
    ? visible.map((entry, index) => `
      <div class="leaderboard-row">
        <strong>#${index + 1}</strong>
        <span>${escapeHtml(entry.name || "Runner")} <em>Lv ${entry.level || 1}</em></span>
        <small>${formatTime(entry.time || 0)} ${escapeHtml(entry.difficulty || "")}/${entry.lengthScale || 1}x</small>
      </div>
    `).join("")
    : `<div class="leaderboard-row"><strong>--</strong><span>No times yet</span><small></small></div>`;
}

function showRewards() {
  renderRewards();
  refs.rewardsPanel.classList.remove("hidden");
}

function hideRewards() {
  refs.rewardsPanel.classList.add("hidden");
}

function renderRewards() {
  const stats = getCurrentAccountStats();
  refs.rewardSummary.innerHTML = `
    <strong>${escapeHtml(currentAccount || "Guest")}</strong>
    <p>${escapeHtml(getTitleForLevel(stats.level))} - Level ${stats.level} - ${stats.xp} XP</p>
    <p>Current border: ${escapeHtml(getBorderForLevel(stats.level))}</p>
  `;
  refs.rewardsList.innerHTML = Array.from({ length: 100 }, (_, index) => {
    const level = index + 1;
    const unlocked = stats.level >= level;
    return `
      <div class="reward-row ${unlocked ? "unlocked" : "locked"}">
        <strong>Lv ${level}</strong>
        <span>${escapeHtml(getRewardForLevel(level))}</span>
        <small>${unlocked ? "Unlocked" : "Locked"}</small>
      </div>
    `;
  }).join("");
}

function showProfile() {
  renderProfile();
  refs.profilePanel.classList.remove("hidden");
}

function hideProfile() {
  refs.profilePanel.classList.add("hidden");
}

function renderProfile() {
  const stats = getCurrentAccountStats();
  const account = currentAccount ? normalizeAccount(loadAccounts()[currentAccount]) : normalizeAccount({});
  const frameClass = stats.level >= 75 ? "prismatic" : stats.level >= 50 ? "gold" : "";
  refs.profileCard.innerHTML = `
    <div class="profile-frame ${frameClass}">
      <strong>${escapeHtml(currentAccount || "Guest")}</strong>
      <p>${escapeHtml(getTitleForLevel(stats.level))} - Level ${stats.level}</p>
      <p>${escapeHtml(getBorderForLevel(stats.level))}</p>
      <p>Wins ${account.totalWins} | Races ${account.totalRaces} | Solo ${account.soloRuns} | Team XP ${account.teamXp}</p>
      <p>Drops: ${account.drops.length ? escapeHtml(account.drops.slice(-3).join(" | ")) : "None yet"}</p>
    </div>
  `;
  refs.badgeList.innerHTML = MILESTONE_BADGES.map((badge) => {
    const unlocked = badge.test(account);
    return `
      <div class="badge-row ${unlocked ? "unlocked" : "locked"}">
        <strong>${unlocked ? "✓" : "○"}</strong>
        <span>${escapeHtml(badge.label)}</span>
        <small>${unlocked ? "Earned" : "Locked"}</small>
      </div>
    `;
  }).join("");
  renderLevelLeaderboard();
}

function renderLevelLeaderboard() {
  const accounts = loadAccounts();
  const rows = Object.entries(accounts)
    .map(([name, account]) => ({ name, ...normalizeAccount(account), level: getLevelFromXp(account.xp) }))
    .sort((a, b) => b.level - a.level || b.xp - a.xp)
    .slice(0, 10);
  refs.levelLeaderboard.innerHTML = rows.length ? rows.map((entry, index) => `
    <div class="level-row">
      <strong>#${index + 1}</strong>
      <span>${escapeHtml(entry.name)} <em>${escapeHtml(getTitleForLevel(entry.level))}</em></span>
      <small>Lv ${entry.level}</small>
    </div>
  `).join("") : `<div class="level-row"><strong>--</strong><span>No accounts yet</span><small></small></div>`;
}

function loadGhosts() {
  try {
    return JSON.parse(localStorage.getItem(SOLO_GHOST_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveGhosts(ghosts) {
  localStorage.setItem(SOLO_GHOST_KEY, JSON.stringify(ghosts));
}

function captureGhostSample() {
  if (!lobby?.solo) return;
  const now = Date.now();
  if (now - runStats.lastGhostSampleAt < 120) return;
  runStats.lastGhostSampleAt = now;
  ghostSamples.push({
    t: now - runStats.startedAt,
    x: player.x,
    y: player.y,
    color: player.color
  });
  if (ghostSamples.length > 1200) ghostSamples.shift();
}

function loadGhostForCurrentRun() {
  const ghosts = loadGhosts();
  return ghosts[getRunBestKey()]?.samples || [];
}

function saveBestGhostIfNeeded(finishTime, personalBest) {
  if (!lobby?.solo || !personalBest) return;
  const ghosts = loadGhosts();
  ghosts[getRunBestKey()] = {
    time: finishTime,
    samples: ghostSamples.slice(0, 900)
  };
  saveGhosts(ghosts);
}

function getGhostPosition() {
  if (!activeGhost.length || !runStats.startedAt) return null;
  const elapsed = Date.now() - runStats.startedAt;
  let sample = activeGhost[0];
  for (const item of activeGhost) {
    if (item.t > elapsed) break;
    sample = item;
  }
  return sample;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function drawMinimap() {
  miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
  const scaleX = miniCanvas.width / gridWidth;
  const scaleY = miniCanvas.height / GRID_HEIGHT;

  miniCtx.beginPath();
  miniCtx.strokeStyle = "rgba(78, 204, 163, 0.42)";
  miniCtx.lineWidth = 4;
  cavePath.forEach((pathY, index) => {
    const x = index * scaleX;
    const y = pathY * scaleY;
    if (index === 0) miniCtx.moveTo(x, y);
    else miniCtx.lineTo(x, y);
  });
  miniCtx.stroke();

  checkpoints.forEach((checkpoint) => {
    miniCtx.fillStyle = checkpoint.index <= player.checkpointIndex ? "#4ecca3" : "rgba(255,255,255,0.45)";
    miniCtx.fillRect((checkpoint.x / TILE_SIZE) * scaleX - 1, checkpoint.y / TILE_SIZE * scaleY - 5, 2, 10);
  });

  remotePlayers.forEach((remote) => {
    miniCtx.fillStyle = remote.color || "#fff";
    miniCtx.globalAlpha = 0.45;
    miniCtx.beginPath();
    miniCtx.arc((remote.x / TILE_SIZE) * scaleX, (remote.y / TILE_SIZE) * scaleY, 3, 0, Math.PI * 2);
    miniCtx.fill();
    miniCtx.globalAlpha = 1;
  });

  miniCtx.fillStyle = player.color;
  miniCtx.beginPath();
  miniCtx.arc((player.x / TILE_SIZE) * scaleX, (player.y / TILE_SIZE) * scaleY, 3.5, 0, Math.PI * 2);
  miniCtx.fill();
}

function draw() {
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!cavePath.length) return;

  ctx.save();
  ctx.translate(-Math.floor(cameraX), -Math.floor(cameraY));
  drawGuideLine();
  if (lobby?.phase !== PHASE.LOBBY) {
    drawCheckpoints();
    drawExit();
  }
  drawRopesAndTiles();
  drawParticles();
  drawGhost();
  drawRemotePlayers();
  drawPlayer(player, 1);
  ctx.restore();

  if (gameState !== PHASE.MENU) drawMinimap();
}

function drawGuideLine() {
  const pxGrid = Math.floor(player.x / TILE_SIZE);
  const lookAhead = 15;

  ctx.beginPath();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 5]);
  cavePath.forEach((pathY, index) => {
    const x = index * TILE_SIZE + TILE_SIZE / 2;
    const y = pathY * TILE_SIZE;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  if (gameState === PHASE.MENU) return;

  const currentSpeed = Math.abs(player.velX);
  let curveIntensity = 0;
  for (let i = pxGrid; i < pxGrid + lookAhead && i < cavePath.length - 1; i += 1) {
    curveIntensity += Math.abs(cavePath[i + 1] - cavePath[i]);
  }

  let lineColor = "#4ecca3";
  if (curveIntensity > 8) lineColor = "#ff4b5c";
  else if (curveIntensity > 4 || currentSpeed < 5) lineColor = "#f9d423";

  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 6;
  ctx.shadowBlur = 15;
  ctx.shadowColor = lineColor;
  for (let i = pxGrid; i < pxGrid + lookAhead && i < cavePath.length; i += 1) {
    const x = i * TILE_SIZE + TILE_SIZE / 2;
    const y = cavePath[i] * TILE_SIZE;
    if (i === pxGrid) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCheckpoints() {
  checkpoints.forEach((checkpoint) => {
    const reached = checkpoint.index <= player.checkpointIndex;
    ctx.strokeStyle = reached ? "rgba(78, 204, 163, 0.88)" : "rgba(255,255,255,0.24)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(checkpoint.x, checkpoint.y - 190);
    ctx.lineTo(checkpoint.x, checkpoint.y + 190);
    ctx.stroke();

    ctx.fillStyle = reached ? "#4ecca3" : "rgba(255,255,255,0.84)";
    ctx.beginPath();
    ctx.arc(checkpoint.x, checkpoint.y - 120, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0a0a12";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(checkpoint.x - 8, checkpoint.y - 120);
    ctx.lineTo(checkpoint.x - 1, checkpoint.y - 112);
    ctx.lineTo(checkpoint.x + 11, checkpoint.y - 130);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "700 14px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(`${checkpoint.percent}%`, checkpoint.x, checkpoint.y - 146);
  });
}

function drawExit() {
  if (!exitPortal) return;
  ctx.fillStyle = "rgba(78, 204, 163, 0.16)";
  ctx.shadowBlur = 35;
  ctx.shadowColor = "#4ecca3";
  ctx.fillRect(exitPortal.x, exitPortal.y, exitPortal.w, exitPortal.h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#4ecca3";
  ctx.lineWidth = 4;
  ctx.strokeRect(exitPortal.x, exitPortal.y, exitPortal.w, exitPortal.h);
}

function drawRopesAndTiles() {
  if (player.isAttached) {
    drawRope(player, 1);
  }

  remotePlayers.forEach((remote) => {
    if (remote.isAttached) drawRope(remote, 0.32);
  });

  ctx.fillStyle = "#161625";
  tiles.forEach((tile) => {
    if (tile.x + tile.w > cameraX && tile.x < cameraX + canvas.width && tile.y + tile.h > cameraY && tile.y < cameraY + canvas.height) {
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      ctx.strokeStyle = "#08080c";
      ctx.strokeRect(tile.x, tile.y, tile.w, tile.h);
    }
  });
}

function drawRope(source, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(source.anchorX, source.anchorY);
  ctx.lineTo(source.x + source.width / 2, source.y + source.height / 2);
  ctx.strokeStyle = "rgba(78, 204, 163, 0.8)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(source.anchorX, source.anchorY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.fillStyle = `rgba(255, 75, 92, ${particle.life})`;
    ctx.fillRect(particle.x, particle.y, 4, 4);
  });
}

function drawRemotePlayers() {
  remotePlayers.forEach((remote) => drawPlayer(remote, 0.38));
}

function drawGhost() {
  const ghost = getGhostPosition();
  if (!ghost) return;
  drawPlayer({
    x: ghost.x,
    y: ghost.y,
    width: player.width,
    height: player.height,
    color: "#ffffff",
    name: "Best Ghost"
  }, 0.24);
}

function drawPlayer(source, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = source.color || "#ff4b5c";
  ctx.shadowBlur = alpha === 1 ? 25 : 8;
  ctx.shadowColor = source.color || "#ff4b5c";
  ctx.fillRect(source.x, source.y, source.width, source.height);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.font = "700 14px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(source.name || "Runner", source.x + source.width / 2, source.y - 10);
  ctx.restore();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / (1000 / TARGET_FPS), 2.0);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

function formatTime(ms) {
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((totalSeconds % 1) * 100);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left + cameraX;
  mouseY = event.clientY - rect.top + cameraY;
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0 && gameState !== PHASE.MENU && gameState !== PHASE.LOADING && !player.finished) {
    if (player.isAttached) {
      if (lobby?.phase !== PHASE.COUNTDOWN) player.isAttached = false;
      return;
    }
    attachWeb(true, mouseX, mouseY);
  }
});

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Space" && !keys.Space && gameState !== PHASE.MENU && gameState !== PHASE.LOADING && !player.finished) {
    if (player.isAttached) {
      if (lobby?.phase !== PHASE.COUNTDOWN) player.isAttached = false;
    } else {
      attachWeb(false);
    }
  }

  if (spectating && !keys[event.code]) {
    if (event.code === "KeyA" || event.code === "ArrowLeft") cycleSpectate(-1);
    if (event.code === "KeyD" || event.code === "ArrowRight") cycleSpectate(1);
  }

  if (event.code === "KeyR") {
    respawnAtCheckpoint();
  }

  keys[event.code] = true;
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

refs.createForm.addEventListener("submit", createLobby);
refs.joinForm.addEventListener("submit", joinLobby);
refs.soloBtn.addEventListener("click", startSolo);
refs.dailyBtn.addEventListener("click", startDailyChallenge);
refs.enduranceBtn.addEventListener("click", startEnduranceMode);
refs.leaveBtn.addEventListener("click", leaveGame);
refs.startRaceBtn.addEventListener("click", startRaceAsHost);
refs.preSpectateBtn.addEventListener("click", togglePreGameSpectate);
refs.rematchBtn.addEventListener("click", rematchAsHost);
refs.closeResultsBtn.addEventListener("click", hideResults);
refs.playerList.addEventListener("click", handleLobbyListClick);
refs.seedButton.addEventListener("click", copySeed);
refs.loginBtn.addEventListener("click", loginAccount);
refs.signupBtn.addEventListener("click", createAccount);
refs.rewardsBtn.addEventListener("click", showRewards);
refs.profileBtn.addEventListener("click", showProfile);
refs.closeRewardsBtn.addEventListener("click", hideRewards);
refs.closeProfileBtn.addEventListener("click", hideProfile);
refs.playerColor.addEventListener("input", updateAccountColor);
refs.chatForm.addEventListener("submit", sendChatMessage);

window.addEventListener("beforeunload", () => {
  if (gameState !== PHASE.MENU) {
    broadcast("player-left");
    saveLobby();
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  miniCanvas.width = miniCanvas.offsetWidth;
  miniCanvas.height = miniCanvas.offsetHeight;
});

restoreAccount();
refs.versionLabel.textContent = BUILD_VERSION;
setServerStatus("Offline fallback");
renderLobbyList();
renderLeaderboard();
window.dispatchEvent(new Event("resize"));
requestAnimationFrame(gameLoop);
