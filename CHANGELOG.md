# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2026-03-21

### Added

- `update` CLI command — checks npm for the latest version, clears the npx cache, and shows next steps. No reconfiguration needed.
- Updating section in README with instructions for keeping the package up to date

## [2.1.0] - 2026-03-21

### Added

- 5 new thread tools (10 → 15 total, 134 → 139 overall):
  - `get_thread` — get detailed thread info (type, slowmode, auto-archive, owner, URL)
  - `get_thread_messages` — read messages from a thread with before/after pagination
  - `list_archived_threads` — list public or private archived threads in a channel
  - `edit_thread` — edit thread name, auto-archive duration, slowmode, locked/archived status
  - `get_thread_pinned_messages` — get all pinned messages in a thread
- Thread-aware fuzzy matching in `smartFindTextChannel` — all 14 message tools (send, edit, pin, react, etc.) now work in threads automatically
- Archived thread support — direct ID fetch fallback in both `findThread` and `smartFindTextChannel` so archived threads are accessible by ID

## [2.0.0] - 2026-02-22

### Added

- 35 new tools across 6 new categories and 7 existing categories (99 → 134 total)
- **Polls** (3 tools): send_poll, get_poll_results, end_poll
- **Direct Messages** (2 tools): send_dm, send_dm_embed
- **Bot Presence** (2 tools): set_bot_status, get_bot_info
- **Server Templates** (4 tools): list_templates, create_template, delete_template, sync_template
- **Application Commands** (4 tools): list_commands, create_command, edit_command, delete_command
- **Onboarding** (2 tools): get_onboarding, edit_onboarding
- **Channels** (+4): check_permissions, copy_channel_permissions, set_voice_status, list_voice_members
- **Members** (+3): search_members, bulk_ban, purge_user_messages
- **Messages** (+1): send_message_with_file
- **Roles** (+2): list_role_members, list_member_permissions
- **Server Admin** (+3): get_invite, get_server_icon, set_server_icon
- **Threads** (+3): add_thread_member, remove_thread_member, list_thread_members
- **Events** (+1): get_event_subscribers
- Administrator permission option in init wizard — avoids role hierarchy issues
- Bot self-lockout prevention when making channels private (auto-grants bot access before denying @everyone)
- Enriched error messages for Discord API errors (Missing Access, Missing Permissions) with actionable hints

### Improved

- Error handler now detects Discord error codes (50013, 50001, 50035) and returns fix instructions
- set_channel_permissions automatically preserves bot access when denying @everyone ViewChannel

## [1.4.0] - 2026-02-22

### Added

- Typewriter animation effect on the welcome message for a polished first impression
- Token format pre-validation — detects malformed tokens before attempting Discord login
- Retry loop on invalid token — users can paste a new token without restarting the wizard
- Quick permission pre-check built into `init` — shows pass/fail summary right after guild selection
- Configuration summary card at the end of setup showing bot, server, and clients configured
- Staged spinner messages during connection (`Resolving gateway...` → `Authenticating...` → `Fetching servers...`)
- Richer guild selection display with boost level indicators
- Smooth animated transitions between wizard steps

### Improved

- Spinner now supports `.update()` to change its message mid-animation
- Completion banner uses typewriter animation for a satisfying finish
- Guild info shows boost tier, member count, and ID in a formatted row
- Next steps box has cleaner column alignment for all client names
- Authentication failure now offers to retry instead of exiting immediately
- Help text updated to say "any MCP client" instead of just Claude Code

## [1.3.1] - 2026-02-22

### Added

- Troubleshooting section in README covering all common errors with fixes
- Actionable startup error messages that point to `init` or `check` commands
- More npm keywords for discoverability (cursor, windsurf, claude-desktop, ai-tools)
- GitHub repo topics for better search visibility

### Improved

- Startup log messages use `[discord-mcp]` prefix for cleaner output
- Error on missing token/guild now shows the exact command to fix it
- Failed startup points to `npx @quadslab.io/discord-mcp check` for diagnostics

## [1.3.0] - 2026-02-22

### Fixed

