\# Nooma Scroll V2 - Modular



\### Architecture: Handshakes

This project uses a \*\*Plugin-Based Architecture\*\*. The Engine (Core) and Games (Plugins) are decoupled and communicate via a shared "Handshake."



\- \*\*`/src/shared`\*\*: Global Rulebook. Contains the Types, Themes, and Constants that every game must follow to fit/function in the feed.

\- \*\*`/src/plugins`\*\*: Content Management. Games are built as independent folders. Dropping a new game folder here makes it instantly available to the Scanner.

\- \*\*`/src/engine`\*\*: Communication. Logic for scanning plugins, providing levels, and the algorithmic feed.



\### The Drop-In Flow

To add a new game, you simply "Drop-In" a folder to `/plugins/games/` with a `manifest.json`.

1\. \*\*Scanner\*\* finds the folder and reads the metadata.

2\. \*\*Registry\*\* adds it to the available pool.

3\. \*\*Algorithm\*\* serves it into the feed.



\### 🎨 Theme Injection

Every component is "Theme-Aware." Instead of colors, we use \*\*Dynamic Tokens\*\* (1-8).

\- \*\*Engine\*\* provides the Theme via `useTheme`.

\- \*\*Game\*\* renders using tokens (e.g., `theme.colors\[1]`).

\- \*\*Result\*\*: Swapping the theme in the Engine changes every page and game app wide instantly.

