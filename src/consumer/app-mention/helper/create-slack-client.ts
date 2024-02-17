import { SlackAPIClient } from 'slack-edge';

import type { Env } from '../../../type/env';

export const createSlackClient = (env: Env) => {
  return new SlackAPIClient(env.SLACK_BOT_TOKEN, {
    logLevel: env.SLACK_LOGGING_LEVEL ?? 'INFO',
  });
};
