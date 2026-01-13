# Cartridge Specification

**The absolute contract for plug-and-play games.**

---

## ⚫ THE BLACK BOX RULE

**CRITICAL**: Games are **completely isolated black boxes**. Violating this creates nasty situations.

### What This Means

1. **NO CONTEXT ACCESS**: Games cannot access `useApp()`, `useEngine()`, `useAuth()`, or any global state.
2. **NO DIRECT DATABASE**: Games cannot write to Firebase/Supabase directly.
3. **NO NAVIGATION**: Games cannot navigate or access router.
4. **COMMUNICATION ONLY VIA PROPS**: All interaction happens through `BaseGameProps` callbacks.

### Why This Matters

- **Isolation**: Games can't break other games or the engine
- **Testability**: Games can be tested in isolation
- **Hot-swappable**: Games can be added/removed without refactoring
- **No Leaks**: Game logic stays in the game folder

### What Happens If You Violate This

- ❌ Game breaks on navigation
- ❌ State leaks between games
- ❌ Database writes fail silently
- ❌ Engine crashes on unmount

---

## Folder Structure

```
plugins/games/[game-id]/
├── index.tsx          # Cartridge export (REQUIRED)
├── logic.tsx          # Game component (REQUIRED)
├── manifest.json      # Game metadata (REQUIRED)
├── icon.png           # Game icon (REQUIRED)
├── core/              # Game logic (REQUIRED - put ALL game logic here)
│   ├── types.ts       # Type definitions
│   ├── grid-logic.ts  # Game rules/mechanics
│   ├── parser.ts      # Level/data parsing
│   └── ...            # Other game-specific utilities
├── tutorial.tsx       # Tutorial component (OPTIONAL)
├── board.tsx          # Board component (OPTIONAL)
└── levels/            # Level data (OPTIONAL, level-based only)
    ├── easy/
    ├── medium/
    ├── hard/
    └── extreme/
```

**BLACK BOX RULE**: Everything game-specific stays in this folder. No imports from `src/` except `@/types` and `@/shared/hooks/useTheme`.

**`core/` folder**: Put ALL game logic here. This is where a game's brain lives. Keep it pure (no React, no UI, just logic).

---

## Manifest Schema

```json
{
  "id": "game-id",
  "folderName": "game-id",
  "name": "Game Name",
  "version": "1.0.0",
  "entryPoint": "index.tsx",
  "display": {
    "title": "Display Name",
    "description": "Short description",
    "themeToken": [1, 5],
    "previewImage": "preview.jpg"
  },
  "gameplay": {
    "tags": ["logic", "spatial"],
    "displayTags": ["logic"],
    "progressionType": "level-based" | "endless" | "high-score"
  },
  "requirements": {
    "minEngineVersion": "2.0",
    "externalAssets": false,
    "offlineReady": true
  }
}
```

**Required Fields**:
- `id`: Must match folder name
- `progressionType`: Determines save behavior (`level-based` → level map, `endless`/`high-score` → score map)

---

## Data Contract

### Props Interface

```typescript
interface BaseGameProps {
  interactive?: boolean;                    // false = feed preview, true = playable
  onInteraction?: () => void;              // Called on first tap (feed → overlay)
  onGameEnd?: (result: 'win' | 'loss' | 'draw', completionData?: any, finalGameData?: any) => void;
  onStateChange?: (gameData: any) => void; // Emit state changes for feed preview
  gameId?: string;                         // Unique ID for this game instance
  initialStatus?: 'new' | 'playing' | 'completed';
  initialGameData?: any;                   // Restore saved state
  initialCompletionData?: any;
  levelData?: any;                         // Level data (level-based games)
  difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
  levelNumber?: number;
  hapticsEnabled?: boolean;                // Default: true
}
```

### Callback Requirements

**`onGameEnd(result, completionData, finalGameData)`**:
- **When**: After 300ms victory animation completes
- **result**: `'win'` | `'loss'` | `'draw'`
- **completionData**: 
  - Level-based: `undefined` or `{ levelId?: string }`
  - Score-based: `{ score: number }`
- **finalGameData**: Complete game state (for feed preview restoration)

**`onStateChange(gameData)`**:
- **When**: Any state change (moves, score updates, etc.)
- **Purpose**: Feed preview sync
- **Call immediately** after `setState` (use `requestAnimationFrame` if needed)

---

## UI Protocols

### Victory Lap (300ms delay)

```typescript
// ❌ WRONG: Immediate callback
if (isWin) {
  onGameEnd('win', data);
}

// ✅ CORRECT: 300ms delay
if (isWin) {
  // Show celebration animation
  setTimeout(() => {
    onGameEnd('win', data, finalState);
  }, 300);
}
```

