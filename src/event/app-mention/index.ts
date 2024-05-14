import { AppMentionEventSchema } from '../../consumer/app-mention/event';

import type { Env } from '../../type/env';
import type { EventLazyHandler } from 'slack-edge/dist/handler/handler';

export const appMentionHandler: EventLazyHandler<'app_mention', Env> = async ({
  env,
  context,
  payload,
}) => {
  if (payload.edited) return;

  const response = await context.say({
    text: '考え中なのだ。',
    thread_ts: payload.thread_ts || payload.ts,
  });

  await env.QUEUE.send(AppMentionEventSchema.parse( {
    type: 'app-mention',
    context: {
      channel: context.channelId,
      threadTs: payload.thread_ts || payload.ts,
      replyTs: response.message?.ts,
      bot: context.botUserId,
    },
    payload: {
      ts: payload.ts,
      user: payload.user,
      text: payload.text,
    },
  }));
};
