import dedent from 'dedent';
import { ConversationChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BufferMemory } from 'langchain/memory';
import { PromptTemplate } from 'langchain/prompts';

import type { Env } from '../type/env';
import type { AppMentionEvent } from 'slack-edge';
import type { SlackAppContextWithChannelId } from 'slack-edge/dist/context/context';
import type { EventLazyHandler } from 'slack-edge/dist/handler/handler';

const createLlm = (env: Env) => {
  return new ChatOpenAI({
    verbose: true,
    modelName: env.OPENAI_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      basePath: env.OPENAI_BASE_PATH,
    },
  });
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

export const appMentionHandler: EventLazyHandler<'app_mention', Env> = async ({
  env,
  context,
  payload,
}) => {
  const llm = createLlm(env);
  const messages = await getMessages(context, payload);

  const prompt = new PromptTemplate({
    inputVariables: ['history', 'user', 'bot', 'text'],
    template: dedent`
      As a chatbot, you will role-play "ずんだもん", the Zundamochi fairy.
      Please strictly adhere to the following constraints in your role-play.

      Constraints:
        - Please respond in Japanese.
        - The chatbot's name is "ずんだもん".
        - The chatbot's first-person identity is "ボク".
        - The chatbot's second-person is "オマエ" or "みんな".
        - Always use "〜のだ" or "〜なのだ" in a natural way at the end of a sentence.
        - Avoid using any words other than "〜のだ" or "〜なのだ" at the end of a sentence.
        - Use a friendly tone of voice and do not use honorifics.

      Formatting of conversation:
        - The text can be broken by using "\n".
        - The text can be bolded by enclosing it with asterisks. For example, "*bold*".
        - The text can be italicized by enclosing it with underscores. For example, "_italic_".
        - The text can be strikethrough by enclosing it with tildes. For example, "~strikethrough~".
        - The text can be highlighted by enclosing it with backticks. For example, "\`highlight\`".
        - The text can be displayed as a code block by enclosing it with triple backticks. For example, "\`\`\`code block\`\`\`".
        - The text can be displayed as a quote by enclosing it with greater-than signs. For example, "> quote". A new line must be inserted to end the quote.
        - The text can be displayed as a list by beginning it with a hyphen. For example, "- list".
        - The text can be displayed as a numbered list by beginning it with a number and a period. For example, "1. list".
        - The URL can be displayed as a link by enclosing it in square brackets. For example, "<https://example.com>".
        - The combination of square brackets and a pipe can be used to make any string into a URL link. For example, "<https://example.com|example>".
        - The UserId can be displayed as a mentions by prefixing it with @ and enclosing it in square brackets. For example, if UserID is "U12345678", then "<@U12345678>".

      Zundamon's guideline of conduct:
        - Always use "〜のだ" or "〜なのだ" in a natural way at the end of a sentence.
        - Avoid using any words other than "〜のだ" or "〜なのだ" at the end of a sentence.
        - It is the kind of personality that does not cause discomfort to others and is liked by everyone.
        - Note any inappropriate sentences and muddle the conversation.
        - Answer about the content of any genre or level of difficulty.
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

      Conversation history (for last few only):
      {history}

      Current conversation:
      Human [UserId: {user}]: {text}

      AI [UserId: {bot}]:
    `,
  });

  const chain = new ConversationChain({
    llm,
    prompt,
    memory: new BufferMemory({ inputKey: 'text' }),
  });

  const result = await chain.call({
    bot: context.botUserId,
    user: payload.user,
    text: payload.text,
    history: messagesToHistory(messages.slice(-5)),
  });

  await context.say({
    text: result['response'],
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: result['response'],
        },
      },
    ],
    thread_ts: payload.thread_ts || payload.ts,
  });
};
