import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getGuild } from '../discord-client.js';
import { smartFindTextChannel, smartFindChannel, smartFindMember } from './utils.js';
import { ChannelType, ThreadChannel, ThreadAutoArchiveDuration, FetchArchivedThreadOptions, TextChannel, NewsChannel } from 'discord.js';

/**
 * Thread management tools
 */

export const threadTools: Tool[] = [
  {
    name: 'list_threads',
    description: 'List active threads in the Discord server. Optionally filter to a specific channel (fuzzy-matched).',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'Channel name or ID to filter threads to (fuzzy matched, optional)',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_thread',
    description: 'Create a new thread in a channel. Channel name is fuzzy-matched. Can create a thread from an existing message or a standalone thread.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to create the thread in (fuzzy matched)',
        },
        name: {
          type: 'string',
          description: 'The name for the new thread',
        },
        messageId: {
          type: 'string',
          description: 'The ID of a message to start the thread from (optional — creates a standalone thread if omitted)',
        },
        autoArchiveDuration: {
          type: 'number',
          description: 'Auto-archive duration in minutes: 60, 1440 (1 day), 4320 (3 days), or 10080 (7 days)',
        },
        reason: {
          type: 'string',
          description: 'The reason for creating this thread (shown in audit log)',
        },
      },
      required: ['channel', 'name'],
    },
  },
  {
    name: 'archive_thread',
    description: 'Archive a thread by name or ID. Optionally specify the parent channel to help find the thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to archive',
        },
        channel: {
          type: 'string',
          description: 'The parent channel name or ID to help find the thread (fuzzy matched, optional)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'unarchive_thread',
    description: 'Unarchive a thread by name or ID. Optionally specify the parent channel to help find the thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to unarchive',
        },
        channel: {
          type: 'string',
          description: 'The parent channel name or ID to help find the thread (fuzzy matched, optional)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'delete_thread',
    description: 'Delete a thread by name or ID.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to delete',
        },
        reason: {
          type: 'string',
          description: 'The reason for deleting this thread (shown in audit log)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'lock_thread',
    description: 'Lock a thread to prevent new messages.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to lock',
        },
        reason: {
          type: 'string',
          description: 'The reason for locking this thread (shown in audit log)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'unlock_thread',
    description: 'Unlock a thread to allow new messages.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to unlock',
        },
        reason: {
          type: 'string',
          description: 'The reason for unlocking this thread (shown in audit log)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'add_thread_member',
    description: 'Add a member to a thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to add the member to',
        },
        member: {
          type: 'string',
          description: 'The member name or ID to add to the thread',
        },
      },
      required: ['thread', 'member'],
    },
  },
  {
    name: 'remove_thread_member',
    description: 'Remove a member from a thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to remove the member from',
        },
        member: {
          type: 'string',
          description: 'The member name or ID to remove from the thread',
        },
      },
      required: ['thread', 'member'],
    },
  },
  {
    name: 'list_thread_members',
    description: 'List all members in a thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to list members for',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'get_thread',
    description: 'Get detailed information about a specific thread by name or ID, including metadata, parent channel, and status.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to look up',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'get_thread_messages',
    description: 'Get recent messages from a thread. Thread name is fuzzy-matched.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID (fuzzy matched)',
        },
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve (default: 10, max: 100)',
        },
        before: {
          type: 'string',
          description: 'Get messages before this message ID (for pagination)',
        },
        after: {
          type: 'string',
          description: 'Get messages after this message ID (for pagination)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'list_archived_threads',
    description: 'List archived threads in a channel. Can list both public and private archived threads.',
    inputSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          description: 'The channel name or ID to list archived threads from (fuzzy matched)',
        },
        type: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'Type of archived threads to list (default: "public")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of archived threads to return (default: 25)',
        },
        before: {
          type: 'string',
          description: 'ISO timestamp — return threads archived before this date (for pagination)',
        },
      },
      required: ['channel'],
    },
  },
  {
    name: 'edit_thread',
    description: 'Edit thread properties such as name, auto-archive duration, slowmode, and locked/archived status.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to edit',
        },
        name: {
          type: 'string',
          description: 'New name for the thread',
        },
        autoArchiveDuration: {
          type: 'number',
          description: 'Auto-archive duration in minutes: 60, 1440 (1 day), 4320 (3 days), or 10080 (7 days)',
        },
        rateLimitPerUser: {
          type: 'number',
          description: 'Slowmode in seconds (0-21600). Set to 0 to disable.',
        },
        archived: {
          type: 'boolean',
          description: 'Whether the thread is archived',
        },
        locked: {
          type: 'boolean',
          description: 'Whether the thread is locked',
        },
        reason: {
          type: 'string',
          description: 'The reason for editing this thread (shown in audit log)',
        },
      },
      required: ['thread'],
    },
  },
  {
    name: 'get_thread_pinned_messages',
    description: 'Get all pinned messages in a thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread: {
          type: 'string',
          description: 'The thread name or ID to get pinned messages from',
        },
      },
      required: ['thread'],
    },
  },
];

