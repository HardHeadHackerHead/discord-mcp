import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getGuild, getClient } from '../discord-client.js';
import { smartFindChannel, smartFindRole } from './utils.js';
import { AuditLogEvent, GuildVerificationLevel, GuildDefaultMessageNotifications, TextChannel } from 'discord.js';

/**
 * Server administration tools
 */

export const serverTools: Tool[] = [
  {
    name: 'edit_server',
    description: 'Modify server settings such as name, description, verification level, and default notification settings.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'New name for the server',
        },
        description: {
          type: 'string',
          description: 'New description for the server',
        },
        verificationLevel: {
          type: 'string',
          description: 'Verification level for the server',
          enum: ['none', 'low', 'medium', 'high', 'very_high'],
        },
        defaultNotifications: {
          type: 'string',
          description: 'Default notification setting for new members',
          enum: ['all', 'mentions'],
        },
        reason: {
          type: 'string',
          description: 'The reason for editing the server (shown in audit log)',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_invites',
    description: 'List all active invite links for the Discord server, including usage stats and expiration info.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_invite',
    description: 'Generate a new invite link for a specific channel. Channel name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to create the invite for (fuzzy matched)',
        },
        maxAge: {
          type: 'number',
          description: 'Maximum age of the invite in seconds (0 = never expires, default: 86400)',
        },
        maxUses: {
          type: 'number',
          description: 'Maximum number of uses (0 = unlimited, default: 0)',
        },
        temporary: {
          type: 'boolean',
          description: 'Whether the invite grants temporary membership (default: false)',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this invite (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'delete_invite',
    description: 'Revoke an active invite link by its invite code.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The invite code to revoke',
        },
        reason: {
          type: 'string',
          description: 'The reason for deleting this invite (shown in audit log)',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_audit_log',
    description: 'Fetch recent audit log entries for the server. Optionally filter by action type or user.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of entries to fetch (default: 25, max: 100)',
        },
        actionType: {
          type: 'string',
          description: 'Filter by action type (e.g., "MemberKick", "MemberBan", "ChannelCreate", "MessageDelete")',
        },
        userId: {
          type: 'string',
          description: 'Filter by the user ID who performed the action',
        },
      },
      required: [],
    },
  },
  {
    name: 'list_bans',
    description: 'View all banned users in the server along with their ban reasons.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_welcome_screen',
    description: 'Get the server welcome screen configuration including description and channels.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_welcome_screen',
    description: 'Configure the server welcome screen with a description and featured channels.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether the welcome screen is enabled',
        },
        description: {
          type: 'string',
          description: 'The welcome screen description',
        },
        channels: {
          type: 'array',
          description: 'Array of welcome channels with channel name, description, and optional emoji',
          items: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel name or ID (fuzzy matched)' },
              description: { type: 'string', description: 'Description for this welcome channel' },
              emoji: { type: 'string', description: 'Unicode emoji for this channel (optional)' },
            },
            required: ['channel', 'description'],
          },
        },
      },
      required: [],
    },
  },
  {
    name: 'get_widget',
    description: 'Get the server widget settings including whether it is enabled and which channel it uses.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_widget',
    description: 'Configure the server widget settings.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether the widget is enabled',
        },
        channel: {
          type: 'string',
          description: 'The channel name or ID for the widget invite (fuzzy matched)',
        },
        reason: {
          type: 'string',
          description: 'The reason for changing widget settings (shown in audit log)',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_vanity_url',
    description: 'Get the server vanity URL if the server has the VANITY_URL feature.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'list_integrations',
    description: 'List all integrations (bots, apps) connected to the server.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'delete_integration',
    description: 'Remove an integration from the server by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        integrationId: {
          type: 'string',
          description: 'The ID of the integration to remove',
        },
        reason: {
          type: 'string',
          description: 'The reason for removing the integration (shown in audit log)',
        },
      },
      required: ['integrationId'],
    },
  },
  {
    name: 'get_invite',
    description: 'Get details about a specific invite code, including guild info, channel, inviter, usage stats, and expiration.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The invite code or full URL (e.g., "abc123" or "discord.gg/abc123")',
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_server_icon',
    description: 'Get the server icon, banner, splash, and discovery splash image URLs.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_server_icon',
    description: 'Set the server icon or banner from a URL.',
    inputSchema: {
      type: 'object',
      properties: {
        icon: {
          type: 'string',
          description: 'URL of the image to set as the server icon',
        },
        banner: {
          type: 'string',
          description: 'URL of the image to set as the server banner',
        },
        reason: {
          type: 'string',
          description: 'The reason for changing the server images (shown in audit log)',
        },
      },
      required: [],
    },
  },
];

