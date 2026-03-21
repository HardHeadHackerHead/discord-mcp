#!/usr/bin/env node
/**
 * CLI entry point for @quadslab.io/discord-mcp
 *
 * Subcommands:
 *   init  - Interactive setup wizard
 *   check - Health check and permission audit
 *   start - Start the MCP server (default)
 */

import readline from 'readline';
import os from 'os';
import { Client, GatewayIntentBits, PermissionFlagsBits, Guild } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ── ANSI Helpers ─────────────────────────────────────────────────────

const isColorSupported = process.stderr.isTTY && !process.env['NO_COLOR'];

const c = {
  reset:     isColorSupported ? '\x1b[0m' : '',
  bold:      isColorSupported ? '\x1b[1m' : '',
  dim:       isColorSupported ? '\x1b[2m' : '',
  italic:    isColorSupported ? '\x1b[3m' : '',
  underline: isColorSupported ? '\x1b[4m' : '',
  // Brand colors
  cyan:      isColorSupported ? '\x1b[36m' : '',
  cyanBright:isColorSupported ? '\x1b[96m' : '',
  magenta:   isColorSupported ? '\x1b[35m' : '',
  magentaBright: isColorSupported ? '\x1b[95m' : '',
  green:     isColorSupported ? '\x1b[32m' : '',
  greenBright: isColorSupported ? '\x1b[92m' : '',
  red:       isColorSupported ? '\x1b[31m' : '',
  redBright: isColorSupported ? '\x1b[91m' : '',
  yellow:    isColorSupported ? '\x1b[33m' : '',
  yellowBright: isColorSupported ? '\x1b[93m' : '',
  blue:      isColorSupported ? '\x1b[34m' : '',
  blueBright:isColorSupported ? '\x1b[94m' : '',
  white:     isColorSupported ? '\x1b[37m' : '',
  whiteBright: isColorSupported ? '\x1b[97m' : '',
  gray:      isColorSupported ? '\x1b[90m' : '',
  bgCyan:    isColorSupported ? '\x1b[46m' : '',
  bgMagenta: isColorSupported ? '\x1b[45m' : '',
};

// Stderr-only output (keeps stdout clean for MCP)
const out = (...args: string[]) => process.stderr.write(args.join(''));
const ln = (...args: string[]) => process.stderr.write(args.join('') + '\n');

// ── Brand Art ────────────────────────────────────────────────────────

const LOGO = `
${c.cyanBright}${c.bold}   ██████╗ ██╗   ██╗ █████╗ ██████╗ ███████╗${c.reset}
${c.cyanBright}${c.bold}  ██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝${c.reset}
${c.cyan}  ██║   ██║██║   ██║███████║██║  ██║███████╗${c.reset}
${c.cyan}  ██║▄▄ ██║██║   ██║██╔══██║██║  ██║╚════██║${c.reset}
${c.magenta}  ╚██████╔╝╚██████╔╝██║  ██║██████╔╝███████║${c.reset}
${c.magenta}   ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝${c.reset}
${c.magentaBright}${c.bold}        L A B ${c.dim}.io${c.reset}
`;

const LOGO_MINI = `${c.cyanBright}${c.bold}QuadsLab${c.magentaBright}.io${c.reset}`;

const DISCORD_MCP_BADGE = `${c.gray}[${c.reset}${c.blueBright}discord-mcp${c.reset}${c.gray}]${c.reset}`;

// ── Footer Links ────────────────────────────────────────────────────

function printFooter(): void {
  divider();
  ln('');
  ln(`  ${c.dim}Web${c.reset}       ${c.underline}${c.blueBright}https://QuadsLab.io${c.reset}`);
  ln(`  ${c.dim}Discord${c.reset}   ${c.underline}${c.blueBright}https://discord.gg/sjnb8wWGCJ${c.reset}`);
  ln(`  ${c.dim}GitHub${c.reset}    ${c.underline}${c.blueBright}https://github.com/HardHeadHackerHead/discord-mcp${c.reset}`);
  ln(`  ${c.dim}npm${c.reset}       ${c.underline}${c.blueBright}https://www.npmjs.com/package/@quadslab.io/discord-mcp${c.reset}`);
  ln('');
  ln(`  ${c.dim}Made with ♥ by${c.reset} ${LOGO_MINI}`);
  ln('');
}

// ── UI Components ────────────────────────────────────────────────────

function box(lines: string[], borderColor: string = c.gray): void {
  const stripped = lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, ''));
  const maxLen = Math.max(...stripped.map(l => l.length));
  const w = maxLen + 2;

  ln(`${borderColor}  ┌${'─'.repeat(w)}┐${c.reset}`);
  lines.forEach((line, i) => {
    const pad = maxLen - stripped[i]!.length;
    ln(`${borderColor}  │${c.reset} ${line}${' '.repeat(pad)} ${borderColor}│${c.reset}`);
  });
  ln(`${borderColor}  └${'─'.repeat(w)}┘${c.reset}`);
}

function divider(): void {
  ln(`${c.gray}  ${'─'.repeat(52)}${c.reset}`);
}

function clearScreen(): void {
  if (isColorSupported) {
    out('\x1b[2J\x1b[H'); // Clear screen and move cursor to top-left
  }
}

function stepHeader(current: number, total: number, title: string): void {
  clearScreen();

  // Persistent header: brand + progress bar
  ln('');
  const dots = Array.from({ length: total }, (_, i) => {
    if (i < current - 1) return `${c.greenBright}●${c.reset}`;
    if (i === current - 1) return `${c.cyanBright}●${c.reset}`;
    return `${c.gray}○${c.reset}`;
  }).join(' ');

  ln(`  ${LOGO_MINI} ${DISCORD_MCP_BADGE}  ${dots}  ${c.gray}(${current}/${total})${c.reset}`);
  divider();
  ln('');
  ln(`  ${c.bold}${c.whiteBright}${title}${c.reset}`);
  ln('');
}

