import dedent from 'dedent';
import { loadSummarizationChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';

import type { BaseLanguageModel } from 'langchain/base_language';

const prompt = new PromptTemplate({
  template: dedent`
    The following is a set of documents:

    {text}

    Based on this list of docs, please provide a summary.
    Also, provide up to five links from within that you think may be of interest.
    If there are links, provide them as a list under the heading "Relevant Links:".

    Helpful Answer:
  `,
  inputVariables: ['text'],
});

export const createStuffSummarizationChain = (model: BaseLanguageModel) => {
  return loadSummarizationChain(model, {
    type: 'stuff',
    prompt,
  });
};