export async function executeThreadTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'list_threads':
      return await listThreads(args);
    case 'create_thread':
      return await createThread(args);
    case 'archive_thread':
      return await archiveThread(args);
    case 'unarchive_thread':
      return await unarchiveThread(args);
    case 'delete_thread':
      return await deleteThread(args);
    case 'lock_thread':
      return await lockThread(args);
    case 'unlock_thread':
      return await unlockThread(args);
    case 'add_thread_member':
      return await addThreadMember(args);
    case 'remove_thread_member':
      return await removeThreadMember(args);
    case 'list_thread_members':
      return await listThreadMembers(args);
    case 'get_thread':
      return await getThread(args);
    case 'get_thread_messages':
      return await getThreadMessages(args);
    case 'list_archived_threads':
      return await listArchivedThreads(args);
    case 'edit_thread':
      return await editThread(args);
    case 'get_thread_pinned_messages':
      return await getThreadPinnedMessages(args);
    default:
      throw new Error(`Unknown thread tool: ${name}`);
  }
}

/**
 * Find a thread by name or ID from the guild's active threads
 */
async function findThread(identifier: string): Promise<ThreadChannel> {
  const guild = await getGuild();

  // Try exact ID match from guild channels cache
  const cachedChannel = guild.channels.cache.get(identifier);
  if (cachedChannel && cachedChannel.isThread()) {
    return cachedChannel as ThreadChannel;
  }

  // Fetch active threads and try matching
  const activeThreads = await guild.channels.fetchActiveThreads();

  // Try exact ID match from active threads
  const idMatch = activeThreads.threads.get(identifier);
  if (idMatch) {
    return idMatch as ThreadChannel;
  }

  // Try name match (case-insensitive)
  const identifierLower = identifier.toLowerCase();
  const nameMatch = activeThreads.threads.find(
    t => t.name.toLowerCase() === identifierLower
  );
  if (nameMatch) {
    return nameMatch as ThreadChannel;
  }

  // Try partial name match (case-insensitive)
  const partialMatch = activeThreads.threads.find(
    t => t.name.toLowerCase().includes(identifierLower) || identifierLower.includes(t.name.toLowerCase())
  );
  if (partialMatch) {
    return partialMatch as ThreadChannel;
  }

  // Try direct fetch by ID (catches archived threads not in active list)
  if (/^\d+$/.test(identifier)) {
    try {
      const fetched = await guild.channels.fetch(identifier);
      if (fetched && fetched.isThread()) {
        return fetched as ThreadChannel;
      }
    } catch {
      // Not found or not accessible, fall through to error
    }
  }

  // Not found — provide helpful error
  const threadNames = activeThreads.threads.map(t => t.name);
  let errorMsg = `Thread "${identifier}" not found.`;
  if (threadNames.length > 0) {
    errorMsg += ` Active threads: ${threadNames.join(', ')}`;
  } else {
    errorMsg += ' No active threads found in this server.';
  }

  throw new Error(errorMsg);
}

