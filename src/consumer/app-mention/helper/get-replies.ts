import type { AppMentionEvent } from '../event';
import type { Reply } from '../type/reply';
import type { SlackAPIClient } from 'slack-edge';

export const getReplies = async (
  client: SlackAPIClient,
  event: AppMentionEvent,
): Promise<Reply[]> => {
  const replies = await client.conversations.replies({
    channel: event.context.channel,
    latest: event.context.replyTs,
    ts: event.context.threadTs,
  });

  if (!replies.messages) {
    return [];
  }

  return replies.messages
    .filter((message) => {
      return !(
        message.ts === event.context.replyTs
        || message.ts === event.payload.ts
      );
    })
    .map((message) => {
      return {
        type: message.user === event.context.bot ? 'AI' : 'Human',
        userId: message.user ?? '',
        content: message.text ?? '',
      };
    });
};
