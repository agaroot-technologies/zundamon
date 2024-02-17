import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { DynamicStructuredTool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { z } from 'zod';

import { createMapReduceSummarizationChain } from '../chain/map-reduce-summarization-chain';
import { WebDocumentLoader } from '../loader/web-document-loader';

import type { BaseLanguageModel } from 'langchain/base_language';
import type { Embeddings } from 'langchain/embeddings/base';
import type { ToolParams } from 'langchain/tools';

export interface CreateWebSummaryToolParameters extends ToolParams {
  summaryModel: BaseLanguageModel;
  embeddingsModel: Embeddings;
}

export const createWebSummaryTool = ({
  summaryModel,
  embeddingsModel,
  ...parameters
}: CreateWebSummaryToolParameters) => new DynamicStructuredTool({
  ...parameters,
  name: 'web-summary',
  description: 'Useful for when you need to find something on or summarize a web pages.',
  schema: z.object({
    url: z.string().url().describe('The URL of the web page to summarize. Must be a valid http URL including protocol.'),
    query: z.string().nullish().describe('What you want to find in the replies.'),
  }),
  func: async ({ url, query }, runManager) => {
    const loader = new WebDocumentLoader({ url });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4096,
      chunkOverlap: 256,
    });

    let documents = await splitter.splitDocuments(await loader.load());

    if (query) {
      const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddingsModel);
      documents = await vectorStore.similaritySearch(
        query,
        4,
        undefined,
        runManager?.getChild('vectorstore'),
      );
    }

    const chain = createMapReduceSummarizationChain(summaryModel);

    const result = await chain.invoke({
      input_documents: documents,
    }, runManager?.getChild());

    return result['text'] as string;
  },
});