function success(msg: string): void {
  ln(`  ${c.greenBright}✔${c.reset} ${msg}`);
}

function error(msg: string): void {
  ln(`  ${c.redBright}✖${c.reset} ${c.red}${msg}${c.reset}`);
}

function warn(msg: string): void {
  ln(`  ${c.yellowBright}⚠${c.reset} ${c.yellow}${msg}${c.reset}`);
}

function info(msg: string): void {
  ln(`  ${c.gray}${msg}${c.reset}`);
}

function bullet(msg: string): void {
  ln(`  ${c.cyan}›${c.reset} ${msg}`);
}

function link(url: string): void {
  ln(`  ${c.underline}${c.blueBright}${url}${c.reset}`);
}

// ── Timing Helpers ───────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ── Spinner ──────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function createSpinner(message: string): { stop: (finalMsg?: string) => void; update: (msg: string) => void } {
  let i = 0;
  let currentMsg = message;
  const interval = setInterval(() => {
    const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length];
    out(`\r  ${c.cyanBright}${frame}${c.reset} ${c.dim}${currentMsg}${c.reset}  `);
    i++;
  }, 80);

  return {
    update(msg: string) {
      // Clear old line then set new message
      out('\r' + ' '.repeat(currentMsg.length + 10) + '\r');
      currentMsg = msg;
    },
    stop(finalMsg?: string) {
      clearInterval(interval);
      out('\r' + ' '.repeat(currentMsg.length + 10) + '\r');
      if (finalMsg) ln(finalMsg);
    },
  };
}

// ── Typewriter Effect ────────────────────────────────────────────────

async function typewrite(text: string, delay: number = 25): Promise<void> {
  for (const char of text) {
    out(char);
    await sleep(delay);
  }
}

// ── Token Validation ─────────────────────────────────────────────────

function isTokenFormatValid(token: string): { valid: boolean; reason?: string } {
  // Discord bot tokens have 3 base64 segments separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Token should have 3 parts separated by dots' };
  }
  // First part is base64-encoded bot user ID
  try {
    const decoded = Buffer.from(parts[0]!, 'base64').toString();
    if (!/^\d+$/.test(decoded)) {
      return { valid: false, reason: 'First segment doesn\'t decode to a valid user ID' };
    }
  } catch {
    return { valid: false, reason: 'First segment is not valid base64' };
  }
  if (parts[1]!.length < 4 || parts[2]!.length < 20) {
    return { valid: false, reason: 'Token segments appear too short' };
  }
  return { valid: true };
}

// ── Readline ─────────────────────────────────────────────────────────

function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`  ${c.cyanBright}?${c.reset} ${question}`, (answer) => resolve(answer.trim()));
  });
}

function promptSecret(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    out(`  ${c.cyanBright}?${c.reset} ${question}`);

    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    let input = '';

    const onData = (ch: Buffer) => {
      const char = ch.toString('utf8');

      if (char === '\r' || char === '\n') {
        stdin.removeListener('data', onData);
        if (stdin.setRawMode) stdin.setRawMode(wasRaw ?? false);
        ln('');
        resolve(input.trim());
        return;
      }

      if (char === '\x7f' || char === '\b') {
        if (input.length > 0) {
          input = input.slice(0, -1);
          out('\b \b');
        }
        return;
      }

      if (char === '\x03') {
        // Ctrl+C
        ln('');
        process.exit(1);
      }

      input += char;
      out(`${c.dim}*${c.reset}`);
    };

    stdin.on('data', onData);
  });
}

async function promptConfirm(rl: readline.Interface, question: string, defaultYes: boolean = true): Promise<boolean> {
  const hint = defaultYes ? `${c.dim}(Y/n)${c.reset}` : `${c.dim}(y/N)${c.reset}`;
  const answer = (await prompt(rl, `${question} ${hint} `)).toLowerCase();
  if (!answer) return defaultYes;
  return answer === 'y' || answer === 'yes';
}

async function promptSelect(rl: readline.Interface, items: string[], question: string): Promise<number> {
  items.forEach((item, i) => {
    ln(`  ${c.cyanBright}${i + 1}${c.reset}${c.gray}.${c.reset} ${item}`);
  });
  ln('');
  const choice = await prompt(rl, `${question} `);
  return parseInt(choice, 10) - 1;
}

async function waitForEnter(rl: readline.Interface, msg: string = 'Press Enter to continue...'): Promise<void> {
  await prompt(rl, `${c.dim}${msg}${c.reset} `);
}

// ── Permissions ──────────────────────────────────────────────────────

