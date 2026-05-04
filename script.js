const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const miniCanvas = document.getElementById("minimap-canvas");
const miniCtx = miniCanvas.getContext("2d");

const refs = {
  partyCode: document.getElementById("party-code"),
  timer: document.getElementById("timer"),
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  playerList: document.getElementById("player-list"),
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
  createForm: document.getElementById("create-form"),
  joinForm: document.getElementById("join-form"),
  soloBtn: document.getElementById("solo-btn"),
  hostName: document.getElementById("host-name"),
  guestName: document.getElementById("guest-name"),
  joinCode: document.getElementById("join-code"),
  lengthSelect: document.getElementById("length-select"),
  difficultySelect: document.getElementById("difficulty-select"),
  leaveBtn: document.getElementById("leave-btn"),
  startRaceBtn: document.getElementById("start-race-btn"),
  resultsPanel: document.getElementById("results-panel"),
  resultsList: document.getElementById("results-list"),
  rematchBtn: document.getElementById("rematch-btn"),
  closeResultsBtn: document.getElementById("close-results-btn"),
  chatPanel: document.getElementById("chat-panel"),
  chatLog: document.getElementById("chat-log"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  transitionOverlay: document.getElementById("transition-overlay"),
  transitionText: document.getElementById("transition-text"),
  countdownText: document.getElementById("countdown-text")
};

const LOBBY_PREFIX = "cave-swinger-lobby-";
const SERVER_URL = "wss://speed-1v1.onrender.com";
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
let lobby = null;
let transitionTimer = null;
let currentAccount = null;
let spectating = false;
let spectateIndex = 0;
let resultsShownForWinner = null;
let chatMessages = [];

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
  winRewarded: false
};

const remotePlayers = new Map();

function createId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`;
}

function createCode() {
  return String(Math.floor(10000 + Math.random() * 90000));
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

function normalizeAccount(account) {
  return {
    password: account?.password || "",
    color: account?.color || refs.playerColor.value || PLAYER_COLORS[0],
    xp: Number(account?.xp || 0)
  };
}

function getCurrentAccountStats() {
  if (!currentAccount) {
    return { xp: 0, level: 1 };
  }

  const account = normalizeAccount(loadAccounts()[currentAccount]);
  return {
    xp: account.xp,
    level: getLevelFromXp(account.xp)
  };
}

function syncPlayerProfileFromAccount() {
  const stats = getCurrentAccountStats();
  player.xp = stats.xp;
  player.level = stats.level;
}

function updateAccountMessage() {
  if (!currentAccount) {
    refs.accountMessage.textContent = "Local account saves on this browser. Cross-device lobbies need a realtime server.";
    return;
  }

  const stats = getCurrentAccountStats();
  const nextLevelXp = Math.min(MAX_LEVEL - 1, stats.level) * XP_PER_LEVEL;
  const progress = stats.level >= MAX_LEVEL ? "MAX" : `${stats.xp}/${nextLevelXp} XP`;
  refs.accountMessage.textContent = `Logged in as ${currentAccount}. Level ${stats.level} - ${progress}.`;
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

  accounts[username] = { password, color: refs.playerColor.value, xp: 0 };
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
      resolve(true);
      return;
    }

    if (socket && socket.readyState === WebSocket.CONNECTING) {
      const startedAt = Date.now();
      const check = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          clearInterval(check);
          serverConnected = true;
          resolve(true);
        } else if (Date.now() - startedAt > 12000 || socket.readyState === WebSocket.CLOSED) {
          clearInterval(check);
          resolve(false);
        }
      }, 100);
      return;
    }

    try {
      socket = new WebSocket(SERVER_URL);
    } catch (error) {
      serverConnected = false;
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(false);
    }, 12000);

    socket.addEventListener("open", () => {
      clearTimeout(timeout);
      serverConnected = true;
      refs.message.textContent = "Connected to online server.";
      resolve(true);
    });

    socket.addEventListener("message", (event) => {
      handleServerMessage(event.data);
    });

    socket.addEventListener("close", () => {
      serverConnected = false;
    });

    socket.addEventListener("error", () => {
      serverConnected = false;
      refs.message.textContent = "Online server is waking up or unavailable. Try again in a moment.";
    });
  });
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
  spectating = false;
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

  saveLobby();
  broadcast("player-update", { player: snapshotPlayer(player) });
  renderLobbyList();
  renderChat();
}

async function createLobby(event) {
  event.preventDefault();

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

async function joinLobby(event) {
  event.preventDefault();
  const code = refs.joinCode.value.trim();

  if (!/^\d{5}$/.test(code)) {
    refs.message.textContent = "Enter a 5 digit party code.";
    return;
  }

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
    refs.message.textContent = "Lobby not found. Same-browser tabs work now; different devices need a realtime server.";
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
  refs.chatPanel.style.display = lobby && !lobby.solo ? "block" : "none";
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

function leaveGame() {
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
  refs.message.textContent = "Left the run. Create or join another 5 digit party.";
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

  if (!player.finished) {
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
      hideTransition();
      saveLobby();
    }
  }
}

function updatePlayerPhysics(dt) {
  const speed = Math.sqrt(player.velX * player.velX + player.velY * player.velY);
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
  }
}

function respawnAtCheckpoint() {
  if (gameState === PHASE.MENU || gameState === PHASE.LOADING) return;
  if (player.finished) return;
  const checkpoint = checkpoints[player.checkpointIndex] || checkpoints[0];
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
      return `
        <div class="player-row">
          <span class="player-dot" style="background:${item.color || "#fff"}"></span>
          <span>${escapeHtml(item.name || "Runner")} <em>Lv ${item.level || 1}</em></span>
          <small>${tag}</small>
        </div>
      `;
    })
    .join("");

  refs.playerList.innerHTML = rows || `<div class="player-row"><span></span><span>No players</span><small></small></div>`;
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

  refs.rematchBtn.style.display = isHost() ? "block" : "none";
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
refs.leaveBtn.addEventListener("click", leaveGame);
refs.startRaceBtn.addEventListener("click", startRaceAsHost);
refs.rematchBtn.addEventListener("click", rematchAsHost);
refs.closeResultsBtn.addEventListener("click", hideResults);
refs.loginBtn.addEventListener("click", loginAccount);
refs.signupBtn.addEventListener("click", createAccount);
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
renderLobbyList();
window.dispatchEvent(new Event("resize"));
requestAnimationFrame(gameLoop);