export async function executeServerTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'edit_server':
      return await editServer(args);
    case 'list_invites':
      return await listInvites();
    case 'create_invite':
      return await createInvite(args);
    case 'delete_invite':
      return await deleteInvite(args);
    case 'get_audit_log':
      return await getAuditLog(args);
    case 'list_bans':
      return await listBans();
    case 'get_welcome_screen':
      return await getWelcomeScreen();
    case 'set_welcome_screen':
      return await setWelcomeScreen(args);
    case 'get_widget':
      return await getWidget();
    case 'set_widget':
      return await setWidget(args);
    case 'get_vanity_url':
      return await getVanityUrl();
    case 'list_integrations':
      return await listIntegrations();
    case 'delete_integration':
      return await deleteIntegration(args);
    case 'get_invite':
      return await getInvite(args);
    case 'get_server_icon':
      return await getServerIcon();
    case 'set_server_icon':
      return await setServerIcon(args);
    default:
      throw new Error(`Unknown server tool: ${name}`);
  }
}

async function editServer(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const reason = args['reason'] as string | undefined;

  const updates: Record<string, unknown> = {};

  if (args['name'] !== undefined) {
    updates['name'] = args['name'];
  }

  if (args['description'] !== undefined) {
    updates['description'] = args['description'];
  }

  if (args['verificationLevel'] !== undefined) {
    const verificationMap: Record<string, GuildVerificationLevel> = {
      'none': GuildVerificationLevel.None,
      'low': GuildVerificationLevel.Low,
      'medium': GuildVerificationLevel.Medium,
      'high': GuildVerificationLevel.High,
      'very_high': GuildVerificationLevel.VeryHigh,
    };
    const level = verificationMap[args['verificationLevel'] as string];
    if (level === undefined) {
      throw new Error(`Invalid verification level "${args['verificationLevel']}". Must be one of: none, low, medium, high, very_high`);
    }
    updates['verificationLevel'] = level;
  }

  if (args['defaultNotifications'] !== undefined) {
    const notificationMap: Record<string, GuildDefaultMessageNotifications> = {
      'all': GuildDefaultMessageNotifications.AllMessages,
      'mentions': GuildDefaultMessageNotifications.OnlyMentions,
    };
    const setting = notificationMap[args['defaultNotifications'] as string];
    if (setting === undefined) {
      throw new Error(`Invalid default notifications "${args['defaultNotifications']}". Must be one of: all, mentions`);
    }
    updates['defaultMessageNotifications'] = setting;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No settings provided to update. Specify at least one of: name, description, verificationLevel, defaultNotifications');
  }

  await guild.edit({
    ...updates,
    reason: reason ?? 'Edited via MCP',
  } as any);

  return JSON.stringify({
    success: true,
    message: `Server settings updated successfully`,
    updated: Object.keys(updates),
  }, null, 2);
}

async function listInvites(): Promise<string> {
  const guild = await getGuild();
  const invites = await guild.invites.fetch();

  const inviteList = invites.map(invite => ({
    code: invite.code,
    url: `https://discord.gg/${invite.code}`,
    channel: {
      id: invite.channel?.id ?? null,
      name: invite.channel && 'name' in invite.channel ? invite.channel.name : null,
    },
    inviter: invite.inviter ? {
      id: invite.inviter.id,
      username: invite.inviter.username,
    } : null,
    uses: invite.uses,
    maxUses: invite.maxUses,
    maxAge: invite.maxAge,
    temporary: invite.temporary,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    createdAt: invite.createdAt?.toISOString() ?? null,
  }));

  return JSON.stringify({
    totalInvites: inviteList.length,
    invites: inviteList,
  }, null, 2);
}

async function createInvite(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const maxAge = args['maxAge'] as number | undefined;
  const maxUses = args['maxUses'] as number | undefined;
  const temporary = args['temporary'] as boolean | undefined;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  if (!('createInvite' in channel)) {
    throw new Error(`Cannot create invite for channel "${channel.name}" — unsupported channel type`);
  }

  const invite = await (channel as any).createInvite({
    maxAge: maxAge ?? 86400,
    maxUses: maxUses ?? 0,
    temporary: temporary ?? false,
    reason: reason ?? 'Created via MCP',
  });

  return JSON.stringify({
    success: true,
    message: `Invite created successfully`,
    invite: {
      code: invite.code,
      url: `https://discord.gg/${invite.code}`,
      channel: {
        id: channel.id,
        name: channel.name,
      },
      maxAge: invite.maxAge,
      maxUses: invite.maxUses,
      temporary: invite.temporary,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
    },
  }, null, 2);
}

async function deleteInvite(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const code = args['code'] as string;
  const reason = args['reason'] as string | undefined;

  const invites = await guild.invites.fetch();
  const invite = invites.find(i => i.code === code);

  if (!invite) {
    throw new Error(`Invite with code "${code}" not found`);
  }

  await invite.delete(reason ?? 'Deleted via MCP');

  return JSON.stringify({
    success: true,
    message: `Invite "${code}" has been revoked`,
  }, null, 2);
}