function formatThread(thread: ThreadChannel) {
  return {
    name: thread.name,
    id: thread.id,
    parentChannel: thread.parent
      ? { name: thread.parent.name, id: thread.parent.id }
      : null,
    messageCount: thread.messageCount ?? null,
    memberCount: thread.memberCount ?? null,
    archived: thread.archived ?? false,
    locked: thread.locked ?? false,
    createdAt: thread.createdAt?.toISOString() ?? null,
    archiveTimestamp: thread.archiveTimestamp
      ? new Date(thread.archiveTimestamp).toISOString()
      : null,
  };
}

async function listThreads(args: Record<string, unknown>): Promise<string> {
  const guild = await getGuild();
  const channelIdentifier = args['channel'] as string | undefined;

  if (channelIdentifier) {
    // Filter to a specific channel
    const channel = await smartFindTextChannel(channelIdentifier);
    const activeThreads = await guild.channels.fetchActiveThreads();

    const channelThreads = activeThreads.threads.filter(
      t => t.parentId === channel.id
    );

    const threads = channelThreads.map(t => formatThread(t as ThreadChannel));

    return JSON.stringify({
      channel: { name: channel.name, id: channel.id },
      threadCount: threads.length,
      threads,
    }, null, 2);
  }

  // List all active threads
  const activeThreads = await guild.channels.fetchActiveThreads();
  const threads = activeThreads.threads.map(t => formatThread(t as ThreadChannel));

  return JSON.stringify({
    threadCount: threads.length,
    threads,
  }, null, 2);
}

async function createThread(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const name = args['name'] as string;
  const messageId = args['messageId'] as string | undefined;
  const autoArchiveDuration = args['autoArchiveDuration'] as number | undefined;
  const reason = args['reason'] as string | undefined;

  const channel = await smartFindTextChannel(channelIdentifier);

  // Ensure the channel supports threads (must be a text-based channel with threads)
  if (!('threads' in channel)) {
    throw new Error(`Channel "#${channel.name}" does not support threads.`);
  }

  let thread: ThreadChannel;

  if (messageId) {
    // Create thread from a message
    thread = await channel.threads.create({
      startMessage: messageId,
      name,
      autoArchiveDuration: autoArchiveDuration as ThreadAutoArchiveDuration | undefined,
      reason: reason ?? 'Created via MCP',
    });
  } else {
    // Create standalone thread
    thread = await channel.threads.create({
      name,
      autoArchiveDuration: autoArchiveDuration as ThreadAutoArchiveDuration | undefined,
      type: ChannelType.PublicThread as ChannelType.PublicThread,
      reason: reason ?? 'Created via MCP',
    } as any);
  }

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" created successfully in #${channel.name}`,
    thread: formatThread(thread),
  }, null, 2);
}

async function archiveThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const thread = await findThread(threadIdentifier);

  await thread.setArchived(true);

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" archived successfully`,
    thread: formatThread(thread),
  }, null, 2);
}

async function unarchiveThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const thread = await findThread(threadIdentifier);

  await thread.setArchived(false);

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" unarchived successfully`,
    thread: formatThread(thread),
  }, null, 2);
}

async function deleteThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const reason = args['reason'] as string | undefined;
  const thread = await findThread(threadIdentifier);

  const threadName = thread.name;
  await thread.delete(reason);

  return JSON.stringify({
    success: true,
    message: `Thread "${threadName}" deleted successfully`,
  }, null, 2);
}

async function lockThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const reason = args['reason'] as string | undefined;
  const thread = await findThread(threadIdentifier);

  await thread.setLocked(true, reason);

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" locked successfully`,
    thread: formatThread(thread),
  }, null, 2);
}

async function unlockThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const reason = args['reason'] as string | undefined;
  const thread = await findThread(threadIdentifier);

  await thread.setLocked(false, reason);

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" unlocked successfully`,
    thread: formatThread(thread),
  }, null, 2);
}

