# Pipes Game Black Box Implementation Plan

## 🎯 Objective
Transform Pipes into the **FIRST** fully isolated "black box" game cartridge that communicates ONLY through standardized props and callbacks, establishing the pattern for all future games.

---

## 📋 Current State Analysis

### ✅ What Exists
1. **Legacy Implementation**: `plugins/games/pipes/OLDPIPESLOGIC.tsx` - Complete game logic (1100+ lines)
2. **Game Structure**: `plugins/games/pipes/index.tsx` - References non-existent `Logic.tsx`
3. **Manifest**: `plugins/games/pipes/manifest.json` - Game metadata
4. **Level Folders**: Empty folders for easy/medium/hard/extreme levels
5. **Tutorial**: `plugins/games/pipes/Tutorial.tsx` - Tutorial component

### ❌ What's Missing
1. **Logic.tsx**: Referenced but doesn't exist (index.tsx imports from './Logic')
2. **Level Loader**: No `levels/index.ts` with level loading function
3. **Game Registration**: Not registered in game registry
4. **BaseGameProps Extension**: Missing props (`onStateChange`, `initialGameData`, etc.)
5. **Pure Logic Separation**: Core game logic mixed with UI/React code

---

## 🏗️ Architecture: Black Box Communication Contract

### Input Props (What Game Receives)
```typescript
interface PipesGameProps extends BaseGameProps {
  // Core props (from BaseGameProps)
  interactive?: boolean;
  onInteraction?: (data?: any) => void;
  onGameEnd?: (result: 'win' | 'loss' | 'draw', data?: any, finalGameData?: any) => void;
  gameId?: string;
  initialStatus?: FeedGameStatus;
  gameContentOpacity?: Animated.Value;
  
  // State restoration props (NEW - need to add to BaseGameProps)
  onStateChange?: (gameData: any) => void;  // ⚠️ MISSING FROM BaseGameProps
  initialGameData?: PipesGameData;           // ⚠️ MISSING FROM BaseGameProps
  initialCompletionData?: any;               // ⚠️ MISSING FROM BaseGameProps
  
  // Level data props (NEW - need to add to BaseGameProps)
  levelData?: { layout: string };           // ⚠️ MISSING FROM BaseGameProps
  difficulty?: Difficulty;                  // ⚠️ MISSING FROM BaseGameProps
  levelNumber?: number;                     // ⚠️ MISSING FROM BaseGameProps
  pendingInteraction?: number;              // ⚠️ MISSING FROM BaseGameProps (for feed->overlay)
}
```

### Output Callbacks (What Game Emits)
```typescript
// State updates during gameplay
onStateChange(gameData: PipesGameData) => void

// Game completion
onGameEnd('win' | 'loss' | 'draw', completionData?: {
  completionTime: number;
  result: 'win' | 'loss' | 'draw';
}, finalGameData?: PipesGameData) => void

// User interactions (for feed preview)
onInteraction(cellIndex?: number) => void
```

### Internal State (Never Exposed)
- Grid rotations
- Water flow calculations
- Animation states
- Haptic feedback (self-contained)
- Theme access (via props, not context)

---

## 📂 File Structure Plan

```
plugins/games/pipes/
├── index.tsx                    # ✅ EXISTS - Cartridge export
├── Logic.tsx                    # ❌ MISSING - Main game component (BLACK BOX)
├── board.tsx                    # ✅ EXISTS - Empty placeholder
├── manifest.json                # ✅ EXISTS - Game metadata
├── Tutorial.tsx                 # ✅ EXISTS - Tutorial component
├── OLDPIPESLOGIC.tsx           # ✅ EXISTS - Reference implementation
│
├── levels/
│   ├── index.ts                 # ❌ MISSING - Level loader function
│   ├── easy/
│   │   └── level-1.json        # ❌ MISSING - Level data files
│   ├── medium/
│   ├── hard/
│   └── extreme/
│
└── core/                        # ❌ NEW - Pure logic (no React)
    ├── types.ts                 # Game-specific types
    ├── definitions.ts           # PIECE_DEFINITIONS
    ├── parser.ts                # parsePipesGrid()
    └── flow.ts                  # calculateFlow()
```

---

## 🔧 Implementation Steps

### Phase 1: Fix BaseGameProps Interface ⚠️ CRITICAL
**File**: `src/types/index.ts`

**Problem**: Games use props that aren't defined in `BaseGameProps`, causing TypeScript issues and unclear contracts.

**Solution**: Extend `BaseGameProps` to include all props used by games:

