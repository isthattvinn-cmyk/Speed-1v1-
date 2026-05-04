const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const lobbies = new Map();

app.get("/", (_request, response) => {
  response.json({
    ok: true,
    service: "Cave Swinger Online WebSocket server",
    lobbies: lobbies.size
  });
});

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch (error) {
      send(socket, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (message.type === "create-lobby") {
      createLobby(socket, message);
      return;
    }

    if (message.type === "join-lobby") {
      joinLobby(socket, message);
      return;
    }

    if (!socket.lobbyCode) {
      send(socket, { type: "error", message: "Join or create a lobby first" });
      return;
    }

    relay(socket, message);
  });

  socket.on("close", () => {
    removeSocket(socket);
  });
});

function createLobby(socket, message) {
  const code = String(message.code || "").trim();
  if (!/^\d{5}$/.test(code)) {
    send(socket, { type: "error", message: "Lobby code must be 5 digits" });
    return;
  }

  if (lobbies.has(code)) {
    send(socket, { type: "lobby-exists", code });
    return;
  }

  const lobby = {
    code,
    state: message.state || {},
    players: new Map()
  };

  lobbies.set(code, lobby);
  attachPlayer(socket, lobby, message.player);
  send(socket, { type: "lobby-created", code, state: lobby.state, players: getPlayers(lobby) });
}

function joinLobby(socket, message) {
  const code = String(message.code || "").trim();
  const lobby = lobbies.get(code);

  if (!lobby) {
    send(socket, { type: "lobby-not-found", code });
    return;
  }

  attachPlayer(socket, lobby, message.player);
  send(socket, { type: "lobby-joined", code, state: lobby.state, players: getPlayers(lobby) });
  broadcast(lobby, { type: "player-joined", player: socket.player }, socket);
}

function attachPlayer(socket, lobby, player = {}) {
  removeSocket(socket);

  socket.lobbyCode = lobby.code;
  socket.playerId = player.id || createId();
  socket.player = {
    ...player,
    id: socket.playerId
  };
  lobby.players.set(socket.playerId, socket);
}

function relay(socket, message) {
  const lobby = lobbies.get(socket.lobbyCode);
  if (!lobby) {
    send(socket, { type: "lobby-not-found", code: socket.lobbyCode });
    return;
  }

  if (message.state) {
    lobby.state = {
      ...lobby.state,
      ...message.state
    };
  }

  if (message.player) {
    socket.player = {
      ...socket.player,
      ...message.player
    };
  }

  broadcast(lobby, message, socket);
}

function removeSocket(socket) {
  if (!socket.lobbyCode || !socket.playerId) {
    return;
  }

  const lobby = lobbies.get(socket.lobbyCode);
  if (!lobby) {
    return;
  }

  lobby.players.delete(socket.playerId);
  broadcast(lobby, { type: "player-left", playerId: socket.playerId }, socket);

  if (lobby.players.size === 0) {
    lobbies.delete(lobby.code);
  }

  socket.lobbyCode = null;
  socket.playerId = null;
  socket.player = null;
}

function getPlayers(lobby) {
  return Array.from(lobby.players.values()).map((client) => client.player);
}

function broadcast(lobby, message, except) {
  for (const client of lobby.players.values()) {
    if (client !== except && client.readyState === client.OPEN) {
      send(client, message);
    }
  }
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function createId() {
  return `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

server.listen(PORT, () => {
  console.log(`Cave Swinger WebSocket server listening on port ${PORT}`);
});