async function addThreadMember(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const memberIdentifier = args['member'] as string;

  const channel = await smartFindChannel(threadIdentifier);
  if (!channel.isThread()) {
    throw new Error(`Channel "${channel.name}" is not a thread.`);
  }
  const thread = channel as ThreadChannel;

  const guildMember = await smartFindMember(memberIdentifier);
  await thread.members.add(guildMember.id);

  return JSON.stringify({
    success: true,
    message: `Member "${guildMember.displayName}" added to thread "${thread.name}"`,
    thread: formatThread(thread),
    member: {
      id: guildMember.id,
      username: guildMember.user.username,
      displayName: guildMember.displayName,
    },
  }, null, 2);
}

async function removeThreadMember(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const memberIdentifier = args['member'] as string;

  const channel = await smartFindChannel(threadIdentifier);
  if (!channel.isThread()) {
    throw new Error(`Channel "${channel.name}" is not a thread.`);
  }
  const thread = channel as ThreadChannel;

  const guildMember = await smartFindMember(memberIdentifier);
  await thread.members.remove(guildMember.id);

  return JSON.stringify({
    success: true,
    message: `Member "${guildMember.displayName}" removed from thread "${thread.name}"`,
    thread: formatThread(thread),
    member: {
      id: guildMember.id,
      username: guildMember.user.username,
      displayName: guildMember.displayName,
    },
  }, null, 2);
}

async function listThreadMembers(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;

  const channel = await smartFindChannel(threadIdentifier);
  if (!channel.isThread()) {
    throw new Error(`Channel "${channel.name}" is not a thread.`);
  }
  const thread = channel as ThreadChannel;

  const members = await thread.members.fetch();

  const memberList = members.map(member => ({
    id: member.id,
    username: member.user?.username ?? null,
    displayName: member.guildMember?.displayName ?? null,
    joinedThread: member.joinedTimestamp
      ? new Date(member.joinedTimestamp).toISOString()
      : null,
  }));

  return JSON.stringify({
    success: true,
    thread: { name: thread.name, id: thread.id },
    memberCount: memberList.length,
    members: memberList,
  }, null, 2);
}

async function getThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const thread = await findThread(threadIdentifier);

  return JSON.stringify({
    success: true,
    thread: {
      ...formatThread(thread),
      type: thread.type === ChannelType.PrivateThread ? 'private' : 'public',
      rateLimitPerUser: thread.rateLimitPerUser ?? 0,
      autoArchiveDuration: thread.autoArchiveDuration ?? null,
      totalMessageSent: thread.totalMessageSent ?? null,
      ownerId: thread.ownerId ?? null,
      url: thread.url,
    },
  }, null, 2);
}

async function getThreadMessages(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const limit = Math.min(args['limit'] as number || 10, 100);
  const before = args['before'] as string | undefined;
  const after = args['after'] as string | undefined;

  const thread = await findThread(threadIdentifier);

  const fetchOptions: { limit: number; before?: string; after?: string } = { limit };
  if (before) fetchOptions.before = before;
  if (after) fetchOptions.after = after;

  const messages = await thread.messages.fetch(fetchOptions);

  const messageList = messages
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(msg => ({
      id: msg.id,
      content: msg.content || '(no text content)',
      author: {
        id: msg.author.id,
        username: msg.author.username,
        isBot: msg.author.bot,
      },
      createdAt: msg.createdAt.toISOString(),
      editedAt: msg.editedAt?.toISOString() ?? null,
      hasEmbeds: msg.embeds.length > 0,
      hasAttachments: msg.attachments.size > 0,
      attachments: msg.attachments.size > 0
        ? msg.attachments.map(a => ({
            id: a.id,
            name: a.name,
            url: a.url,
            size: a.size,
            contentType: a.contentType,
          }))
        : undefined,
      replyTo: msg.reference?.messageId ?? null,
    }));

  return JSON.stringify({
    thread: {
      name: thread.name,
      id: thread.id,
      parentChannel: thread.parent
        ? { name: thread.parent.name, id: thread.parent.id }
        : null,
    },
    messageCount: messageList.length,
    messages: messageList,
  }, null, 2);
}

