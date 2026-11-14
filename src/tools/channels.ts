import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getGuild, refreshServerCache } from '../discord-client.js';
import { ChannelType, CategoryChannel, TextChannel, VoiceChannel, GuildChannel, PermissionFlagsBits, PermissionsBitField, OverwriteType, NewsChannel } from 'discord.js';
import { smartFindChannel, smartFindCategory, smartFindRole, smartFindMember, smartFindTextChannel } from './utils.js';

/**
 * Channel management tools
 */

export const channelTools: Tool[] = [
  {
    name: 'list_channels',
    description: 'List all channels in the Discord server, organized by category. Returns channel names, IDs, types, and categories.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_text_channel',
    description: 'Create a new text channel in the Discord server. Category name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name for the new text channel (will be lowercased and spaces replaced with hyphens)',
        },
        category: {
          type: 'string',
          description: 'The category name or ID to place the channel in (fuzzy matched, optional)',
        },
        topic: {
          type: 'string',
          description: 'The topic/description for the channel (optional)',
        },
        nsfw: {
          type: 'boolean',
          description: 'Whether the channel is NSFW (default: false)',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this channel (shown in audit log)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_voice_channel',
    description: 'Create a new voice channel in the Discord server. Category name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name for the new voice channel',
        },
        category: {
          type: 'string',
          description: 'The category name or ID to place the channel in (fuzzy matched, optional)',
        },
        userLimit: {
          type: 'number',
          description: 'Maximum number of users allowed in the voice channel (0 for unlimited)',
        },
        bitrate: {
          type: 'number',
          description: 'The bitrate of the voice channel in bits per second (e.g., 64000)',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this channel (shown in audit log)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_category',
    description: 'Create a new category (channel group) in the Discord server.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name for the new category',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this category (shown in audit log)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_channel',
    description: 'Delete a channel from the Discord server. Channel name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to delete (fuzzy matched)',
        },
        reason: {
          type: 'string',
          description: 'The reason for deleting this channel (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'set_channel_permissions',
    description: 'Set permission overwrites for a role or user on a channel. Channel, role, and member names are fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
        target: {
          type: 'string',
          description: 'The role or member name/ID to set permissions for (fuzzy matched)',
        },
        targetType: {
          type: 'string',
          description: 'Whether the target is a "role" or "member"',
          enum: ['role', 'member'],
        },
        allow: {
          type: 'array',
          description: 'Permission names to allow (e.g., ["SendMessages", "ViewChannel", "AddReactions"])',
          items: { type: 'string' },
        },
        deny: {
          type: 'array',
          description: 'Permission names to deny (e.g., ["SendMessages", "ManageMessages"])',
          items: { type: 'string' },
        },
        reason: {
          type: 'string',
          description: 'The reason for this change (shown in audit log)',
        },
      },
      required: ['channel', 'target', 'targetType'],
    },
  },
  {
    name: 'view_channel_permissions',
    description: 'View all permission overwrites on a channel, showing which roles/users have specific allows and denies.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'lock_channel',
    description: 'Lock a channel by denying SendMessages for @everyone. Quick shortcut for permission management.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
        reason: {
          type: 'string',
          description: 'The reason for locking (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'unlock_channel',
    description: 'Unlock a channel by removing the SendMessages deny for @everyone.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
        reason: {
          type: 'string',
          description: 'The reason for unlocking (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'set_slowmode',
    description: 'Set the slowmode (rate limit) on a text channel. Members must wait this many seconds between messages.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
        seconds: {
          type: 'number',
          description: 'Slowmode duration in seconds (0 to disable, max 21600 = 6 hours)',
        },
      },
      required: ['channel', 'seconds'],
    },
  },
  {
    name: 'create_forum_channel',
    description: 'Create a new forum channel in the Discord server. Category name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name for the new forum channel',
        },
        category: {
          type: 'string',
          description: 'The category name or ID to place the channel in (fuzzy matched, optional)',
        },
        topic: {
          type: 'string',
          description: 'The guidelines/topic for the forum channel (optional)',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this channel (shown in audit log)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'reorder_channels',
    description: 'Reorder channels within a category by providing the desired order.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'The category name or ID containing the channels (fuzzy matched)',
        },
        channelOrder: {
          type: 'array',
          description: 'Array of channel names or IDs in the desired order (top to bottom)',
          items: { type: 'string' },
        },
      },
      required: ['category', 'channelOrder'],
    },
  },
  {
    name: 'set_voice_region',
    description: 'Set the voice region for a voice channel. Use null/empty to set to automatic.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The voice channel name or ID (fuzzy matched)',
        },
        region: {
          type: 'string',
          description: 'The voice region ID (e.g., "us-east", "europe", "brazil", "japan"). Use "auto" for automatic.',
        },
      },
      required: ['channel', 'region'],
    },
  },
  {
    name: 'follow_announcement_channel',
    description: 'Follow an announcement channel so its published messages are cross-posted to a target channel in this server.',
    inputSchema: {
      type: 'object',
      properties: {
        announcementChannel: {
          type: 'string',
          description: 'The announcement channel name or ID to follow (fuzzy matched)',
        },
        targetChannel: {
          type: 'string',
          description: 'The text channel name or ID where announcements will be posted (fuzzy matched)',
        },
      },
      required: ['announcementChannel', 'targetChannel'],
    },
  },
  {
    name: 'clone_channel',
    description: 'Clone a channel with all its permissions and settings. Optionally give it a new name.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to clone (fuzzy matched)',
        },
        name: {
          type: 'string',
          description: 'New name for the cloned channel (optional, defaults to original name)',
        },
        reason: {
          type: 'string',
          description: 'The reason for cloning (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'check_permissions',
    description: 'Check what effective permissions a user or role has in a specific channel. Returns the resolved permission array.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID (fuzzy matched)',
        },
        target: {
          type: 'string',
          description: 'The role or member name/ID to check permissions for (fuzzy matched)',
        },
        targetType: {
          type: 'string',
          description: 'Whether the target is a "role" or "member"',
          enum: ['role', 'member'],
        },
      },
      required: ['channel', 'target', 'targetType'],
    },
  },
  {
    name: 'copy_channel_permissions',
    description: 'Copy all permission overwrites from one channel to another, replacing the target channel\'s overwrites.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The source channel name or ID to copy permissions from (fuzzy matched)',
        },
        target: {
          type: 'string',
          description: 'The target channel name or ID to apply permissions to (fuzzy matched)',
        },
        reason: {
          type: 'string',
          description: 'The reason for copying permissions (shown in audit log)',
        },
      },
      required: ['source', 'target'],
    },
  },
  {
    name: 'set_voice_status',
    description: 'Set or clear a status message on a voice channel. Requires discord.js v14.15+.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The voice channel name or ID (fuzzy matched)',
        },
        status: {
          type: 'string',
          description: 'The status text to display on the voice channel. Use an empty string to clear.',
        },
      },
      required: ['channel', 'status'],
    },
  },
  {
    name: 'list_voice_members',
    description: 'List all members currently connected to a voice channel, including their voice state (mute, deaf, streaming, camera).',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The voice channel name or ID (fuzzy matched)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'modify_channel',
    description: 'Modify an existing channel\'s properties such as name, topic, or category. Channel and category names are fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to modify (fuzzy matched)',
        },
        name: {
          type: 'string',
          description: 'New name for the channel',
        },
        topic: {
          type: 'string',
          description: 'New topic/description for the channel (text channels only)',
        },
        category: {
          type: 'string',
          description: 'Category name or ID to move the channel to (fuzzy matched, use "none" to remove from category)',
        },
        nsfw: {
          type: 'boolean',
          description: 'Whether the channel is NSFW (text channels only)',
        },
        userLimit: {
          type: 'number',
          description: 'Maximum users in voice channel (voice channels only)',
        },
        position: {
          type: 'number',
          description: 'New position for the channel',
        },
        reason: {
          type: 'string',
          description: 'The reason for modifying this channel (shown in audit log)',
        },
      },
      required: ['channel'],
    },
  },
];

