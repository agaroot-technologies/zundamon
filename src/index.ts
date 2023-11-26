import { SlackApp } from 'slack-edge';

import { appMentionHandler } from './event/app-mention-handler';

import type { Env } from './type/env';

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    const app = new SlackApp({ env });

    app.event('app_mention', appMentionHandler);

    return await app.run(request, context);
  },
};
