import { ChatOpenAI } from 'langchain/chat_models/openai';

import type { Env } from '../../../type/env';

export const createZundanizeModel = (env: Env) => {
  return new ChatOpenAI({
    verbose: true,
    modelName: env.OPENAI_ZUNDANIZE_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
};
