import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import urlRegexSafe from 'url-regex-safe';

import { createMapReduceSummarizationChain } from '../chains/map-reduce-summarization-chain';
import { WebDocumentLoader } from '../loader/web-document-loader';

import type { BaseLanguageModel } from 'langchain/base_language';
import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import type { ToolParams } from 'langchain/tools';

export interface WebSummaryParameters extends ToolParams {
  model: BaseLanguageModel;
}

export class WebSummary extends Tool {
  public readonly name = 'web-summary';

  public readonly description = 'Useful for summarizing web pages provided by the user. Always use only URL provided directly by the user as input, and do not use self-generated URL. Also, input must be "ONE valid http URL including protocol".';

  private readonly model: BaseLanguageModel;

  public constructor({
    model,
  }: WebSummaryParameters) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments);

    this.model = model;
  }

  public static override lc_name() {
    return 'WebSummary';
  }

  public override get lc_namespace() {
    return [...super.lc_namespace, 'websummary'];
  }

  protected async _call(input: string, runManager?: CallbackManagerForToolRun): Promise<string> {
    const [url] = input
      .replace(/^<(.+)>$/, '$1')
      .match(urlRegexSafe({ strict: true })) || [];

    if (!url) {
      return 'Invalid URL string.';
    }

    const loader = new WebDocumentLoader({ url });

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 4096,
      chunkOverlap: 256,
    });

    const documents = await splitter.splitDocuments(await loader.load());

    const chain = createMapReduceSummarizationChain(this.model);

    const result = await chain.call({
      input_documents: documents,
    }, runManager?.getChild());

    return result['text'] as string;
  }
}
