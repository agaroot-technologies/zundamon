import { literal, object, string } from 'valibot';

import type { Input } from 'valibot';

export const AppMentionEventSchema = object({
  type: literal('app-mention'),
  context: object({
    channel: string(),
    threadTs: string(),
    replyTs: string(),
    bot: string(),
  }),
  payload: object({
    ts: string(),
    user: string(),
    text: string(),
  }),
});

export type AppMentionEvent = Input<typeof AppMentionEventSchema>;