### Interaction Lock

```typescript
// Disable input immediately on win
if (gameState === 'won') {
  return; // Early return in all handlers
}
```

### Theme Sync

```typescript
// ✅ ALLOWED: useTheme is read-only, safe for black box
import { useTheme } from '@/shared/hooks/useTheme';

const theme = useTheme();
// Use theme.colors, theme.background, theme.text, etc.
```

**Note**: `useTheme()` is the ONLY shared hook allowed. It's read-only and doesn't break isolation.

---

## State & Cleanup Rules

**BLACK BOX REQUIREMENT**: Games must clean up after themselves. No memory leaks, no hanging timers.

### Initialization Guard

```typescript
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;
  // Initialize once
}, []);
```

**Why**: Prevents double-renders when props change. Critical for black box isolation.

### Cleanup on Unmount

```typescript
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  const interval = setInterval(() => {}, 1000);
  const animation = Animated.timing(...);
  
  return () => {
    clearTimeout(timer);
    clearInterval(interval);
    animation.stop();
    // Clean up ALL timers, listeners, animations
  };
}, []);
```

**Required**: Clean up ALL:
- `setTimeout` / `clearTimeout`
- `setInterval` / `clearInterval`
- `Animated` listeners
- Event listeners
- Any refs that hold timers/intervals

**Why**: If it don't clean up, timers fire after unmount → crashes, memory leaks, broken engine state.

---

## Cartridge Export

```typescript
// plugins/games/[game-id]/index.tsx
import { GameComponent } from './logic';
import { Tutorial } from './tutorial';
import { getLevel, LEVEL_MAP } from './levels';
import manifest from './manifest.json';

export const GameCartridge = {
  id: 'game-id' as const,
  folderName: manifest.folderName,
  Component: GameComponent,
  Tutorial: Tutorial,
  levelLoader: getLevel,        // OPTIONAL (level-based only)
  levelMap: LEVEL_MAP,         // OPTIONAL (level-based only)
  manifest: manifest,
};

export default GameComponent;
```

---

## Registration

Add to `plugins/games/index.ts`:

```typescript
export const GAME_INDEX = {
  'game-id': () => import('./game-id'),
  // ... other games
};
```

**Auto-discovery**: Game registers automatically on app startup.

---

## Progression Types

| Type | Save Behavior | completionData Shape |
|------|---------------|---------------------|
| `level-based` | Updates `levelProgressMap` | `undefined` or `{ levelId?: string }` |
| `endless` | Updates `scoreProgressMap` | `{ score: number }` |
| `high-score` | Updates `scoreProgressMap` | `{ score: number }` |

---

## ⚫ BLACK BOX: Forbidden Imports

**VIOLATING THIS BREAKS THE ENGINE. DO NOT DO THIS.**

❌ **FORBIDDEN** (will cause crashes/leaks):
- `@/context/AppContext` - NO global app state access
- `@/context/AuthContext` - NO auth state access
- `@/context/NavigationContext` - NO navigation access
- `@/engine/EngineContext` - NO engine state access
- `expo-router` hooks (`useRouter`, `useNavigation`) - NO navigation
- Firebase/Supabase services directly - NO database writes
- Any `src/shared/services/*` - NO service layer access

✅ **ALLOWED** (safe imports):
- `@/types` - Type definitions only (BaseGameProps, Difficulty, etc.)
- `@/shared/hooks/useTheme` - Read-only theme access
- React Native core (`react`, `react-native`)
- Game-specific utilities in `core/` folder (own code)

**Remember**: If game needs something, it must come through `BaseGameProps`.

---

## Checklist

**BLACK BOX VERIFICATION** (most important):
- [ ] **NO** imports from `@/context/*`
- [ ] **NO** imports from `@/engine/*`
- [ ] **NO** navigation/router hooks
- [ ] **NO** Firebase/Supabase services
- [ ] **ALL** game logic in `core/` folder
- [ ] **ONLY** `useTheme()` hook from shared code

**Implementation**:
- [ ] Folder structure matches spec (including `core/`)
- [ ] `manifest.json` has all required fields
- [ ] Component implements `BaseGameProps`
- [ ] `onGameEnd` called after 300ms delay on win
- [ ] Input disabled immediately on win
- [ ] `onStateChange` called on all state updates
- [ ] `initializedRef` prevents double-init
- [ ] All timers/listeners cleaned up on unmount
- [ ] Cartridge exported correctly
- [ ] Added to `plugins/games/index.ts`

---

**⚫ BLACK BOX FIRST. Everything else second. Follow this or the game won't work.**

