# Cave Swinger Online

Cave Swinger Online is a browser physics platformer with 5 digit party lobbies, deterministic shared cave maps, faded opponent characters, checkpoint respawns, and race timing.

## Features

- Create Lobby with a 5 digit party code
- Join Lobby with a 5 digit party code
- Local username/password account creation and login for saved names on this browser
- Level system from 1 to 100
- Winners earn 100 XP toward their local account level
- Lobby player list with names, levels, host tag, progress, and finished state
- Single-player practice mode
- Online lobbies start in a free-roam random cave while players gather
- Host-only `Start` button begins the race when everyone is in
- Race start fades every player to black while the new map generates
- After generation, the screen fades back into a 15 second countdown with a camera flythrough preview of the map
- During countdown, players can climb and swing but cannot detach until the timer ends
- Host map length selection for the race: 0.5x, Standard, or 2x
- Difficulty selection: Easy, Normal, or Hard cave generation
- Same generated race cave map for everyone in a lobby
- Other players render as faded characters
- Finished players can spectate and use `A` / `D` to cycle through players
- Race results show placements, finish times, or distance reached
- Host rematch button starts a new synced race
- Player color picker
- Lobby chat synced between players
- Checkmark respawn markers every 10% from 0% through 90%
- Press `R` or crash to respawn at the latest checkpoint
- First player through the exit portal wins
- No collectible currency items in solo or lobby play

## Local Play

The app is served at:

```text
http://127.0.0.1:4173/
```

Lobby sync uses `localStorage` and `BroadcastChannel`, so it works between tabs or windows in the same browser. Playing between different computers needs a small realtime server; without one, the other device cannot see the host's local lobby data.

Accounts are local-only for this static version. Usernames and passwords are stored in this browser's `localStorage`; a real public login system needs a server and proper password hashing.

## Render Server Deploy

This repo includes a basic WebSocket server in the `server/` folder.

Use these Render settings:

```text
Build Command:
cd server && npm install

Start Command:
cd server && npm start
```

If Render is set to `npm install` at the repo root, it will fail because the `package.json` file is inside `server/`.
