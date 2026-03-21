import { getGuild, getServerCache } from '../discord-client.js';
import {
  TextChannel,
  CategoryChannel,
  GuildChannel,
  ChannelType,
  Role,
  GuildMember,
  VoiceChannel,
  GuildTextBasedChannel
} from 'discord.js';

/**
 * Utility functions for smart matching of Discord entities
 * These functions use fuzzy matching to find channels, roles, and members
 * even when the input isn't exact.
 */

/**
 * Calculate similarity between two strings (0-1)
 */
function similarity(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower === bLower) return 1;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;

  // Handle hyphen/space/underscore variations
  const normalize = (s: string) => s.replace(/[-_\s]/g, '');
  if (normalize(aLower) === normalize(bLower)) return 0.95;
  if (normalize(aLower).includes(normalize(bLower))) return 0.75;

  return 0;
}

/**
 * Clean up channel identifier - remove # prefix, handle mentions
 */
function cleanChannelIdentifier(identifier: string): string {
  return identifier
    .replace(/^#/, '')           // Remove # prefix
    .replace(/^<#(\d+)>$/, '$1') // Handle <#id> mention format
    .trim();
}

/**
 * Clean up role identifier - remove @ prefix, handle mentions
 */
function cleanRoleIdentifier(identifier: string): string {
  return identifier
    .replace(/^@/, '')           // Remove @ prefix
    .replace(/^<@&(\d+)>$/, '$1') // Handle <@&id> mention format
    .trim();
}

/**
 * Clean up member identifier - remove @ prefix, handle mentions
 */
function cleanMemberIdentifier(identifier: string): string {
  return identifier
    .replace(/^@/, '')           // Remove @ prefix
    .replace(/^<@!?(\d+)>$/, '$1') // Handle <@id> or <@!id> mention format
    .trim();
}

/**
 * Smart find a channel that can receive messages - includes text channels, announcement channels, and voice channel text chats
 */
export async function smartFindTextChannel(identifier: string): Promise<GuildTextBasedChannel> {
  const guild = await getGuild();
  const cache = await getServerCache();
  const cleanId = cleanChannelIdentifier(identifier);

  // Use cache for fuzzy matching first (faster)
  // Include text, announcement, and voice channels (voice channels have text chat)
  const messagableChannelTypes = ['text', 'announcement', 'voice', 'stage'];
  const cachedMessageChannels = cache.channels.filter(c => messagableChannelTypes.includes(c.type));

  // Try exact ID match
  let matchedId = cachedMessageChannels.find(c => c.id === cleanId)?.id;

  // Try exact name match (case-insensitive)
  if (!matchedId) {
    matchedId = cachedMessageChannels.find(c => c.name.toLowerCase() === cleanId.toLowerCase())?.id;
  }

  // Try fuzzy match using cache
  if (!matchedId) {
    let bestScore = 0;
    for (const ch of cachedMessageChannels) {
      const score = similarity(ch.name, cleanId);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        matchedId = ch.id;
      }
    }
  }

  // If found via cache, get the actual channel object
  if (matchedId) {
    const channel = guild.channels.cache.get(matchedId);
    if (channel && (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement ||
      channel.type === ChannelType.GuildVoice ||
      channel.type === ChannelType.GuildStageVoice
    )) {
      return channel as GuildTextBasedChannel;
    }
  }

  // Fall back to searching active threads
  const activeThreads = await guild.channels.fetchActiveThreads();

  // Try exact ID match in threads
  const threadById = activeThreads.threads.get(cleanId);
  if (threadById) {
    return threadById as GuildTextBasedChannel;
  }

  // Try exact name match in threads (case-insensitive)
  const cleanIdLower = cleanId.toLowerCase();
  const threadByName = activeThreads.threads.find(
    t => t.name.toLowerCase() === cleanIdLower
  );
  if (threadByName) {
    return threadByName as GuildTextBasedChannel;
  }

  // Try fuzzy name match in threads
  let bestThreadScore = 0;
  let bestThread: GuildTextBasedChannel | null = null;
  for (const [, thread] of activeThreads.threads) {
    const score = similarity(thread.name, cleanId);
    if (score > bestThreadScore && score >= 0.7) {
      bestThreadScore = score;
      bestThread = thread as GuildTextBasedChannel;
    }
  }
  if (bestThread) {
    return bestThread;
  }

  // Try direct fetch by ID (catches archived threads not in active list)
  if (/^\d+$/.test(cleanId)) {
    try {
      const fetched = await guild.channels.fetch(cleanId);
      if (fetched && fetched.isThread()) {
        return fetched as GuildTextBasedChannel;
      }
    } catch {
      // Not found or not accessible, fall through to error
    }
  }

  // Not found in channels or threads - provide helpful error with suggestions from both
  const suggestions = cachedMessageChannels
    .map(c => ({ name: c.name, type: c.type, score: similarity(c.name, cleanId) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.type === 'voice' ? `🔊${s.name}` : `#${s.name}`);

  const threadSuggestions = activeThreads.threads
    .map(t => ({ name: t.name, score: similarity(t.name, cleanId) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => `🧵${s.name}`);

  const allSuggestions = [...suggestions, ...threadSuggestions];

  let errorMsg = `Channel "${identifier}" not found.`;
  if (allSuggestions.length > 0) {
    errorMsg += ` Did you mean: ${allSuggestions.join(', ')}?`;
  }
  // Also list all available channels if few
  if (cachedMessageChannels.length <= 15) {
    const channelList = cachedMessageChannels.map(c => c.type === 'voice' ? `🔊${c.name}` : `#${c.name}`);
    errorMsg += ` Available channels: ${channelList.join(', ')}`;
  }

  throw new Error(errorMsg);
}

/**
 * Smart find any channel (text, voice, category) - uses cached data
 */
export async function smartFindChannel(identifier: string): Promise<GuildChannel> {
  const guild = await getGuild();
  const cache = await getServerCache();
  const cleanId = cleanChannelIdentifier(identifier);

  // Use cache for fuzzy matching
  const cachedChannels = cache.channels;

  // Try exact ID match
  let matchedId = cachedChannels.find(c => c.id === cleanId)?.id;

  // Try exact name match (case-insensitive)
  if (!matchedId) {
    matchedId = cachedChannels.find(c => c.name.toLowerCase() === cleanId.toLowerCase())?.id;
  }

  // Try fuzzy match using cache
  if (!matchedId) {
    let bestScore = 0;
    for (const ch of cachedChannels) {
      const score = similarity(ch.name, cleanId);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        matchedId = ch.id;
      }
    }
  }

  // If found via cache, get the actual channel object
  if (matchedId) {
    const channel = guild.channels.cache.get(matchedId);
    if (channel) {
      return channel as GuildChannel;
    }
  }

  // Not found - provide helpful error with suggestions from cache
  const suggestions = cachedChannels
    .map(c => ({ name: c.name, score: similarity(c.name, cleanId) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.name);

  let errorMsg = `Channel "${identifier}" not found.`;
  if (suggestions.length > 0) {
    errorMsg += ` Did you mean: ${suggestions.join(', ')}?`;
  }

  throw new Error(errorMsg);
}

/**
 * Smart find category channel - uses cached data
 */
export async function smartFindCategory(identifier: string): Promise<CategoryChannel> {
  const guild = await getGuild();
  const cache = await getServerCache();
  const cleanId = cleanChannelIdentifier(identifier);

  // Use cache for fuzzy matching
  const cachedCategories = cache.channels.filter(c => c.type === 'category');

  // Try exact ID match
  let matchedId = cachedCategories.find(c => c.id === cleanId)?.id;

  // Try exact name match (case-insensitive)
  if (!matchedId) {
    matchedId = cachedCategories.find(c => c.name.toLowerCase() === cleanId.toLowerCase())?.id;
  }

  // Try fuzzy match using cache
  if (!matchedId) {
    let bestScore = 0;
    for (const cat of cachedCategories) {
      const score = similarity(cat.name, cleanId);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        matchedId = cat.id;
      }
    }
  }

  // If found via cache, get the actual channel object
  if (matchedId) {
    const channel = guild.channels.cache.get(matchedId);
    if (channel && channel.type === ChannelType.GuildCategory) {
      return channel as CategoryChannel;
    }
  }

  // Not found - provide helpful error with suggestions from cache
  const suggestions = cachedCategories
    .map(c => ({ name: c.name, score: similarity(c.name, cleanId) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.name);

  let errorMsg = `Category "${identifier}" not found.`;
  if (suggestions.length > 0) {
    errorMsg += ` Did you mean: ${suggestions.join(', ')}?`;
  }
  if (cachedCategories.length <= 10) {
    errorMsg += ` Available categories: ${cachedCategories.map(c => c.name).join(', ')}`;
  }

  throw new Error(errorMsg);
}

/**
 * Smart find role - uses cached data and fuzzy matching
 */
export async function smartFindRole(identifier: string): Promise<Role> {
  const guild = await getGuild();
  const cache = await getServerCache();
  const cleanId = cleanRoleIdentifier(identifier);

  // Special case: @everyone role (its ID equals the guild ID)
  if (cleanId.toLowerCase() === 'everyone') {
    const everyoneRole = guild.roles.cache.get(guild.id);
    if (everyoneRole) return everyoneRole;
  }

  // Use cache for fuzzy matching
  const cachedRoles = cache.roles;

  // Try exact ID match
  let matchedId = cachedRoles.find(r => r.id === cleanId)?.id;

  // Try exact name match (case-insensitive)
  if (!matchedId) {
    matchedId = cachedRoles.find(r => r.name.toLowerCase() === cleanId.toLowerCase())?.id;
  }

  // Try fuzzy match using cache
  if (!matchedId) {
    let bestScore = 0;
    for (const role of cachedRoles) {
      const score = similarity(role.name, cleanId);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        matchedId = role.id;
      }
    }
  }

  // If found via cache, get the actual role object
  if (matchedId) {
    const role = guild.roles.cache.get(matchedId);
    if (role) {
      return role;
    }
  }

  // Not found - provide helpful error with suggestions from cache
  const suggestions = cachedRoles
    .map(r => ({ name: r.name, score: similarity(r.name, cleanId) }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.name);

  let errorMsg = `Role "${identifier}" not found.`;
  if (suggestions.length > 0) {
    errorMsg += ` Did you mean: ${suggestions.map(s => `@${s}`).join(', ')}?`;
  }
  if (cachedRoles.length <= 15) {
    errorMsg += ` Available roles: ${cachedRoles.map(r => `@${r.name}`).join(', ')}`;
  }

  throw new Error(errorMsg);
}

/**
 * Smart find member - uses cached data and fuzzy matching
 */
export async function smartFindMember(identifier: string): Promise<GuildMember> {
  const guild = await getGuild();
  const cache = await getServerCache();
  const cleanId = cleanMemberIdentifier(identifier);

  // Use cache for fuzzy matching first
  const cachedMembers = cache.members;

  // Try exact ID match
  let matchedId = cachedMembers.find(m => m.id === cleanId)?.id;

  // Try exact matches (case-insensitive) on various name fields
  if (!matchedId) {
    matchedId = cachedMembers.find(m =>
      m.username.toLowerCase() === cleanId.toLowerCase() ||
      m.displayName.toLowerCase() === cleanId.toLowerCase() ||
      (m.nickname && m.nickname.toLowerCase() === cleanId.toLowerCase())
    )?.id;
  }

  // Try fuzzy match using cache
  if (!matchedId) {
    let bestScore = 0;
    for (const member of cachedMembers) {
      const scores = [
        similarity(member.username, cleanId),
        similarity(member.displayName, cleanId),
        member.nickname ? similarity(member.nickname, cleanId) : 0,
      ];
      const maxScore = Math.max(...scores);

      if (maxScore > bestScore && maxScore >= 0.6) {
        bestScore = maxScore;
        matchedId = member.id;
      }
    }
  }

  // If found via cache, get the actual member object
  if (matchedId) {
    // Fetch the specific member to ensure we have latest data
    try {
      const member = await guild.members.fetch(matchedId);
      if (member) {
        return member;
      }
    } catch {
      // Member might have left, fall through to error
    }
  }

  // Not found - provide helpful error with suggestions from cache
  const suggestions = cachedMembers
    .map(m => ({
      name: m.displayName,
      score: Math.max(
        similarity(m.username, cleanId),
        similarity(m.displayName, cleanId),
        m.nickname ? similarity(m.nickname, cleanId) : 0
      )
    }))
    .filter(s => s.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.name);

  let errorMsg = `Member "${identifier}" not found.`;
  if (suggestions.length > 0) {
    errorMsg += ` Did you mean: ${suggestions.map(s => `@${s}`).join(', ')}?`;
  }

  throw new Error(errorMsg);
}