export async function executeChannelTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'list_channels':
      return await listChannels();
    case 'create_text_channel':
      return await createTextChannel(args);
    case 'create_voice_channel':
      return await createVoiceChannel(args);
    case 'create_category':
      return await createCategory(args);
    case 'delete_channel':
      return await deleteChannel(args);
    case 'modify_channel':
      return await modifyChannel(args);
    case 'set_channel_permissions':
      return await setChannelPermissions(args);
    case 'view_channel_permissions':
      return await viewChannelPermissions(args);
    case 'lock_channel':
      return await lockChannel(args);
    case 'unlock_channel':
      return await unlockChannel(args);
    case 'set_slowmode':
      return await setSlowmode(args);
    case 'clone_channel':
      return await cloneChannel(args);
    case 'create_forum_channel':
      return await createForumChannel(args);
    case 'reorder_channels':
      return await reorderChannels(args);
    case 'set_voice_region':
      return await setVoiceRegion(args);
    case 'follow_announcement_channel':
      return await followAnnouncementChannel(args);
    case 'check_permissions':
      return await checkPermissions(args);
    case 'copy_channel_permissions':
      return await copyChannelPermissions(args);
    case 'set_voice_status':
      return await setVoiceStatus(args);
    case 'list_voice_members':
      return await listVoiceMembers(args);
    default:
      throw new Error(`Unknown channel tool: ${name}`);
  }
}