const REQUIRED_PERMISSIONS = [
  { flag: PermissionFlagsBits.ManageRoles, name: 'Manage Roles' },
  { flag: PermissionFlagsBits.ManageChannels, name: 'Manage Channels' },
  { flag: PermissionFlagsBits.KickMembers, name: 'Kick Members' },
  { flag: PermissionFlagsBits.BanMembers, name: 'Ban Members' },
  { flag: PermissionFlagsBits.ManageGuild, name: 'Manage Server' },
  { flag: PermissionFlagsBits.ViewChannel, name: 'View Channels' },
  { flag: PermissionFlagsBits.SendMessages, name: 'Send Messages' },
  { flag: PermissionFlagsBits.ManageMessages, name: 'Manage Messages' },
  { flag: PermissionFlagsBits.EmbedLinks, name: 'Embed Links' },
  { flag: PermissionFlagsBits.ReadMessageHistory, name: 'Read Message History' },
  { flag: PermissionFlagsBits.AddReactions, name: 'Add Reactions' },
  { flag: PermissionFlagsBits.ManageEmojisAndStickers, name: 'Manage Emojis & Stickers' },
  { flag: PermissionFlagsBits.ManageWebhooks, name: 'Manage Webhooks' },
  { flag: PermissionFlagsBits.ManageEvents, name: 'Manage Events' },
  { flag: PermissionFlagsBits.ManageThreads, name: 'Manage Threads' },
  { flag: PermissionFlagsBits.SendMessagesInThreads, name: 'Send Messages in Threads' },
  { flag: PermissionFlagsBits.ViewAuditLog, name: 'View Audit Log' },
  { flag: PermissionFlagsBits.ModerateMembers, name: 'Moderate Members' },
  { flag: PermissionFlagsBits.MuteMembers, name: 'Mute Members' },
  { flag: PermissionFlagsBits.DeafenMembers, name: 'Deafen Members' },
  { flag: PermissionFlagsBits.MoveMembers, name: 'Move Members' },
  { flag: PermissionFlagsBits.ManageNicknames, name: 'Manage Nicknames' },
  { flag: PermissionFlagsBits.CreatePublicThreads, name: 'Create Public Threads' },
  { flag: PermissionFlagsBits.CreatePrivateThreads, name: 'Create Private Threads' },
];

const PERMISSION_INTEGER = REQUIRED_PERMISSIONS.reduce(
  (acc, p) => acc | p.flag,
  BigInt(0)
);

// ── Init Command ─────────────────────────────────────────────────────