```typescript
export interface BaseGameProps {
  // Existing props
  interactive?: boolean;
  onInteraction?: (data?: any) => void;
  onGameEnd?: (result: 'win' | 'loss' | 'draw', data?: any, finalGameData?: any) => void;
  gameId?: string;
  initialStatus?: FeedGameStatus;
  gameContentOpacity?: Animated.Value;
  
  // NEW: State management props
  onStateChange?: (gameData: any) => void;
  initialGameData?: any;
  initialCompletionData?: any;
  
  // NEW: Level-based game props
  levelData?: any;
  difficulty?: Difficulty;
  levelNumber?: number;
  pendingInteraction?: any;
}
```

**Impact**: This fixes the contract for ALL games, not just Pipes.

---

### Phase 2: Extract Pure Logic (No React Dependencies)
**Files**: `plugins/games/pipes/core/*.ts`

**Goal**: Create pure TypeScript functions that can be tested independently.

#### 2.1 Create `core/types.ts`
```typescript
export type Rotation = 0 | 1 | 2 | 3;
export type PipeType = 'S' | 'L' | 'T' | 'X' | 'K1' | 'K2' | 'K3' | 'K4' | 'P';

export interface PipeCell {
  row: number;
  col: number;
  type: PipeType;
  currentRotation: Rotation;
  isWatered: boolean;
}

export interface PipesGameData {
  grid: PipeCell[][];
  gameState: 'playing' | 'won';
  poolsFilled: number;
  poolCount: number;
  source: { row: number; col: number };
}
```

#### 2.2 Create `core/definitions.ts`
- Move `PIECE_DEFINITIONS` from OLDPIPESLOGIC.tsx
- Pure object, no React imports

#### 2.3 Create `core/parser.ts`
- Move `parsePipesGrid()` function
- Pure function: `(layout: string, seedOrRotations?: Rotation[][] | string) => { grid, source }`
- No React, no hooks, no side effects

#### 2.4 Create `core/flow.ts`
- Move `calculateFlow()` function
- Pure function: `(grid: PipeCell[][], source: {row, col}, poolCount: number) => { newGrid, poolsFilled, isGameWon, connectionLevels, cellLevels }`
- No React, no hooks, no side effects

---

### Phase 3: Create Black Box Game Component
**File**: `plugins/games/pipes/Logic.tsx`

**Architecture**:
```typescript
export const Pipes: React.FC<PipesGameProps> = ({
  interactive = true,
  onInteraction,
  onGameEnd,
  onStateChange,
  gameId,
  initialStatus,
  initialGameData,
  initialCompletionData,
  levelData,
  difficulty,
  levelNumber,
  pendingInteraction,
  gameContentOpacity,
}) => {
  // ✅ ALLOWED: React hooks for component state
  // ✅ ALLOWED: Theme via useTheme() hook (or pass as prop)
  // ✅ ALLOWED: Haptics (self-contained, no global state)
  // ❌ FORBIDDEN: useApp(), useEngine(), useAuth(), router navigation
  // ❌ FORBIDDEN: Direct Firestore/AsyncStorage access
  // ❌ FORBIDDEN: Global context access (except theme)
  
  // Game logic flow:
  // 1. Initialize from initialGameData OR levelData
  // 2. Handle user interactions (rotation)
  // 3. Calculate flow on grid changes
  // 4. Call onStateChange() after every state update
  // 5. Call onGameEnd() when won
  // 6. Handle pendingInteraction for feed->overlay transition
};
```

**Key Principles**:
1. **No Global Contexts**: If game needs haptics setting, pass as prop (or use local state)
2. **Pure State Management**: All game state lives in component, never touches app state
3. **Callback-Only Communication**: Only way to communicate out is via callbacks
4. **Deterministic Initialization**: Same `gameId` + `levelData` = same initial state
5. **State Restoration**: `initialGameData` always takes precedence over `levelData`

**Migration from OLDPIPESLOGIC.tsx**:
- Copy component structure
- Remove `useApp()` calls (haptics should be passed as prop or use local default)
- Ensure `onStateChange` is called after every state update
- Keep all UI rendering logic
- Keep all animation logic
- Keep haptic feedback (but make it optional/configurable)

---

### Phase 4: Create Level Loader
**File**: `plugins/games/pipes/levels/index.ts`

**Function Signature**:
```typescript
export function getPipesLevel(
  difficulty: Difficulty,
  levelNumber: number
): { layout: string } | null {
  // Load JSON file from levels/{difficulty}/level-{levelNumber}.json
  // Return { layout: string } or null if not found
}
```