- MCP server version was hardcoded to `1.0.0` — now reads dynamically from `package.json`
- CLI logo showed hardcoded `v1.0` — removed (version shown via `--version` flag instead)
- Dead code: Windsurf path ternary had identical branches
- Missing `Manage Auto Moderation` permission in bot setup guide
- `CHANGELOG.md` was excluded from npm package — now included
- Duplicate startup log messages consolidated

### Improved

- `docs/discord-mcp-server.md` — rewritten setup section with CLI-first workflow, multi-client config table
- `docs/bot-setup-guide.md` — Step 6 now leads with `npx init` wizard, manual setup as fallback
- `CONTRIBUTING.md` — added project structure diagram, CLI development section, and CHANGELOG to docs checklist
- `.github/PULL_REQUEST_TEMPLATE.md` — added CLI testing and CHANGELOG checklist items
- `.env.example` — documented `BOT_TOKEN` fallback
- `package.json` — added `exports` map for ESM consumers, updated description to mention all supported clients
- README architecture diagram updated with accurate file descriptions

## [1.2.3] - 2026-02-22

### Fixed

- Init wizard now detects non-project directories (Desktop, Downloads, home, Documents, etc.) and writes Claude Code config to global `~/.claude.json` instead of a useless project-scoped `.mcp.json`
- Shows a warning when running from a suspicious directory with clear explanation of what will happen

## [1.2.2] - 2026-02-22

### Fixed

- `@everyone` role now resolves correctly — was previously excluded from the role cache, causing "not found" errors when targeting it in permission tools
- Role cache now includes `@everyone` alongside all other roles

## [1.2.1] - 2026-02-22

### Fixed

- Discord gateway rate limit errors (opcode 8) during startup member fetch — now retries with exponential backoff
- All 99 tool calls now automatically retry on rate limits (up to 3 attempts with backoff)
- Rate limit `retry_after` value is parsed from Discord's error response for optimal wait times

## [1.2.0] - 2026-02-22

### Added

- Multi-client support in `init` wizard — auto-detects and configures:
  - Claude Code (`.mcp.json`)
  - Claude Desktop (`claude_desktop_config.json`)
  - Cursor (`~/.cursor/mcp.json`)
  - Windsurf (`~/.codeium/windsurf/mcp_config.json`)
- "All detected" option to configure every installed client at once
- "Skip" option with manual config output and file path reference
- Client-specific next steps shown after setup

## [1.1.0] - 2026-02-22

### Added

- Interactive CLI setup wizard (`npx @quadslab.io/discord-mcp init`)
  - Guided bot creation with step-by-step instructions
  - Live token validation with masked input
  - Auto-generated invite URL with all required permissions
  - Server auto-discovery and selection
  - Automatic `.mcp.json` generation with merge support
- Health check command (`npx @quadslab.io/discord-mcp check`)
  - Token and server validation
  - Full permission audit with visual progress bar
  - Color-coded pass/fail output
- Help and version commands
- Branded CLI output with QuadsLab.io ASCII art, ANSI colors, animated spinners
- TTY detection — auto-starts MCP server when launched via `.mcp.json`

### Changed

- Binary entry point changed from `mcp-server.js` to `cli.js`
- `mcp-server.ts` now exports `main()` for CLI imports

## [1.0.0] - 2026-02-22

### Added

- Initial release with 99 tools across 14 categories
- Guild tools (2): server info and metadata
- Role tools (9): CRUD, permissions, icons, assignment
- Channel tools (16): CRUD, permissions, locking, slowmode, cloning, forums, reordering
- Member tools (12): moderation, timeouts, pruning, bulk role operations, voice management
- Message tools (13): send, edit, delete, bulk delete, pins, reactions, crossposting
- Reaction tools (1): detailed reactor info with account age, join date, roles, boost status
- Server admin tools (13): settings, invites, bans, audit log, welcome screen, widget, integrations
- Thread tools (7): create, archive, lock, delete
- Forum tools (5): posts, tag management
- Emoji and sticker tools (7): upload, rename, delete
- Webhook tools (4): CRUD and message sending
- Scheduled event tools (4): create, edit, delete
- Stage instance tools (3): start, end, list
- Auto-moderation tools (4): rule CRUD
- Fuzzy name matching for all channel, role, and member parameters
- Pre-cached server data for instant lookups
- 3 MCP resources for server overview data
- Audit log reason support on all modifying operations
- Helpful error messages with name suggestions on failed lookups