function getChannelTypeName(type: ChannelType): string {
  switch (type) {
    case ChannelType.GuildText: return 'text';
    case ChannelType.GuildVoice: return 'voice';
    case ChannelType.GuildCategory: return 'category';
    case ChannelType.GuildAnnouncement: return 'announcement';
    case ChannelType.GuildStageVoice: return 'stage';
    case ChannelType.GuildForum: return 'forum';
    default: return 'unknown';
  }
}

async function listChannels(): Promise<string> {
  const guild = await getGuild();

  // Get categories
  const categories = guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory) as Map<string, CategoryChannel>;

  // Organize channels by category
  const organized: Record<string, {
    id: string;
    name: string;
    channels: { id: string; name: string; type: string; position: number }[];
  }> = {};

  // Add uncategorized section
  organized['uncategorized'] = {
    id: 'none',
    name: 'Uncategorized',
    channels: [],
  };

  // Add categories sorted by position
  const sortedCategories = [...categories.values()].sort((a, b) => a.position - b.position);
  for (const cat of sortedCategories) {
    organized[cat.id] = {
      id: cat.id,
      name: cat.name,
      channels: [],
    };
  }

  // Sort channels into categories
  const nonCategoryChannels = guild.channels.cache
    .filter(c => c.type !== ChannelType.GuildCategory)
    .values();

  for (const channel of nonCategoryChannels) {
    const guildChannel = channel as GuildChannel;
    const categoryId = guildChannel.parentId ?? 'uncategorized';
    const category = organized[categoryId] ?? organized['uncategorized'];
    category.channels.push({
      id: guildChannel.id,
      name: guildChannel.name,
      type: getChannelTypeName(guildChannel.type),
      position: guildChannel.position,
    });
  }

  // Sort channels within each category by position
  for (const cat of Object.values(organized)) {
    cat.channels.sort((a, b) => a.position - b.position);
  }

  // Remove empty uncategorized if no channels
  if (organized['uncategorized'].channels.length === 0) {
    delete organized['uncategorized'];
  }

  return JSON.stringify({
    totalChannels: guild.channels.cache.size,
    categories: Object.values(organized),
  }, null, 2);
}

async function createTextChannel(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const name = args['name'] as string;
  const categoryIdentifier = args['category'] as string | undefined;
  const topic = args['topic'] as string | undefined;
  const nsfw = args['nsfw'] as boolean | undefined;
  const reason = args['reason'] as string | undefined;

  let parent: CategoryChannel | null = null;
  if (categoryIdentifier) {
    parent = await smartFindCategory(categoryIdentifier);
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: parent ?? undefined,
    topic,
    nsfw: nsfw ?? false,
    reason: reason ?? 'Created via MCP',
  });

  // Refresh cache so the new channel is immediately findable
  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `Text channel "#${channel.name}" created successfully`,
    channel: {
      id: channel.id,
      name: channel.name,
      type: 'text',
      category: parent?.name ?? null,
    },
  }, null, 2);
}

