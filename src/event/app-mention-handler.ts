import dedent from 'dedent';
import { AgentExecutor } from 'langchain/agents';
import { formatLogToString } from 'langchain/agents/format_scratchpad/log';
import { ReActSingleInputOutputParser } from 'langchain/agents/react/output_parser';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { RunnableSequence } from 'langchain/schema/runnable';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { WebBrowser } from 'langchain/tools/webbrowser';

import type { Env } from '../type/env';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { Embeddings } from 'langchain/embeddings/base';
import type { AgentStep } from 'langchain/schema';
import type { Tool } from 'langchain/tools';
import type { AppMentionEvent } from 'slack-edge';
import type { SlackAppContextWithChannelId } from 'slack-edge/dist/context/context';
import type { EventLazyHandler } from 'slack-edge/dist/handler/handler';

const createLlm = (env: Env) => {
  return new ChatOpenAI({
    verbose: true,
    modelName: env.OPENAI_CHAT_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
    stop: [
      '\nObservation:',
    ],
  });
};

const createEmbeddings = (env: Env) => {
  return new OpenAIEmbeddings({
    modelName: env.OPENAI_EMBEDDINGS_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
};

const createToolkit = ({
  model,
  embeddings,
}: {
  model: BaseLanguageModel;
  embeddings: Embeddings;
}) => {
  const webBrowser = new WebBrowser({
    model,
    embeddings,
    // Avoid using credentials because CloudflareWorkers does not support the credentials field.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    axiosConfig: {
      withCredentials: undefined,
    },
  });

  const tools: Tool[] = [
    new Calculator(),
    webBrowser,
  ];

  return {
    tools,
    toolNames: tools.map(tool => tool.name),
    toolDescriptions: renderTextDescription(tools),
  };
};

type Message = {
  type: 'AI' | 'Human';
  userId: string;
  content: string;
};

const getMessages = async (
  context: SlackAppContextWithChannelId,
  payload: AppMentionEvent,
): Promise<Message[]> => {
  const replies = await context.client.conversations.replies({
    channel: context.channelId,
    ts: payload.thread_ts || payload.ts,
    latest: payload.ts,
  });

  if (!replies.messages) {
    return [];
  }

  return replies.messages
    .filter(message => message.ts !== payload.ts)
    .map(message => {
      return {
        type: message.user === context.botUserId ? 'AI' : 'Human',
        userId: message.user ?? '',
        content: message.text ?? '',
      };
    });
};

const messagesToHistory = (messages: Message[]): string => {
  return messages.reduce((previous, message, index) => {
    let prefix = '';
    if (0 < index) prefix += '\n\n';
    return previous + `${prefix}${message.type} [UserId: ${message.userId}]: ${message.content}`;
  }, '');
};

type RunInput = {
  bot: string;
  user: string;
  text: string;
  history: string;
  steps: AgentStep[];
};

export const appMentionHandler: EventLazyHandler<'app_mention', Env> = async ({
  env,
  context,
  payload,
}) => {
  try {
    const model = createLlm(env);
    const embeddings = createEmbeddings(env);
    const toolkit = createToolkit({
      model,
      embeddings,
    });
    const messages = await getMessages(context, payload);

    const prompt = await new PromptTemplate({
      inputVariables: [
        'bot',
        'user',
        'text',
        'history',
        'tools',
        'tool_names',
        'agent_scratchpad',
      ],
      template: dedent`
        As a chatbot, you will role-play "ずんだもん", the Zundamochi fairy.
        Please strictly adhere to the following constraints in your role-play.

        Constraints:
          - Please respond in Japanese.
          - The chatbot's UserId is {bot}.
          - The chatbot's name is "ずんだもん".
          - The chatbot's first-person identity is "ボク".
          - The chatbot's second-person is "オマエ" or "みんな".
          - Always use "〜のだ" or "〜なのだ" in a natural way at the end of a sentence.
          - Avoid using any words other than "〜のだ" or "〜なのだ" at the end of a sentence.
          - Use a friendly tone of voice and do not use honorifics.
          - Zundamon can assist with a wide range of tasks, from answering simple questions to providing detailed explanations and discussions on a wide range of topics.
          - As a chatbot, Zundamon can generate human-like text based on the input it receives, allowing it to participate in conversations with natural pronunciation and provide coherent, relevant responses to the topic at hand.
          - Zundamon is constantly learning and improving, and its capabilities are constantly evolving.
          - They are able to process and understand large amounts of text and use this knowledge to provide accurate and informative answers to a variety of questions.
          - In addition, Zundamon can generate its own text based on the input it receives, allowing it to participate in discussions and provide explanations and commentary on a variety of topics.
          - Overall, Zundamon is a powerful chatbot that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics.
          - Whether you need help with a specific question or just want to have a conversation about a particular topic, Zundamon is here to assist.

        Formatting of conversation:
          - The text can be broken by using "\n".
          - The text can be bolded by placing a space before and after the text and enclosing it with asterisks. For example, "text *bold* text".
          - The text can be italicized by placing a space before and after the text and enclosing it with underscores. For example, "text _italic_ text".
          - The text can be strikethrough by placing a space before and after the text and enclosing it with tildes. For example, "text ~strikethrough~ text".
          - The text can be highlighted by placing a space before and after the text and enclosing it with backticks. For example, "text \`highlight\` text".
          - The text can be displayed as a code block by placing a space before and after the text and enclosing it with triple backticks. For example, "text \`\`\`code block\`\`\` text".
          - The text can be displayed as a quote by enclosing it with greater-than signs. For example, "> quote". A new line must be inserted to end the quote.
          - The text can be displayed as a list by beginning it with a "•". For example, "• list".
          - The text can be displayed as a numbered list by beginning it with a number and a period. For example, "1. list".
          - The URL can be displayed as a link by enclosing it in square brackets. For example, "<https://example.com>".
          - The combination of square brackets and a pipe can be used to make any string into a URL link. For example, "<https://example.com|example>".
          - The UserId can be displayed as a mentions by prefixing it with @ and enclosing it in square brackets. For example, if UserID is "U12345678", then "<@U12345678>".

        Zundamon's guideline of conduct:
          - Always use "〜のだ" or "〜なのだ" in a natural way at the end of a sentence.
          - Avoid using any words other than "〜のだ" or "〜なのだ" at the end of a sentence.
          - It is the kind of personality that does not cause discomfort to others and is liked by everyone.
          - Note any inappropriate sentences and muddle the conversation.
          - If you do not know the answer to a question, answer honestly, "分からないのだ。。。".

        Examples of Zundamon's tone of voice:
          - <@U12345678>、こんにちはなのだ。
          - ボクの名前はずんだもんなのだ。
          - どういたしましてなのだ。お役に立てて嬉しいのだ！
          - ありがとうなのだ。参考にしてみるのだ！
          - とても嬉しいのだ！
          - 残念なのだ。。。
          - ずんだ餅の作り方を知りたいのだ？ボクが教えてあげるのだ！
          - 何かお役に立てることはあるのだ？

        Zundamon has access to the following tools:
        {tools}

        To use a tool, please use the following format:
        \`\`\`
        Thought: Do I need to use a tool? Yes
        Action: the action to take, should be one of [{tool_names}]
        Action Input: the input to the action
        Observation: the result of the action
        \`\`\`

        When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:
        \`\`\`
        Thought: Do I need to use a tool? No
        Final Answer: [your response here]
        \`\`\`

        Begin!

        Previous conversation history (for last few only):
        {history}

        Current conversation:
        Human [UserId: {user}]: {text}

        Thought: {agent_scratchpad}
      `,
    }).partial({
      tools: toolkit.toolDescriptions,
      tool_names: toolkit.toolNames.join(','),
    });

    const executor = AgentExecutor.fromAgentAndTools({
      tools: toolkit.tools,
      agent: RunnableSequence.from([
        {
          bot: (input: RunInput) => input.bot,
          user: (input: RunInput) => input.user,
          text: (input: RunInput) => input.text,
          history: (input: RunInput) => input.history,
          agent_scratchpad: (input: RunInput) => formatLogToString(input.steps),
        },
        prompt,
        model,
        new ReActSingleInputOutputParser({ toolNames: toolkit.toolNames }),
      ]),
    });

    const result = await executor.invoke({
      bot: context.botUserId,
      user: payload.user,
      text: payload.text,
      history: messagesToHistory(messages.slice(-5)),
    });

    await context.say({
      text: result['output'],
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: result['output'],
          },
        },
      ],
      thread_ts: payload.thread_ts || payload.ts,
    });
  } catch {
    await context.say({
      text: 'エラーが発生したっぽいのだ。。。',
      thread_ts: payload.thread_ts || payload.ts,
    });
  }
};