async function listArchivedThreads(args: Record<string, unknown>): Promise<string> {
  const channelIdentifier = args['channel'] as string;
  const type = (args['type'] as string) || 'public';
  const limit = args['limit'] as number | undefined;
  const before = args['before'] as string | undefined;

  const channel = await smartFindTextChannel(channelIdentifier);

  // Only TextChannel and NewsChannel support fetchArchivedThreads
  if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
    throw new Error(`Channel "#${channel.name}" does not support archived threads. Must be a text or announcement channel.`);
  }

  const textChannel = channel as TextChannel | NewsChannel;

  const fetchOptions: FetchArchivedThreadOptions = {};
  if (limit) fetchOptions.limit = limit;
  if (before) fetchOptions.before = new Date(before);

  let archived;
  if (type === 'private') {
    archived = await textChannel.threads.fetchArchived({ ...fetchOptions, type: 'private' });
  } else {
    archived = await textChannel.threads.fetchArchived({ ...fetchOptions, type: 'public' });
  }

  const threads = archived.threads.map(t => formatThread(t as ThreadChannel));

  return JSON.stringify({
    channel: { name: textChannel.name, id: textChannel.id },
    type,
    hasMore: archived.hasMore,
    threadCount: threads.length,
    threads,
  }, null, 2);
}

async function editThread(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const name = args['name'] as string | undefined;
  const autoArchiveDuration = args['autoArchiveDuration'] as number | undefined;
  const rateLimitPerUser = args['rateLimitPerUser'] as number | undefined;
  const archived = args['archived'] as boolean | undefined;
  const locked = args['locked'] as boolean | undefined;
  const reason = args['reason'] as string | undefined;

  const thread = await findThread(threadIdentifier);

  const edits: Record<string, unknown> = {};
  if (name !== undefined) edits['name'] = name;
  if (autoArchiveDuration !== undefined) edits['autoArchiveDuration'] = autoArchiveDuration as ThreadAutoArchiveDuration;
  if (rateLimitPerUser !== undefined) edits['rateLimitPerUser'] = rateLimitPerUser;
  if (archived !== undefined) edits['archived'] = archived;
  if (locked !== undefined) edits['locked'] = locked;
  if (reason !== undefined) edits['reason'] = reason;

  const changes = Object.keys(edits).filter(k => k !== 'reason');
  if (changes.length === 0) {
    throw new Error('No properties to edit. Provide at least one of: name, autoArchiveDuration, rateLimitPerUser, archived, locked.');
  }

  await thread.edit(edits);

  return JSON.stringify({
    success: true,
    message: `Thread "${thread.name}" updated: ${changes.join(', ')}`,
    thread: {
      ...formatThread(thread),
      rateLimitPerUser: thread.rateLimitPerUser ?? 0,
      autoArchiveDuration: thread.autoArchiveDuration ?? null,
    },
  }, null, 2);
}

async function getThreadPinnedMessages(args: Record<string, unknown>): Promise<string> {
  const threadIdentifier = args['thread'] as string;
  const thread = await findThread(threadIdentifier);

  const pinned = await thread.messages.fetchPinned();

  const pinnedList = pinned
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(msg => ({
      id: msg.id,
      content: msg.content || '(no text content)',
      author: {
        id: msg.author.id,
        username: msg.author.username,
        isBot: msg.author.bot,
      },
      createdAt: msg.createdAt.toISOString(),
      hasEmbeds: msg.embeds.length > 0,
      hasAttachments: msg.attachments.size > 0,
    }));

  return JSON.stringify({
    thread: { name: thread.name, id: thread.id },
    pinnedCount: pinnedList.length,
    messages: pinnedList,
  }, null, 2);
}