async function createVoiceChannel(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const name = args['name'] as string;
  const categoryIdentifier = args['category'] as string | undefined;
  const userLimit = args['userLimit'] as number | undefined;
  const bitrate = args['bitrate'] as number | undefined;
  const reason = args['reason'] as string | undefined;

  let parent: CategoryChannel | null = null;
  if (categoryIdentifier) {
    parent = await smartFindCategory(categoryIdentifier);
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    parent: parent ?? undefined,
    userLimit: userLimit ?? 0,
    bitrate: bitrate ?? 64000,
    reason: reason ?? 'Created via MCP',
  });

  // Refresh cache so the new channel is immediately findable
  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `Voice channel "${channel.name}" created successfully`,
    channel: {
      id: channel.id,
      name: channel.name,
      type: 'voice',
      category: parent?.name ?? null,
      userLimit: (channel as VoiceChannel).userLimit,
    },
  }, null, 2);
}

async function createCategory(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const name = args['name'] as string;
  const reason = args['reason'] as string | undefined;

  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: reason ?? 'Created via MCP',
  });

  // Refresh cache so the new category is immediately findable
  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `Category "${category.name}" created successfully`,
    category: {
      id: category.id,
      name: category.name,
    },
  }, null, 2);
}

async function deleteChannel(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  const channelName = channel.name;
  const channelType = getChannelTypeName(channel.type);

  await channel.delete(reason ?? 'Deleted via MCP');

  // Refresh cache so the deleted channel is removed from lookups
  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `${channelType} channel "${channelName}" deleted successfully`,
  }, null, 2);
}

async function modifyChannel(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;

  const channel = await smartFindChannel(channelIdentifier);

  const updates: Record<string, unknown> = {};

  if (args['name'] !== undefined) updates['name'] = args['name'];
  if (args['topic'] !== undefined && channel.isTextBased()) updates['topic'] = args['topic'];
  if (args['nsfw'] !== undefined && channel.isTextBased()) updates['nsfw'] = args['nsfw'];
  if (args['userLimit'] !== undefined && channel.isVoiceBased()) updates['userLimit'] = args['userLimit'];
  if (args['position'] !== undefined) updates['position'] = args['position'];

  // Handle category change
  if (args['category'] !== undefined) {
    if (args['category'] === 'none') {
      updates['parent'] = null;
    } else {
      const category = await smartFindCategory(args['category'] as string);
      updates['parent'] = category.id;
    }
  }

  const reason = (args['reason'] as string) ?? 'Modified via MCP';

  await channel.edit({ ...updates, reason } as any);

  return JSON.stringify({
    success: true,
    message: `Channel "${channel.name}" modified successfully`,
    channel: {
      id: channel.id,
      name: channel.name,
      type: getChannelTypeName(channel.type),
    },
  }, null, 2);
}

/**
 * Resolve permission flag names to PermissionFlagsBits values
 */
function resolvePermissions(names: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const name of names) {
    if (name in PermissionFlagsBits) {
      result[name] = true;
    } else {
      throw new Error(`Unknown permission: "${name}". Valid permissions include: ${Object.keys(PermissionFlagsBits).slice(0, 10).join(', ')}...`);
    }
  }
  return result;
}