async function runInit(): Promise<void> {
  const rl = createRL();
  const TOTAL_STEPS = 6;

  try {
    // ── Welcome + Step 1 on the same screen ──
    clearScreen();
    ln(LOGO);
    out('  ');
    await typewrite(`${c.bold}${c.whiteBright}Discord MCP Server${c.reset}`, 30);
    await typewrite(`  ${c.gray}—${c.reset}  `, 40);
    await typewrite(`${c.dim}Interactive Setup Wizard${c.reset}`, 20);
    ln('');
    ln(`  ${c.dim}139 admin tools across 20 categories${c.reset}`);
    ln(`  ${c.dim}Manage your entire Discord server from any MCP client${c.reset}`);
    ln('');
    divider();
    ln('');
    ln(`  ${c.dim}Web${c.reset}     ${c.underline}${c.blueBright}https://QuadsLab.io${c.reset}`);
    ln(`  ${c.dim}Discord${c.reset} ${c.underline}${c.blueBright}https://discord.gg/sjnb8wWGCJ${c.reset}`);
    ln('');
    divider();
    ln('');

    // Step 1 question lives on the welcome screen — no clear
    const step1Dots = Array.from({ length: TOTAL_STEPS }, (_, i) =>
      i === 0 ? `${c.cyanBright}●${c.reset}` : `${c.gray}○${c.reset}`
    ).join(' ');
    ln(`  ${step1Dots}  ${c.gray}(1/${TOTAL_STEPS})${c.reset}`);
    ln(`  ${c.bold}${c.whiteBright}Discord Bot Token${c.reset}`);
    ln('');

    const hasBot = await promptConfirm(rl, 'Do you already have a Discord bot?', false);

    if (!hasBot) {
      ln('');
      box([
        `${c.bold}Create a Discord Bot${c.reset}`,
        ``,
        `${c.cyanBright}1.${c.reset} Open the Discord Developer Portal`,
        `${c.cyanBright}2.${c.reset} Click ${c.bold}"New Application"${c.reset} and name it`,
        `${c.cyanBright}3.${c.reset} Go to the ${c.bold}Bot${c.reset} tab`,
        `${c.cyanBright}4.${c.reset} Click ${c.bold}"Reset Token"${c.reset} and copy it`,
      ], c.blue);
      ln('');
      link('https://discord.com/developers/applications');
      ln('');
      await waitForEnter(rl, 'Press Enter when you have your token...');
    }

    // Token input loop — allow retries on invalid format
    let token = '';
    while (true) {
      ln('');
      token = await promptSecret(rl, 'Paste your bot token: ');

      if (!token) {
        error('No token provided.');
        return;
      }

      // Pre-validate token format before connecting
      const formatCheck = isTokenFormatValid(token);
      if (!formatCheck.valid) {
        ln('');
        warn(`Token format looks wrong: ${formatCheck.reason}`);
        info('Discord bot tokens look like: NjE2...OTg.Gw...Xg.Sv...kQ');
        ln('');
        const retry = await promptConfirm(rl, 'Try a different token?', true);
        if (!retry) return;
        continue;
      }

      break;
    }

    const masked = token.slice(0, 5) + '*'.repeat(Math.max(0, token.length - 9)) + token.slice(-4);
    success(`Token format valid: ${c.dim}${masked}${c.reset}`);

    // ── Step 2: Privileged intents ──
    await sleep(200);
    stepHeader(2, TOTAL_STEPS, 'Enable Privileged Intents');

    box([
      `${c.bold}Required Bot Intents${c.reset}`,
      ``,
      `In the Developer Portal ${c.gray}>${c.reset} ${c.bold}Bot${c.reset} tab, enable:`,
      ``,
      `  ${c.greenBright}▣${c.reset} ${c.bold}Server Members Intent${c.reset}`,
      `  ${c.greenBright}▣${c.reset} ${c.bold}Message Content Intent${c.reset}`,
    ], c.blue);
    ln('');
    await waitForEnter(rl, 'Press Enter when both intents are enabled...');

    // ── Step 3: Validate token ──
    stepHeader(3, TOTAL_STEPS, 'Connecting to Discord');

    const spinner = createSpinner('Resolving gateway...');
    await sleep(400);

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
      ],
    });

    let appId: string;
    let guilds: Guild[];

    try {
      spinner.update('Authenticating bot token...');
      await client.login(token);
      await new Promise<void>((resolve) => {
        if (client.isReady()) return resolve();
        client.once('ready', () => resolve());
      });

      appId = client.application?.id || client.user?.id || '';
      guilds = [...client.guilds.cache.values()];

      spinner.update('Fetching server list...');
      await sleep(300);

      spinner.stop();
      ln('');
      success(`Connected as ${c.bold}${c.whiteBright}${client.user?.tag}${c.reset}`);
      await sleep(100);
      success(`Application ID: ${c.dim}${appId}${c.reset}`);
      await sleep(100);
      success(`Servers found: ${c.bold}${guilds.length}${c.reset}`);
    } catch (err: any) {
      spinner.stop();
      ln('');
      error(`Authentication failed: ${err.message}`);
      ln('');
      bullet('Check that your token is correct');
      bullet('Make sure privileged intents are enabled');
      ln('');

      const retryLogin = await promptConfirm(rl, 'Try a different token?', true);
      if (retryLogin) {
        client.destroy();
        ln('');
        info('Run the wizard again:');
        ln(`  ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp init`);
        ln('');
      }
      client.destroy();
      return;
    }

    // ── Step 4: Invite bot ──
    await sleep(200);
    stepHeader(4, TOTAL_STEPS, 'Invite Bot to Server');

    // Ask for permission level
    box([
      `${c.bold}Bot Permission Level${c.reset}`,
      ``,
      `${c.cyanBright}Administrator${c.reset} gives the bot full access.`,
      `No role hierarchy issues, no missing permissions.`,
      ``,
      `${c.cyanBright}Granular${c.reset} gives only the 24 specific permissions`,
      `the tools need. More restrictive but may hit role`,
      `hierarchy issues if the bot's role isn't high enough.`,
    ], c.blue);
    ln('');

    const permItems = [
      `${c.bold}Administrator${c.reset} ${c.dim}(Recommended — avoids permission issues)${c.reset}`,
      `${c.bold}Granular${c.reset} ${c.dim}(24 specific permissions only)${c.reset}`,
    ];
    const permChoice = await promptSelect(rl, permItems, 'Permission level:');

    const ADMIN_PERMISSION = PermissionFlagsBits.Administrator;
    const useAdmin = permChoice !== 1;
    const permissionInt = useAdmin ? ADMIN_PERMISSION : PERMISSION_INTEGER;

    if (useAdmin) {
      success('Using Administrator permissions');
    } else {
      success('Using granular permissions');
      info('Tip: Make sure the bot\'s role is near the top in Server Settings > Roles');
    }

    ln('');

    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${appId}&scope=bot+applications.commands&permissions=${permissionInt}`;

    if (guilds.length === 0) {
      warn('Bot is not in any servers yet.');
      ln('');
      ln(`  ${c.bold}Invite URL:${c.reset}`);
      link(inviteUrl);
      ln('');
      await waitForEnter(rl, 'Press Enter after inviting the bot...');

      const refreshSpinner = createSpinner('Refreshing server list...');
      await client.guilds.fetch();
      guilds = [...client.guilds.cache.values()];
      refreshSpinner.stop();

      if (guilds.length === 0) {
        error('Bot still not in any servers.');
        bullet('Open the invite URL above and add the bot');
        bullet(`Then run ${c.bold}discord-mcp init${c.reset} again`);
        client.destroy();
        return;
      }

      success(`Found ${guilds.length} server${guilds.length > 1 ? 's' : ''}`);
    } else {
      success(`Bot is in ${guilds.length} server${guilds.length > 1 ? 's' : ''}`);
      ln('');
      if (useAdmin) {
        info('If the bot was previously invited without Administrator,');
        info('re-invite with this URL to upgrade permissions:');
      } else {
        info('Invite URL (for adding to more servers):');
      }
      link(inviteUrl);
    }

    // ── Step 5: Select guild ──
    await sleep(200);
    stepHeader(5, TOTAL_STEPS, 'Select Your Server');

    let selectedGuild: Guild;

    if (guilds.length === 1) {
      selectedGuild = guilds[0]!;
      success(`Auto-selected ${c.bold}${selectedGuild.name}${c.reset}`);
      // Show richer guild info
      const guildInfo: string[] = [];
      guildInfo.push(`${c.dim}ID:${c.reset} ${selectedGuild.id}`);
      guildInfo.push(`${c.dim}Members:${c.reset} ${selectedGuild.memberCount}`);
      if (selectedGuild.premiumTier > 0) {
        const boostLabels = ['', 'Level 1', 'Level 2', 'Level 3'];
        guildInfo.push(`${c.magentaBright}⬆ Boost ${boostLabels[selectedGuild.premiumTier]}${c.reset}`);
      }
      info(`  ${guildInfo.join(`  ${c.gray}│${c.reset}  `)}`);
    } else {
      // Richer guild display with boost indicators
      const guildItems = guilds.map(g => {
        const boost = g.premiumTier > 0 ? ` ${c.magentaBright}⬆${g.premiumTier}${c.reset}` : '';
        return `${c.bold}${g.name}${c.reset}${boost} ${c.gray}(${g.memberCount} members)${c.reset}`;
      });
      const idx = await promptSelect(rl, guildItems, `Select a server (1-${guilds.length}):`);

      if (isNaN(idx) || idx < 0 || idx >= guilds.length) {
        error('Invalid selection.');
        client.destroy();
        return;
      }

      selectedGuild = guilds[idx]!;
      success(`Selected ${c.bold}${selectedGuild.name}${c.reset}`);
    }

    // ── Quick permission check ──
    ln('');
    const permSpinner = createSpinner('Checking bot permissions...');

    try {
      const botMember = selectedGuild.members.cache.get(client.user!.id)
        || await selectedGuild.members.fetch(client.user!.id);
      const perms = botMember.permissions;

      let permGranted = 0;
      const permMissing: string[] = [];

      for (const { flag, name } of REQUIRED_PERMISSIONS) {
        if (perms.has(flag)) {
          permGranted++;
        } else {
          permMissing.push(name);
        }
      }

      permSpinner.stop();

      const total = REQUIRED_PERMISSIONS.length;
      if (permMissing.length === 0) {
        success(`All ${total} permissions granted ${c.greenBright}✔${c.reset}`);
      } else {
        warn(`${permGranted}/${total} permissions — missing ${permMissing.length}`);
        for (const name of permMissing.slice(0, 3)) {
          ln(`    ${c.redBright}✖${c.reset} ${c.dim}${name}${c.reset}`);
        }
        if (permMissing.length > 3) {
          ln(`    ${c.dim}...and ${permMissing.length - 3} more (run ${c.bold}discord-mcp check${c.reset}${c.dim} for full list)${c.reset}`);
        }
      }
    } catch {
      permSpinner.stop();
      info('Could not check permissions (run discord-mcp check later)');
    }

    client.destroy();

    // ── Step 6: Configure MCP clients ──
    stepHeader(6, TOTAL_STEPS, 'Configure MCP Clients');

    // Server config shared by all clients
    const serverEntry = {
      command: 'npx',
      args: ['-y', '@quadslab.io/discord-mcp'],
      env: {
        DISCORD_TOKEN: token,
        DISCORD_GUILD_ID: selectedGuild.id,
      },
    };

    // Define all supported clients and their config paths
    interface McpClient {
      name: string;
      label: string;
      configPath: string;
      detected: boolean;
      dirExists: boolean;
    }

    const home = os.homedir();
    const platform = process.platform;
    const cwd = process.cwd();

    // Detect if cwd is a non-project directory (Desktop, Downloads, home root, etc.)
    const cwdLower = cwd.toLowerCase().replace(/\\/g, '/');
    const homeLower = home.toLowerCase().replace(/\\/g, '/');
    const suspiciousDirs = ['desktop', 'downloads', 'documents', 'tmp', 'temp'];
    const isSuspiciousCwd =
      cwdLower === homeLower ||
      suspiciousDirs.some(d => cwdLower === `${homeLower}/${d}`) ||
      cwdLower.endsWith('/system32');

    // Determine Claude Code config path
    // If cwd looks like a project dir, use project-scoped .mcp.json
    // Otherwise, use global ~/.claude.json
    let claudeCodePath: string;
    let claudeCodeNote = '';

    if (isSuspiciousCwd) {
      // Use global config instead of writing .mcp.json in Desktop/Downloads/etc.
      claudeCodePath = path.join(home, '.claude.json');
      claudeCodeNote = ` ${c.yellowBright}(global — cwd is ${path.basename(cwd)})${c.reset}`;
    } else {
      claudeCodePath = path.join(cwd, '.mcp.json');
    }

    const claudeDesktopPath = platform === 'win32'
      ? path.join(process.env['APPDATA'] || '', 'Claude', 'claude_desktop_config.json')
      : path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

    const cursorPath = path.join(home, '.cursor', 'mcp.json');

    const windsurfPath = path.join(home, '.codeium', 'windsurf', 'mcp_config.json');

    const clients: McpClient[] = [
      {
        name: 'claude-code',
        label: 'Claude Code',
        configPath: claudeCodePath,
        detected: true, // Always available
        dirExists: true,
      },
      {
        name: 'claude-desktop',
        label: 'Claude Desktop',
        configPath: claudeDesktopPath,
        detected: fs.existsSync(path.dirname(claudeDesktopPath)),
        dirExists: fs.existsSync(path.dirname(claudeDesktopPath)),
      },
      {
        name: 'cursor',
        label: 'Cursor',
        configPath: cursorPath,
        detected: fs.existsSync(path.dirname(cursorPath)),
        dirExists: fs.existsSync(path.dirname(cursorPath)),
      },
      {
        name: 'windsurf',
        label: 'Windsurf',
        configPath: windsurfPath,
        detected: fs.existsSync(path.dirname(windsurfPath)),
        dirExists: fs.existsSync(path.dirname(windsurfPath)),
      },
    ];

    const detected = clients.filter(cl => cl.detected);
    const notDetected = clients.filter(cl => !cl.detected);

    // Warn if cwd is suspicious
    if (isSuspiciousCwd) {
      warn(`Current directory is ${c.bold}${path.basename(cwd)}${c.reset}${c.yellow} — not a project folder${c.reset}`);
      info(`Claude Code config will be written to ${c.bold}~/.claude.json${c.reset} (global, works everywhere)`);
      ln('');
    }

    // Show detected clients
    info('Detected MCP clients:');
    ln('');
    for (const cl of detected) {
      const note = cl.name === 'claude-code' ? claudeCodeNote : '';
      ln(`  ${c.greenBright}●${c.reset} ${c.bold}${cl.label}${c.reset}${note} ${c.dim}${cl.configPath}${c.reset}`);
    }
    for (const cl of notDetected) {
      ln(`  ${c.gray}○ ${cl.label}${c.reset} ${c.dim}(not detected)${c.reset}`);
    }
    ln('');

    // Let user pick which to configure
    const clientItems = clients.map(cl => {
      const tag = cl.detected ? `${c.greenBright}detected${c.reset}` : `${c.dim}not found${c.reset}`;
      return `${c.bold}${cl.label}${c.reset} ${c.gray}(${tag}${c.gray})${c.reset}`;
    });
    clientItems.push(`${c.bold}All detected${c.reset} ${c.dim}(${detected.length} clients)${c.reset}`);
    clientItems.push(`${c.bold}Skip${c.reset} ${c.dim}(show config to copy manually)${c.reset}`);

    const clientIdx = await promptSelect(rl, clientItems, 'Which client(s) to configure?');

    let selectedClients: McpClient[] = [];
    const skipConfig = clientIdx === clientItems.length - 1;
    const allDetected = clientIdx === clientItems.length - 2;

    if (skipConfig) {
      // Show manual config
      selectedClients = [];
    } else if (allDetected) {
      selectedClients = detected;
    } else if (clientIdx >= 0 && clientIdx < clients.length) {
      selectedClients = [clients[clientIdx]!];
    }

    // Write configs
    let configured = 0;

    for (const cl of selectedClients) {
      const configPath = cl.configPath;
      const configDir = path.dirname(configPath);

      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        try {
          fs.mkdirSync(configDir, { recursive: true });
        } catch {
          error(`Could not create directory: ${configDir}`);
          continue;
        }
      }

      const newConfig = { mcpServers: { discord: serverEntry } };

      try {
        if (fs.existsSync(configPath)) {
          const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          existing.mcpServers = existing.mcpServers || {};
          existing.mcpServers.discord = serverEntry;
          fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n');
          success(`${cl.label} — merged into existing config`);
        } else {
          fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2) + '\n');
          success(`${cl.label} — created ${path.basename(configPath)}`);
        }
        info(`  ${c.dim}${configPath}${c.reset}`);
        configured++;
      } catch (err: any) {
        error(`${cl.label} — ${err.message}`);
      }
    }

    if (configured === 0) {
      ln('');
      info('Add this to your MCP config file:');
      ln('');
      const json = JSON.stringify({ mcpServers: { discord: serverEntry } }, null, 2);
      json.split('\n').forEach(line => {
        ln(`  ${c.dim}${line}${c.reset}`);
      });
      ln('');
      box([
        `${c.bold}Config file locations:${c.reset}`,
        ``,
        `${c.cyanBright}Claude Code${c.reset}    ${c.dim}.mcp.json (in project root)${c.reset}`,
        `${c.cyanBright}Claude Desktop${c.reset} ${c.dim}${claudeDesktopPath}${c.reset}`,
        `${c.cyanBright}Cursor${c.reset}         ${c.dim}~/.cursor/mcp.json${c.reset}`,
        `${c.cyanBright}Windsurf${c.reset}       ${c.dim}~/.codeium/windsurf/mcp_config.json${c.reset}`,
      ], c.blue);
    }

    // ── Done ──
    await sleep(300);
    clearScreen();

    // Persistent header — all dots green
    ln('');
    const doneDots = Array.from({ length: TOTAL_STEPS }, () => `${c.greenBright}●${c.reset}`).join(' ');
    ln(`  ${LOGO_MINI} ${DISCORD_MCP_BADGE}  ${doneDots}  ${c.greenBright}Done${c.reset}`);
    divider();
    ln('');

    // Animated completion banner
    out('  ');
    await typewrite('✔', 0);
    out(`${c.greenBright}${c.bold}`);
    await typewrite('  Setup complete!', 40);
    out(c.reset);
    ln('');
    ln('');

    // Summary card — recap everything that was configured
    const summaryLines: string[] = [
      `${c.bold}${c.whiteBright}Configuration Summary${c.reset}`,
      ``,
      `${c.dim}Bot:${c.reset}     ${c.bold}${masked}${c.reset}`,
      `${c.dim}Server:${c.reset}  ${c.bold}${selectedGuild.name}${c.reset} ${c.gray}(${selectedGuild.id})${c.reset}`,
    ];
    if (configured > 0) {
      const clientNames = selectedClients.map(cl => cl.label).join(', ');
      summaryLines.push(`${c.dim}Clients:${c.reset} ${c.bold}${clientNames}${c.reset} ${c.greenBright}✔${c.reset}`);
    } else {
      summaryLines.push(`${c.dim}Clients:${c.reset} ${c.yellowBright}Manual config needed${c.reset}`);
    }

    box(summaryLines, c.cyan);
    ln('');

    // Tailor next steps to what was configured
    const nextSteps: string[] = [`${c.bold}Next steps:${c.reset}`, ``];

    if (selectedClients.some(cl => cl.name === 'claude-code')) {
      nextSteps.push(`${c.cyanBright}Claude Code:${c.reset}    Type ${c.bold}/mcp${c.reset} to connect`);
    }
    if (selectedClients.some(cl => cl.name === 'claude-desktop')) {
      nextSteps.push(`${c.cyanBright}Claude Desktop:${c.reset} Restart the app to load the server`);
    }
    if (selectedClients.some(cl => cl.name === 'cursor')) {
      nextSteps.push(`${c.cyanBright}Cursor:${c.reset}         Reload window or restart to connect`);
    }
    if (selectedClients.some(cl => cl.name === 'windsurf')) {
      nextSteps.push(`${c.cyanBright}Windsurf:${c.reset}       Reload window or restart to connect`);
    }
    if (nextSteps.length === 2) {
      nextSteps.push(`Add the config to your MCP client and restart it`);
    }

    nextSteps.push(``);
    nextSteps.push(`${c.dim}Try asking:${c.reset} ${c.italic}"List all channels in my Discord server"${c.reset}`);

    box(nextSteps, c.green);
    ln('');
    ln(`  ${c.gray}Help${c.reset}   ${c.bold}npx @quadslab.io/discord-mcp check${c.reset}`);
    ln('');
    printFooter();
  } finally {
    rl.close();
  }
}

// ── Check Command ────────────────────────────────────────────────────

async function runCheck(): Promise<void> {
  ln('');
  ln(`  ${LOGO_MINI} ${DISCORD_MCP_BADGE} ${c.dim}— Health Check${c.reset}`);
  divider();
  ln('');

  // Load .env if present
  const dotenv = await import('dotenv');
  dotenv.config();

  const token = process.env['DISCORD_TOKEN'] || process.env['BOT_TOKEN'];
  const guildId = process.env['DISCORD_GUILD_ID'];

  // Token check
  out(`  ${c.dim}Token ............${c.reset} `);
  if (!token) {
    ln(`${c.redBright}NOT SET${c.reset}`);
    ln('');
    error(`Set DISCORD_TOKEN or run ${c.bold}discord-mcp init${c.reset}`);
    return;
  }
  ln(`${c.greenBright}present${c.reset}`);

  // Guild ID check
  out(`  ${c.dim}Guild ID .........${c.reset} `);
  if (!guildId) {
    ln(`${c.redBright}NOT SET${c.reset}`);
    ln('');
    error(`Set DISCORD_GUILD_ID or run ${c.bold}discord-mcp init${c.reset}`);
    return;
  }
  ln(`${c.dim}${guildId}${c.reset}`);

  // Connect
  const spinner = createSpinner('Connecting to Discord...');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  try {
    await client.login(token);
    await new Promise<void>((resolve) => {
      if (client.isReady()) return resolve();
      client.once('ready', () => resolve());
    });

    spinner.stop();
    out(`  ${c.dim}Bot ..............${c.reset} `);
    ln(`${c.greenBright}${client.user?.tag}${c.reset}`);

    const guild = client.guilds.cache.get(guildId);
    out(`  ${c.dim}Server ...........${c.reset} `);
    if (!guild) {
      ln(`${c.redBright}NOT FOUND${c.reset}`);
      ln('');
      error(`Guild ${guildId} not accessible. Is the bot invited?`);
      client.destroy();
      return;
    }
    ln(`${c.greenBright}${guild.name}${c.reset} ${c.dim}(${guild.memberCount} members)${c.reset}`);

    // Permission audit
    ln('');
    ln(`  ${c.bold}Permissions${c.reset}`);
    divider();
    ln('');

    const botMember = guild.members.cache.get(client.user!.id) || await guild.members.fetch(client.user!.id);
    const permissions = botMember.permissions;

    let granted = 0;
    let missing = 0;

    for (const { flag, name } of REQUIRED_PERMISSIONS) {
      const has = permissions.has(flag);
      const dots = '.'.repeat(Math.max(1, 30 - name.length));
      if (has) {
        ln(`  ${c.greenBright}✔${c.reset} ${name} ${c.dim}${dots}${c.reset} ${c.greenBright}yes${c.reset}`);
        granted++;
      } else {
        ln(`  ${c.redBright}✖${c.reset} ${name} ${c.dim}${dots}${c.reset} ${c.redBright}MISSING${c.reset}`);
        missing++;
      }
    }

    ln('');
    divider();
    ln('');

    // Summary
    const total = REQUIRED_PERMISSIONS.length;
    const pct = Math.round((granted / total) * 100);
    const barWidth = 30;
    const filled = Math.round((granted / total) * barWidth);
    const barColor = missing === 0 ? c.greenBright : missing <= 3 ? c.yellowBright : c.redBright;
    const bar = `${barColor}${'█'.repeat(filled)}${c.gray}${'░'.repeat(barWidth - filled)}${c.reset}`;

    ln(`  ${bar}  ${c.bold}${pct}%${c.reset} ${c.dim}(${granted}/${total})${c.reset}`);
    ln('');

    if (missing === 0) {
      success(`All ${total} permissions granted`);
      ln('');
      box([
        `${c.greenBright}${c.bold}MCP server is ready!${c.reset}`,
        `Run ${c.bold}discord-mcp${c.reset} or use via ${c.bold}.mcp.json${c.reset} in Claude Code`,
      ], c.green);
    } else {
      warn(`${missing} permission${missing > 1 ? 's' : ''} missing`);
      ln('');
      bullet('Re-invite the bot with the correct permissions');
      bullet(`Or update the bot's role in ${c.bold}${guild.name}${c.reset} > Server Settings > Roles`);
    }

    ln('');
    client.destroy();
  } catch (err: any) {
    spinner.stop();
    error(`Connection failed: ${err.message}`);
    ln('');
    bullet('Check that your bot token is valid');
    bullet('Ensure the bot has not been deleted');
    ln('');
    client.destroy();
  }
}

