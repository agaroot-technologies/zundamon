import { CloudflareVectorizeStore } from '@langchain/cloudflare';

import type { Env } from '../../../type/env';
import type { Embeddings } from '@langchain/core/embeddings';

export const createConversationVectorStore = (env: Env, embeddings: Embeddings) => {
  return new CloudflareVectorizeStore(embeddings, {
    index: env.VECTORIZE_CONVERSATION,
  });
};
