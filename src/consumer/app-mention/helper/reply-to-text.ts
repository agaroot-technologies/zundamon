import type { Reply } from '../type/reply';

export const replyToText = (reply: Reply): string => {
  return `${reply.type} [UserId: ${reply.userId}]\n${reply.content}`;
};