// ── Update Command ──────────────────────────────────────────────────

async function runUpdate(): Promise<void> {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  const currentVersion: string = pkg.version;

  ln('');
  ln(`  ${LOGO_MINI} ${DISCORD_MCP_BADGE} ${c.dim}— Update${c.reset}`);
  divider();
  ln('');

  out(`  ${c.dim}Current version ..${c.reset} `);
  ln(`${c.cyanBright}v${currentVersion}${c.reset}`);

  // Check latest version on npm
  const spinner = createSpinner('Checking for updates...');
  let latestVersion: string;
  try {
    latestVersion = execSync('npm view @quadslab.io/discord-mcp version', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    spinner.stop();
    error('Could not check for updates. Check your internet connection.');
    ln('');
    return;
  }
  spinner.stop();

  out(`  ${c.dim}Latest version ...${c.reset} `);
  ln(`${c.cyanBright}v${latestVersion}${c.reset}`);
  ln('');

  if (currentVersion === latestVersion) {
    success('Already up to date!');
    ln('');
    return;
  }

  // Clear npx cache for our package
  const spinner2 = createSpinner('Clearing npx cache...');
  let cacheCleared = false;
  try {
    const npmCache = execSync('npm config get cache', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const npxDir = path.join(npmCache, '_npx');

    if (fs.existsSync(npxDir)) {
      const entries = fs.readdirSync(npxDir);
      for (const entry of entries) {
        const pkgPath = path.join(npxDir, entry, 'node_modules', '@quadslab.io', 'discord-mcp', 'package.json');
        if (fs.existsSync(pkgPath)) {
          fs.rmSync(path.join(npxDir, entry), { recursive: true, force: true });
          cacheCleared = true;
        }
      }
    }
  } catch {
    // Ignore — we'll report below
  }
  spinner2.stop();

  if (cacheCleared) {
    success(`Cache cleared`);
  } else {
    info('No cached version found (may already be cleared)');
  }
  ln('');

  box([
    `${c.greenBright}${c.bold}Update ready!${c.reset}`,
    ``,
    `Next launch will use ${c.bold}v${latestVersion}${c.reset} automatically.`,
    `Run ${c.bold}discord-mcp check${c.reset} to verify.`,
  ], c.green);
  ln('');

  bullet('If using Claude Code or Co-Work, type /mcp to reconnect');
  bullet('If using Claude Desktop, restart the app');
  bullet('If using Cursor / Windsurf, reload the window');
  ln('');
}

// ── Version Command ──────────────────────────────────────────────────

function printVersion(): void {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  ln(`${LOGO_MINI} ${DISCORD_MCP_BADGE} ${c.dim}v${pkg.version}${c.reset}`);
}

// ── Help Command ─────────────────────────────────────────────────────

function printHelp(): void {
  ln(LOGO);
  ln(`  ${c.bold}Discord MCP Server${c.reset}  ${c.dim}— Manage Discord from any MCP client${c.reset}`);
  ln(`  ${c.dim}139 tools across 20 categories${c.reset}`);
  ln('');
  divider();
  ln('');
  ln(`  ${c.bold}USAGE${c.reset}`);
  ln('');
  ln(`    ${c.cyan}$${c.reset} discord-mcp ${c.dim}[command]${c.reset}`);
  ln(`    ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp ${c.dim}[command]${c.reset}`);
  ln('');
  ln(`  ${c.bold}COMMANDS${c.reset}`);
  ln('');
  ln(`    ${c.cyanBright}init${c.reset}      Interactive setup wizard`);
  ln(`    ${c.cyanBright}check${c.reset}     Health check & permission audit`);
  ln(`    ${c.cyanBright}update${c.reset}    Check for updates & clear npx cache`);
  ln(`    ${c.cyanBright}start${c.reset}     Start the MCP server ${c.dim}(default)${c.reset}`);
  ln(`    ${c.cyanBright}help${c.reset}      Show this help message`);
  ln(`    ${c.cyanBright}version${c.reset}   Show version`);
  ln('');
  ln(`  ${c.bold}EXAMPLES${c.reset}`);
  ln('');
  ln(`    ${c.dim}# First-time setup${c.reset}`);
  ln(`    ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp init`);
  ln('');
  ln(`    ${c.dim}# Verify everything works${c.reset}`);
  ln(`    ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp check`);
  ln('');
  ln(`    ${c.dim}# Update to the latest version${c.reset}`);
  ln(`    ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp update`);
  ln('');
  ln(`    ${c.dim}# In .mcp.json (auto-detected)${c.reset}`);
  ln(`    ${c.cyan}$${c.reset} npx @quadslab.io/discord-mcp`);
  ln('');
  divider();
  ln('');
  printFooter();
}

// ── Start Command ────────────────────────────────────────────────────

async function runStart(): Promise<void> {
  const { main } = await import('./mcp-server.js');
  await main();
}

// ── Main ─────────────────────────────────────────────────────────────

const subcommand = process.argv[2];

// If not a TTY (i.e., launched by MCP via stdio), always start the server
if (!process.stdin.isTTY && subcommand !== 'check' && subcommand !== 'update' && subcommand !== 'help' && subcommand !== 'version' && subcommand !== '--version' && subcommand !== '-v' && subcommand !== '--help' && subcommand !== '-h') {
  runStart();
} else {
  switch (subcommand) {
    case 'init':
      runInit();
      break;
    case 'check':
      runCheck();
      break;
    case 'update':
      runUpdate();
      break;
    case 'start':
    case undefined:
      runStart();
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    case 'version':
    case '--version':
    case '-v':
      printVersion();
      break;
    default:
      error(`Unknown command: ${subcommand}`);
      ln('');
      printHelp();
      process.exit(1);
  }
}
