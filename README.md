# Cave Swinger Online

Cave Swinger Online is a browser physics platformer with 5 digit party lobbies, deterministic shared cave maps, faded opponent characters, checkpoint respawns, and race timing.

## Features

- Create Lobby with a 5 digit party code
- Join Lobby with a 5 digit party code
- Single-player practice mode
- Host map length selection: 0.5x, Standard, or 2x
- Same generated cave map for everyone in a lobby
- Other players render as faded characters
- Checkmark respawn markers every 10% from 0% through 90%
- Press `R` or crash to respawn at the latest checkpoint
- First player through the exit portal wins
- No collectible currency items in solo or lobby play

## Local Play

The app is served at:

```text
http://127.0.0.1:4173/
```

Lobby sync uses `localStorage` and `BroadcastChannel`, so it works between tabs or windows in the same browser. Playing between different computers needs a small realtime server.
