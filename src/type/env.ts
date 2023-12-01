import type { QueueMessageBody } from './queue-message-body';
import type { SlackEdgeAppEnv } from 'slack-edge';

export type Env = SlackEdgeAppEnv & {
  OPENAI_API_KEY: string;
  OPENAI_MODEL_NAME: string;
  OPENAI_CHAT_MODEL_NAME: string;
  OPENAI_EMBEDDINGS_MODEL_NAME: string;
  OPENAI_BASE_URL: string;
  QUEUE: Queue<QueueMessageBody>;
};
