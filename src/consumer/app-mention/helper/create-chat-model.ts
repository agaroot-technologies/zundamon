import { ChatOpenAI } from 'langchain/chat_models/openai';

import type { Env } from '../../../type/env';

export const createChatModel = (env: Env) => {
  return new ChatOpenAI({
    verbose: true,
    modelName: env.OPENAI_CHAT_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
};
