import dedent from 'dedent';
import { loadSummarizationChain } from 'langchain/chains';
import { PromptTemplate } from 'langchain/prompts';

import type { BaseLanguageModel } from 'langchain/base_language';

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

export const createMapReduceSummarizationChain = (model: BaseLanguageModel) => {
  return loadSummarizationChain(model, {
    type: 'map_reduce',
    combinePrompt: prompt,
    combineMapPrompt: mapPrompt,
  });
};
