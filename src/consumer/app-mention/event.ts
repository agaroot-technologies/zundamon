import { z } from 'zod';

export const AppMentionEventSchema = z.object({
  type: z.literal('app-mention'),
  context: z.object({
    channel: z.string(),
    threadTs: z.string(),
    replyTs: z.string(),
    bot: z.string(),
  }),
  payload: z.object({
    ts: z.string(),
    user: z.string(),
    text: z.string(),
  }),
});

export type AppMentionEvent = z.infer<typeof AppMentionEventSchema>;
