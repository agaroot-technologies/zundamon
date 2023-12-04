import dedent from 'dedent';
import { loadSummarizationChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Tool } from 'langchain/tools';
import urlRegexSafe from 'url-regex-safe';

import { WebDocumentLoader } from '../loader/web-document-loader';

import type { BaseLanguageModel } from 'langchain/base_language';
import type { CallbackManagerForToolRun } from 'langchain/callbacks';
import type { ToolParams } from 'langchain/tools';

const prompt = new PromptTemplate({
  template: dedent`
    The following is a set of documents:

    {text}

    Based on this list of docs, please identify the main themes.
    Also, provide up to five links from within that you think may be of interest.
    If there are links, provide them as a list under the heading "Relevant Links:".

    Helpful Answer:
  `,
  inputVariables: ['text'],
});

const mapPrompt = new PromptTemplate({
  template: dedent`
    The following is set of summaries:

    {text}

    Take these and distill it into a final, consolidated summary of the main themes. 
    Also, provide up to five links from within that you think may be of interest.
    If there are links, provide them as a list under the heading "Relevant Links:".

    Helpful Answer:
  `,
  inputVariables: ['text'],
});

export interface WebSummaryParameters extends ToolParams {
  model: BaseLanguageModel;
}

export class WebSummary extends Tool {
  public readonly name = 'web-summary';

  public readonly description = 'Useful for summarizing web pages provided by the user. Input should be "ONE valid http URL including protocol".';

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

    const chain = loadSummarizationChain(this.model, {
      type: 'map_reduce',
      combinePrompt: prompt,
      combineMapPrompt: mapPrompt,
    });

    const result = await chain.call({
      input_documents: documents,
    }, runManager?.getChild());

    return result['text'] as string;
  }
}