async function setChannelPermissions(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const channelIdentifier = args['channel'] as string;
  const targetIdentifier = args['target'] as string;
  const targetType = args['targetType'] as 'role' | 'member';
  const allowPerms = args['allow'] as string[] | undefined;
  const denyPerms = args['deny'] as string[] | undefined;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  // Resolve target
  let targetId: string;
  let targetName: string;
  if (targetType === 'role') {
    const role = await smartFindRole(targetIdentifier);
    targetId = role.id;
    targetName = `@${role.name}`;
  } else {
    const member = await smartFindMember(targetIdentifier);
    targetId = member.id;
    targetName = `@${member.displayName}`;
  }

  // Build overwrite object
  const overwrite: Record<string, boolean | null> = {};
  if (allowPerms) {
    for (const perm of allowPerms) {
      if (!(perm in PermissionFlagsBits)) {
        throw new Error(`Unknown permission: "${perm}". Valid: ${Object.keys(PermissionFlagsBits).slice(0, 10).join(', ')}...`);
      }
      overwrite[perm] = true;
    }
  }
  if (denyPerms) {
    for (const perm of denyPerms) {
      if (!(perm in PermissionFlagsBits)) {
        throw new Error(`Unknown permission: "${perm}". Valid: ${Object.keys(PermissionFlagsBits).slice(0, 10).join(', ')}...`);
      }
      overwrite[perm] = false;
    }
  }

  // If denying @everyone ViewChannel, ensure the bot retains access
  // so it doesn't lock itself out of the channel
  const isDenyingEveryoneView =
    targetId === guild.id &&
    denyPerms?.includes('ViewChannel');

  if (isDenyingEveryoneView) {
    const botId = guild.client.user!.id;
    // Grant bot access before denying @everyone, to avoid self-lockout
    await channel.permissionOverwrites.edit(botId, {
      ViewChannel: true,
      SendMessages: true,
      ManageChannels: true,
    }, { reason: 'Bot self-access: preventing lockout when making channel private' });
  }

  await channel.permissionOverwrites.edit(targetId, overwrite, { reason: reason ?? 'Permissions updated via MCP' });

  return JSON.stringify({
    success: true,
    message: `Permissions updated for ${targetName} on #${channel.name}`,
    channel: { id: channel.id, name: channel.name },
    target: { id: targetId, name: targetName, type: targetType },
    allowed: allowPerms ?? [],
    denied: denyPerms ?? [],
    botAccessRetained: isDenyingEveryoneView || undefined,
  }, null, 2);
}

async function viewChannelPermissions(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const channelIdentifier = args['channel'] as string;

  const channel = await smartFindChannel(channelIdentifier);

  const overwrites = channel.permissionOverwrites.cache.map(overwrite => {
    let targetName: string;
    let targetType: string;

    if (overwrite.type === OverwriteType.Role) {
      const role = guild.roles.cache.get(overwrite.id);
      targetName = role ? `@${role.name}` : overwrite.id;
      targetType = 'role';
    } else {
      const member = guild.members.cache.get(overwrite.id);
      targetName = member ? `@${member.displayName}` : overwrite.id;
      targetType = 'member';
    }

    const allowed = new PermissionsBitField(overwrite.allow).toArray();
    const denied = new PermissionsBitField(overwrite.deny).toArray();

    return {
      targetId: overwrite.id,
      targetName,
      targetType,
      allowed,
      denied,
    };
  });

  return JSON.stringify({
    channel: { id: channel.id, name: channel.name, type: getChannelTypeName(channel.type) },
    permissionOverwrites: [...overwrites],
  }, null, 2);
}

async function lockChannel(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const channelIdentifier = args['channel'] as string;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  await channel.permissionOverwrites.edit(guild.id, {
    SendMessages: false,
  }, { reason: reason ?? 'Channel locked via MCP' });

  return JSON.stringify({
    success: true,
    message: `Channel #${channel.name} has been locked (SendMessages denied for @everyone)`,
  }, null, 2);
}

async function unlockChannel(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const channelIdentifier = args['channel'] as string;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  await channel.permissionOverwrites.edit(guild.id, {
    SendMessages: null,
  }, { reason: reason ?? 'Channel unlocked via MCP' });

  return JSON.stringify({
    success: true,
    message: `Channel #${channel.name} has been unlocked (SendMessages deny removed for @everyone)`,
  }, null, 2);
}

