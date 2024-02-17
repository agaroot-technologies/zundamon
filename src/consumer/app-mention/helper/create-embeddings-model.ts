import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

import type { Env } from '../../../type/env';

export const createEmbeddingsModel = (env: Env) => {
  return new OpenAIEmbeddings({
    modelName: env.OPENAI_EMBEDDINGS_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
};
