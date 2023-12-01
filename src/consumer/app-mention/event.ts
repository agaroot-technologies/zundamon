import { literal, object, string } from 'valibot';

import type { Input } from 'valibot';

export const AppMentionEventSchema = object({
  type: literal('app-mention'),
  context: object({
    channel: string(),
    ts: string(),
    bot: string(),
  }),
  payload: object({
    user: string(),
    text: string(),
  }),
});

export type AppMentionEvent = Input<typeof AppMentionEventSchema>;