async function getAuditLog(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const limit = Math.min(args['limit'] as number || 25, 100);
  const actionType = args['actionType'] as string | undefined;
  const userId = args['userId'] as string | undefined;

  const fetchOptions: {
    limit: number;
    type?: AuditLogEvent;
    user?: string;
  } = { limit };

  if (actionType) {
    const eventType = AuditLogEvent[actionType as keyof typeof AuditLogEvent];
    if (eventType === undefined) {
      throw new Error(`Invalid action type "${actionType}". Examples: MemberKick, MemberBanAdd, ChannelCreate, MessageDelete`);
    }
    fetchOptions.type = eventType;
  }

  if (userId) {
    fetchOptions.user = userId;
  }

  const auditLogs = await guild.fetchAuditLogs(fetchOptions);

  const entries = auditLogs.entries.map(entry => ({
    actionType: AuditLogEvent[entry.action] ?? String(entry.action),
    executor: entry.executor ? {
      id: entry.executor.id,
      username: entry.executor.username,
    } : null,
    target: entry.target ? {
      id: 'id' in (entry.target as any) ? (entry.target as any).id : null,
      type: entry.targetType,
    } : null,
    reason: entry.reason ?? null,
    changes: entry.changes.length > 0 ? entry.changes.map(c => ({
      key: c.key,
      old: c.old ?? null,
      new: c.new ?? null,
    })) : null,
    createdAt: entry.createdAt.toISOString(),
  }));

  return JSON.stringify({
    totalEntries: entries.length,
    entries,
  }, null, 2);
}

async function listBans(): Promise<string> {
  const guild = await getGuild();
  const bans = await guild.bans.fetch();

  const banList = bans.map(ban => ({
    user: {
      id: ban.user.id,
      username: ban.user.username,
    },
    reason: ban.reason ?? null,
  }));

  return JSON.stringify({
    totalBans: banList.length,
    bans: banList,
  }, null, 2);
}

async function getWelcomeScreen(): Promise<string> {
  const guild = await getGuild();

  try {
    const welcomeScreen = await guild.fetchWelcomeScreen();

    return JSON.stringify({
      enabled: welcomeScreen.enabled,
      description: welcomeScreen.description,
      channels: welcomeScreen.welcomeChannels.map(ch => ({
        channelId: ch.channelId,
        channelName: guild.channels.cache.get(ch.channelId)?.name ?? null,
        description: ch.description,
        emoji: ch.emoji ? { name: ch.emoji.name, id: ch.emoji.id } : null,
      })),
    }, null, 2);
  } catch {
    return JSON.stringify({
      enabled: false,
      description: null,
      channels: [],
      note: 'Welcome screen is not configured or server does not have the WELCOME_SCREEN_ENABLED feature.',
    }, null, 2);
  }
}

async function setWelcomeScreen(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const enabled = args['enabled'] as boolean | undefined;
  const description = args['description'] as string | undefined;
  const channelsInput = args['channels'] as Array<{ channel: string; description: string; emoji?: string }> | undefined;

  const updates: Record<string, unknown> = {};

  if (enabled !== undefined) updates['enabled'] = enabled;
  if (description !== undefined) updates['description'] = description;

  if (channelsInput && channelsInput.length > 0) {
    const welcomeChannels = [];
    for (const ch of channelsInput) {
      const channel = await smartFindChannel(ch.channel);
      welcomeChannels.push({
        channel: channel.id,
        description: ch.description,
        emoji: ch.emoji ? { name: ch.emoji } : undefined,
      });
    }
    updates['welcomeChannels'] = welcomeChannels;
  }

  await guild.editWelcomeScreen(updates as any);

  return JSON.stringify({
    success: true,
    message: 'Welcome screen updated successfully',
    updated: Object.keys(updates),
  }, null, 2);
}

async function getWidget(): Promise<string> {
  const guild = await getGuild();

  try {
    const widgetSettings = await guild.fetchWidgetSettings();

    return JSON.stringify({
      enabled: widgetSettings.enabled,
      channel: widgetSettings.channel ? {
        id: widgetSettings.channel.id,
        name: widgetSettings.channel.name,
      } : null,
    }, null, 2);
  } catch {
    return JSON.stringify({
      enabled: false,
      channel: null,
      note: 'Widget settings could not be fetched.',
    }, null, 2);
  }
}

