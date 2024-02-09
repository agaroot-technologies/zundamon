import { Tool } from 'langchain/tools';

import { createStuffSummarizationChain } from '../chains/stuff-summarization-chain';

import type { BaseLanguageModel } from 'langchain/base_language';
import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import type { ToolParams } from 'langchain/tools';
import type { VectorStore } from 'langchain/vectorstores/base';

export interface RepliesSearchParameters extends ToolParams {
  model: BaseLanguageModel;
  store: VectorStore;
  threshold?: number;
}

export class RepliesSearch extends Tool {
  public readonly name = 'replies-search';

  public readonly description = 'Useful for searching for unfamiliar words and past reply history.';

  private readonly model: BaseLanguageModel;

  private readonly store: VectorStore;

  private readonly threshold: number;

  constructor({
    model,
    store,
    threshold = 0.25,
  }: RepliesSearchParameters) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments);

    this.model = model;
    this.store = store;
    this.threshold = threshold;
  }

  public static override lc_name() {
    return 'RepliesSearch';
  }

  public override get lc_namespace() {
    return [...super.lc_namespace, 'repliessearch'];
  }

  protected async _call(input: string, runManager?: CallbackManagerForToolRun): Promise<string> {
    const documentWithScores = await this.store.similaritySearchWithScore(
      input,
      10,
      undefined,
      runManager?.getChild('vectorstore'),
    );

    const documents = documentWithScores
      .filter(([_, score]) => this.threshold < score)
      .map(([document]) => document);

    const chain = createStuffSummarizationChain(this.model);

    const result = await chain.invoke({
      input_documents: documents,
    }, runManager?.getChild());

    return result['text'] as string;
  }
}