**Implementation Pattern** (matching Sudoku):
```typescript
// Static imports required by Metro bundler
import easy1 from './easy/level-1.json';
import easy2 from './easy/level-2.json';
// ... etc

const LEVEL_MAP: Record<string, any> = {
  'easy-1': easy1,
  'easy-2': easy2,
  // ... etc
};

export function getPipesLevel(difficulty: Difficulty, levelNumber: number) {
  const key = `${difficulty}-${levelNumber}`;
  const level = LEVEL_MAP[key];
  return level ? { layout: level.layout } : null;
}
```

**Level JSON Format**:
```json
{
  "layout": "S L T X\nK3 P L S\nT X P K1\n..."
}
```

---

### Phase 5: Register Game in Registry
**File**: `src/shared/constants/games.ts` (or wherever registration happens)

**Registration Code**:
```typescript
import { registerGame } from './game-registry';
import { PipesGame } from '@/plugins/games/pipes';
import { getPipesLevel } from '@/plugins/games/pipes/levels';
import pipesManifest from '@/plugins/games/pipes/manifest.json';

export function registerAllGames(): void {
  // Register Pipes game
  registerGame('pipes', {
    component: PipesGame.Component,
    manifest: pipesManifest,
    levelLoader: getPipesLevel,
  });
  
  // ... other games
}
```

**Update**: `plugins/games/pipes/index.tsx`
```typescript
import { Pipes } from './Logic';
import { getPipesLevel } from './levels';

export { Pipes as default };

export const PipesGame = {
  Component: Pipes,
  levelLoader: getPipesLevel,
};
```

---

### Phase 6: Data Save/Load Flow

#### 6.1 Feed View (Non-Interactive)
```typescript
// In app/(tabs)/index.tsx renderItem()
<GameRenderer
  gameType="pipes"
  interactive={false}
  onStateChange={handleFeedStateChange}  // Saves to FeedItem.gameState
  initialGameData={feedItem.gameState?.gameData}
  initialStatus={feedItem.gameState?.status}
  levelData={levelData}
  gameId={feedItem.id}
/>

// handleFeedStateChange saves to:
feedItem.gameState = {
  status: 'playing',
  gameData: gameData,  // PipesGameData
  completionData: undefined,
}
```

#### 6.2 Overlay View (Interactive)
```typescript
// In app/(tabs)/index.tsx renderGameOverlay()
<GameRenderer
  gameType="pipes"
  interactive={true}
  onStateChange={handleStateChange}  // Saves to FeedItem.gameState
  onGameEnd={handleGameEnd}          // Handles completion
  initialGameData={item.gameState?.gameData}  // Restore from feed
  initialStatus={item.gameState?.status}
  levelData={levelData}
  pendingInteraction={item.pendingInteraction}  // Feed interaction
  gameId={gameId}
/>

// handleStateChange saves to:
feedItem.gameState = {
  status: 'playing',
  gameData: updatedGameData,  // Updated PipesGameData
  completionData: undefined,
}

// handleGameEnd saves to:
feedItem.gameState = {
  status: 'completed',
  gameData: finalGameData,
  completionData: {
    completionTime: 12345,
    result: 'win',
  },
}
```

#### 6.3 Game Component State Management
```typescript
// In Logic.tsx
const [gameData, setGameData] = useState<PipesGameData>(() => {
  // Priority: initialGameData > levelData > empty
  if (initialGameData) {
    return initialGameData;  // Restore saved state
  }
  if (levelData) {
    return parsePipesGrid(levelData.layout, gameId);  // New game
  }
  return emptyState;  // Feed preview placeholder
});

// After every state change:
useEffect(() => {
  if (onStateChange && initialized) {
    requestAnimationFrame(() => {
      onStateChange(gameData);  // Emit state update
    });
  }
}, [gameData, onStateChange]);
```

---

## 🚨 Critical Considerations

### 1. Haptics Isolation
**Problem**: OLDPIPESLOGIC.tsx uses `useApp().hapticsEnabled`

**Solution Options**:
- **Option A**: Pass `hapticsEnabled` as prop (cleanest)
- **Option B**: Use local state with default `true` (simpler, less flexible)
- **Option C**: Create `useGameHaptics()` hook that reads from props or defaults

**Recommendation**: Option A - Add `hapticsEnabled?: boolean` to `BaseGameProps`

### 2. Theme Access
**Problem**: Games need theme colors for rendering