async function setWidget(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const enabled = args['enabled'] as boolean | undefined;
  const channelIdentifier = args['channel'] as string | undefined;
  const reason = args['reason'] as string | undefined;

  const updates: Record<string, unknown> = {};

  if (enabled !== undefined) updates['enabled'] = enabled;

  if (channelIdentifier) {
    const channel = await smartFindChannel(channelIdentifier);
    updates['channel'] = channel.id;
  }

  await (guild as any).editWidget({
    ...updates,
    reason: reason ?? 'Widget updated via MCP',
  });

  return JSON.stringify({
    success: true,
    message: 'Widget settings updated successfully',
    updated: Object.keys(updates),
  }, null, 2);
}

async function getVanityUrl(): Promise<string> {
  const guild = await getGuild();

  if (!guild.features.includes('VANITY_URL')) {
    return JSON.stringify({
      available: false,
      note: 'This server does not have the VANITY_URL feature.',
    }, null, 2);
  }

  try {
    const vanity = await guild.fetchVanityData();

    return JSON.stringify({
      available: true,
      code: vanity.code,
      url: `https://discord.gg/${vanity.code}`,
      uses: vanity.uses,
    }, null, 2);
  } catch {
    return JSON.stringify({
      available: true,
      code: null,
      note: 'No vanity URL has been set for this server.',
    }, null, 2);
  }
}

async function listIntegrations(): Promise<string> {
  const guild = await getGuild();
  const integrations = await guild.fetchIntegrations();

  const integrationList = integrations.map(integration => ({
    id: integration.id,
    name: integration.name,
    type: integration.type,
    enabled: integration.enabled,
    account: integration.account ? {
      id: integration.account.id,
      name: integration.account.name,
    } : null,
    application: integration.application ? {
      id: integration.application.id,
      name: integration.application.name,
      bot: integration.application.bot ? {
        id: integration.application.bot.id,
        username: integration.application.bot.username,
      } : null,
    } : null,
  }));

  return JSON.stringify({
    totalIntegrations: integrationList.length,
    integrations: integrationList,
  }, null, 2);
}

async function deleteIntegration(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const integrationId = args['integrationId'] as string;
  const reason = args['reason'] as string | undefined;

  const integrations = await guild.fetchIntegrations();
  const integration = integrations.get(integrationId);

  if (!integration) {
    throw new Error(`Integration with ID "${integrationId}" not found. Use list_integrations to see available integrations.`);
  }

  const integrationName = integration.name;
  await integration.delete(reason);

  return JSON.stringify({
    success: true,
    message: `Integration "${integrationName}" has been removed`,
  }, null, 2);
}

async function getInvite(args: Record<string, unknown>): Promise<string> {
  const client = getClient();
  let code = args['code'] as string;

  // Strip URL prefixes if provided
  code = code.replace(/^https?:\/\/discord\.gg\//, '');
  code = code.replace(/^discord\.gg\//, '');
  code = code.replace(/^https?:\/\/discord\.com\/invite\//, '');

  const invite = await client.fetchInvite(code);

  const result = {
    success: true,
    code: invite.code,
    guild: invite.guild ? {
      name: invite.guild.name,
      id: invite.guild.id,
    } : null,
    channel: invite.channel ? {
      name: 'name' in invite.channel ? invite.channel.name : null,
      id: invite.channel.id,
    } : null,
    inviter: invite.inviter ? {
      username: invite.inviter.username,
      id: invite.inviter.id,
    } : null,
    uses: invite.uses ?? null,
    maxUses: invite.maxUses ?? null,
    maxAge: invite.maxAge ?? null,
    temporary: invite.temporary ?? null,
    createdAt: invite.createdAt?.toISOString() ?? null,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    memberCount: invite.memberCount ?? null,
    presenceCount: invite.presenceCount ?? null,
  };

  return JSON.stringify(result, null, 2);
}

async function getServerIcon(): Promise<string> {
  const guild = await getGuild();

  const result = {
    success: true,
    icon: guild.iconURL({ size: 1024 }) ?? null,
    banner: guild.bannerURL({ size: 1024 }) ?? null,
    splash: guild.splashURL({ size: 1024 }) ?? null,
    discoverySplash: guild.discoverySplashURL({ size: 1024 }) ?? null,
  };

  return JSON.stringify(result, null, 2);
}

async function setServerIcon(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const iconUrl = args['icon'] as string | undefined;
  const bannerUrl = args['banner'] as string | undefined;
  const reason = args['reason'] as string | undefined;

  if (!iconUrl && !bannerUrl) {
    throw new Error('At least one of "icon" or "banner" must be provided.');
  }

  const updated: string[] = [];

  if (iconUrl) {
    await guild.setIcon(iconUrl, reason ?? 'Icon updated via MCP');
    updated.push('icon');
  }

  if (bannerUrl) {
    await guild.setBanner(bannerUrl, reason ?? 'Banner updated via MCP');
    updated.push('banner');
  }

  return JSON.stringify({
    success: true,
    message: `Server images updated successfully`,
    updated,
  }, null, 2);
}
