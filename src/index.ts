import { SlackApp } from 'slack-edge';

import type { SlackEdgeAppEnv } from 'slack-edge';

export default {
  async fetch(
    request: Request,
    env: SlackEdgeAppEnv,
    context: ExecutionContext,
  ): Promise<Response> {
    const app = new SlackApp({ env });

    return await app.run(request, context);
  },
};