**Current**: Games use `useTheme()` hook (acceptable, it's a read-only context)

**Recommendation**: Keep `useTheme()` - it's read-only and doesn't break black box principle

### 3. State Restoration Complexity
**Problem**: Pipes has complex state (grid, rotations, water flow, pools)

**Solution**: 
- `PipesGameData` must be fully serializable
- Save complete state, not just rotations
- Restore animations immediately (no re-animation) when restoring state

### 4. Feed → Overlay Transition
**Problem**: User interacts in feed, then opens overlay - state must transfer

**Solution**:
- Feed saves state via `onStateChange`
- Overlay receives `initialGameData` from feed
- `pendingInteraction` prop handles feed interactions (cell rotation)

### 5. Level Data Loading
**Problem**: Games need level data, but shouldn't know about file system

**Solution**:
- Level data passed as prop (`levelData`)
- Feed/Overlay loads level data via `loadLevelData()` before rendering
- Game never directly loads files

### 6. Game Registration Timing
**Problem**: Games must be registered before feed tries to render them

**Solution**:
- Register in `app/_layout.tsx` on app startup
- Use static imports (Metro bundler requirement)

---

## ✅ Success Criteria

1. **✅ Black Box Isolation**
   - No `useApp()`, `useEngine()`, `useAuth()` calls
   - No direct Firestore/AsyncStorage access
   - No router navigation from game component

2. **✅ Communication Contract**
   - Only receives props (no global state)
   - Only emits callbacks (`onStateChange`, `onGameEnd`, `onInteraction`)
   - TypeScript types enforce contract

3. **✅ State Persistence**
   - Feed view saves state correctly
   - Overlay view restores state correctly
   - Feed → Overlay transition preserves state
   - App restart restores state (via feed items)

4. **✅ Level System**
   - Level loader function works
   - Levels load from JSON files
   - Game registry includes level loader

5. **✅ Game Registration**
   - Game appears in feed
   - Game renders in overlay
   - Game can be selected from level select screen

6. **✅ Pure Logic Separation**
   - Core logic functions are testable (no React)
   - Logic functions have no side effects
   - UI components use logic functions

---

## 📝 Migration Checklist

- [ ] **Phase 1**: Extend `BaseGameProps` interface
- [ ] **Phase 2.1**: Create `core/types.ts`
- [ ] **Phase 2.2**: Create `core/definitions.ts` (PIECE_DEFINITIONS)
- [ ] **Phase 2.3**: Create `core/parser.ts` (parsePipesGrid)
- [ ] **Phase 2.4**: Create `core/flow.ts` (calculateFlow)
- [ ] **Phase 3**: Create `Logic.tsx` (main component, black box)
- [ ] **Phase 4**: Create `levels/index.ts` (level loader)
- [ ] **Phase 5**: Register game in registry
- [ ] **Phase 6**: Test feed view state saving
- [ ] **Phase 7**: Test overlay view state restoration
- [ ] **Phase 8**: Test feed → overlay transition
- [ ] **Phase 9**: Test level loading
- [ ] **Phase 10**: Test game completion flow
- [ ] **Phase 11**: Remove `OLDPIPESLOGIC.tsx` (archive, don't delete)

---

## 🎓 Pattern for Future Games

This Pipes implementation establishes the pattern for ALL future games:

1. **Pure Logic**: Extract game logic to `core/` folder (no React)
2. **Black Box Component**: Game component only uses props/callbacks
3. **Level Loader**: Each game manages its own levels via `levels/index.ts`
4. **State Contract**: Use `UniversalGameState` format for state persistence
5. **Registration**: Register via `registerGame()` with component + levelLoader

---

## 🔍 Reference Files

- **Legacy Implementation**: `plugins/games/pipes/OLDPIPESLOGIC.tsx`
- **Game Registry**: `src/shared/constants/game-registry.ts`
- **Base Props**: `src/types/index.ts` (BaseGameProps)
- **Feed Integration**: `app/(tabs)/index.tsx` (renderItem, renderGameOverlay)
- **Level Loading**: `src/shared/utils/game-manager.ts` (loadLevelData)
- **Example Game**: `plugins/games/sudoku/` (has level loader)

---

## ⚠️ Known Issues to Address

1. **BaseGameProps Missing Props**: Critical - must fix before implementation
2. **Haptics Access**: Need to decide on prop vs local state
3. **Theme Access**: Currently uses `useTheme()` - acceptable but document it
4. **State Serialization**: Ensure `PipesGameData` is fully serializable
5. **Animation Restoration**: Skip animations when restoring saved state

---

**Status**: 📋 PLANNING COMPLETE - Ready for implementation

