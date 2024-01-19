import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { createMapReduceSummarizationChain } from '../chains/map-reduce-summarization-chain';
import { repliesToHistory } from '../helper';

import type { Reply } from '../helper';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import type { Embeddings } from 'langchain/embeddings/base';
import type { ToolParams } from 'langchain/tools';

export interface SlackThreadSummaryParameters extends ToolParams {
  model: BaseLanguageModel;
  embeddings: Embeddings;
  replies: Reply[];
}

export class RepliesSummary extends Tool {
  public readonly name = 'replies-summary';

  public readonly description = 'Useful for summarizing replies. Input should be empty if you just want a summary, or a word if there is something you want to find in the replies.';

  private readonly model: BaseLanguageModel;

  private readonly embeddings: Embeddings;

  private readonly replies: Reply[];

  public constructor({
    model,
    embeddings,
    replies,
  }: SlackThreadSummaryParameters) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments);

    this.model = model;
    this.embeddings = embeddings;
    this.replies = replies;
  }

  public static override lc_name() {
    return 'RepliesSummary';
  }

  public override get lc_namespace() {
    return [...super.lc_namespace, 'repliessummary'];
  }

  protected async _call(input: string, runManager?: CallbackManagerForToolRun): Promise<string> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4096,
      chunkOverlap: 256,
    });

    let documents = await splitter.splitDocuments([
      new Document({
        pageContent: repliesToHistory(this.replies),
      }),
    ]);

    if (input) {
      const vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
      documents = await vectorStore.similaritySearch(
        input,
        4,
        undefined,
        runManager?.getChild('vectorstore'),
      );
    }

    const chain = createMapReduceSummarizationChain(this.model);

    const result = await chain.call({
      input_documents: documents,
    }, runManager?.getChild());

    return result['text'] as string;
  }
}