async function setSlowmode(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const seconds = args['seconds'] as number;

  if (seconds < 0 || seconds > 21600) {
    throw new Error('Slowmode must be between 0 (disabled) and 21600 seconds (6 hours)');
  }

  const channel = await smartFindChannel(channelIdentifier);

  if (!channel.isTextBased()) {
    throw new Error(`Cannot set slowmode on ${getChannelTypeName(channel.type)} channel "${channel.name}"`);
  }

  await (channel as TextChannel).setRateLimitPerUser(seconds);

  return JSON.stringify({
    success: true,
    message: seconds === 0
      ? `Slowmode disabled on #${channel.name}`
      : `Slowmode set to ${seconds} seconds on #${channel.name}`,
    channel: { id: channel.id, name: channel.name },
    slowmodeSeconds: seconds,
  }, null, 2);
}

async function cloneChannel(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const newName = args['name'] as string | undefined;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindChannel(channelIdentifier);

  const cloned = await channel.clone({
    name: newName ?? channel.name,
    reason: reason ?? 'Cloned via MCP',
  });

  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `Channel #${channel.name} cloned as #${cloned.name}`,
    original: { id: channel.id, name: channel.name },
    cloned: { id: cloned.id, name: cloned.name, type: getChannelTypeName(cloned.type) },
  }, null, 2);
}

async function createForumChannel(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const name = args['name'] as string;
  const categoryIdentifier = args['category'] as string | undefined;
  const topic = args['topic'] as string | undefined;
  const reason = args['reason'] as string | undefined;

  let parent: CategoryChannel | null = null;
  if (categoryIdentifier) {
    parent = await smartFindCategory(categoryIdentifier);
  }

  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildForum,
    parent: parent ?? undefined,
    topic,
    reason: reason ?? 'Created via MCP',
  });

  await refreshServerCache();

  return JSON.stringify({
    success: true,
    message: `Forum channel "#${channel.name}" created successfully`,
    channel: {
      id: channel.id,
      name: channel.name,
      type: 'forum',
      category: parent?.name ?? null,
    },
  }, null, 2);
}

async function reorderChannels(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const categoryIdentifier = args['category'] as string;
  const channelOrder = args['channelOrder'] as string[];

  const category = await smartFindCategory(categoryIdentifier);

  // Resolve channel names/IDs to actual channels
  const positions: { channel: string; position: number }[] = [];
  for (let i = 0; i < channelOrder.length; i++) {
    const ch = await smartFindChannel(channelOrder[i]!);
    positions.push({ channel: ch.id, position: i });
  }

  await guild.channels.setPositions(positions);

  return JSON.stringify({
    success: true,
    message: `Reordered ${positions.length} channels in "${category.name}"`,
    category: { id: category.id, name: category.name },
    newOrder: channelOrder,
  }, null, 2);
}

async function setVoiceRegion(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const region = args['region'] as string;

  const channel = await smartFindChannel(channelIdentifier);

  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
    throw new Error(`"${channel.name}" is not a voice channel`);
  }

  const rtcRegion = region === 'auto' ? null : region;
  await (channel as VoiceChannel).setRTCRegion(rtcRegion);

  return JSON.stringify({
    success: true,
    message: rtcRegion
      ? `Voice region for "${channel.name}" set to "${rtcRegion}"`
      : `Voice region for "${channel.name}" set to automatic`,
    channel: { id: channel.id, name: channel.name },
    region: rtcRegion ?? 'automatic',
  }, null, 2);
}

async function followAnnouncementChannel(args: Record<string, unknown>): Promise<string> {
  const announcementIdentifier = args['announcementChannel'] as string;
  const targetIdentifier = args['targetChannel'] as string;

  const announcementChannel = await smartFindTextChannel(announcementIdentifier);
  const targetChannel = await smartFindTextChannel(targetIdentifier);

  if (announcementChannel.type !== ChannelType.GuildAnnouncement) {
    throw new Error(`#${announcementChannel.name} is not an announcement channel`);
  }

  await (announcementChannel as NewsChannel).addFollower(targetChannel as any, 'Followed via MCP');

  return JSON.stringify({
    success: true,
    message: `#${targetChannel.name} is now following announcements from #${announcementChannel.name}`,
    source: { id: announcementChannel.id, name: announcementChannel.name },
    target: { id: targetChannel.id, name: targetChannel.name },
  }, null, 2);
}

async function checkPermissions(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const targetIdentifier = args['target'] as string;
  const targetType = args['targetType'] as 'role' | 'member';

  const channel = await smartFindChannel(channelIdentifier);

  let targetName: string;
  let targetId: string;
  let permissions: string[];

  if (targetType === 'role') {
    const role = await smartFindRole(targetIdentifier);
    targetName = `@${role.name}`;
    targetId = role.id;
    permissions = channel.permissionsFor(role)?.toArray() ?? [];
  } else {
    const member = await smartFindMember(targetIdentifier);
    targetName = `@${member.displayName}`;
    targetId = member.id;
    permissions = channel.permissionsFor(member)?.toArray() ?? [];
  }

  return JSON.stringify({
    success: true,
    channel: { id: channel.id, name: channel.name, type: getChannelTypeName(channel.type) },
    target: { id: targetId, name: targetName, type: targetType },
    permissions,
    permissionCount: permissions.length,
  }, null, 2);
}

async function copyChannelPermissions(args: Record<string, unknown>): Promise<string> {
  const sourceIdentifier = args['source'] as string;
  const targetIdentifier = args['target'] as string;
  const reason = args['reason'] as string | undefined;

  const sourceChannel = await smartFindChannel(sourceIdentifier);
  const targetChannel = await smartFindChannel(targetIdentifier);

  const overwrites = sourceChannel.permissionOverwrites.cache;
  let copiedCount = 0;

  for (const [, overwrite] of overwrites) {
    const allowBits = new PermissionsBitField(overwrite.allow);
    const denyBits = new PermissionsBitField(overwrite.deny);

    // Build a permission overwrite object with allow=true, deny=false
    const permObj: Record<string, boolean | null> = {};
    for (const perm of allowBits.toArray()) {
      permObj[perm] = true;
    }
    for (const perm of denyBits.toArray()) {
      permObj[perm] = false;
    }

    await targetChannel.permissionOverwrites.edit(overwrite.id, permObj, {
      type: overwrite.type,
      reason: reason ?? 'Permissions copied via MCP',
    } as any);
    copiedCount++;
  }

  return JSON.stringify({
    success: true,
    message: `Copied ${copiedCount} permission overwrite(s) from #${sourceChannel.name} to #${targetChannel.name}`,
    source: { id: sourceChannel.id, name: sourceChannel.name },
    target: { id: targetChannel.id, name: targetChannel.name },
    overwritesCopied: copiedCount,
  }, null, 2);
}

async function setVoiceStatus(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const status = args['status'] as string;

  const channel = await smartFindChannel(channelIdentifier);

  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
    throw new Error(`"${channel.name}" is not a voice channel`);
  }

  // setStatus is available on VoiceChannel in discord.js v14.15+
  // Types may not include it yet, so cast through any
  await (channel as any).setStatus(status);

  return JSON.stringify({
    success: true,
    message: status
      ? `Voice status for "${channel.name}" set to "${status}"`
      : `Voice status for "${channel.name}" cleared`,
    channel: { id: channel.id, name: channel.name },
    status: status || null,
  }, null, 2);
}

async function listVoiceMembers(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;

  const channel = await smartFindChannel(channelIdentifier);

  if (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice) {
    throw new Error(`"${channel.name}" is not a voice channel`);
  }

  const voiceChannel = channel as VoiceChannel;
  const membersList = voiceChannel.members.map(member => ({
    id: member.id,
    username: member.user.username,
    displayName: member.displayName,
    selfMute: member.voice.selfMute ?? false,
    selfDeaf: member.voice.selfDeaf ?? false,
    serverMute: member.voice.serverMute ?? false,
    serverDeaf: member.voice.serverDeaf ?? false,
    streaming: member.voice.streaming ?? false,
    camera: member.voice.selfVideo ?? false,
  }));

  const membersArray = [...membersList.values()];

  return JSON.stringify({
    success: true,
    channel: { id: voiceChannel.id, name: voiceChannel.name, type: getChannelTypeName(voiceChannel.type) },
    members: membersArray,
    memberCount: membersArray.length,
  }, null, 2);
}
