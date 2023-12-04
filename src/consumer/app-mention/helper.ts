import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { WebBrowser } from 'langchain/tools/webbrowser';
import { SlackAPIClient } from 'slack-edge';

import type { AppMentionEvent } from './event';
import type { Env } from '../../type/env';
import type { BaseLanguageModel } from 'langchain/base_language';
import type { Embeddings } from 'langchain/embeddings/base';
import type { Tool } from 'langchain/tools';

export const createSlackClient = (env: Env) => {
  return new SlackAPIClient(env.SLACK_BOT_TOKEN, {
    logLevel: env.SLACK_LOGGING_LEVEL ?? 'INFO',
  });
};

export type Reply = {
  type: 'AI' | 'Human';
  userId: string;
  content: string;
};

export const getReplies = async (
  client: SlackAPIClient,
  event: AppMentionEvent,
): Promise<Reply[]> => {
  const replies = await client.conversations.replies({
    channel: event.context.channel,
    latest: event.context.replyTs,
    ts: event.context.threadTs,
  });

  if (!replies.messages) {
    return [];
  }

  return replies.messages
    .filter(message => {
      return !(
        message.ts === event.context.replyTs ||
        message.ts === event.payload.ts
      );
    })
    .map(message => {
      return {
        type: message.user === event.context.bot ? 'AI' : 'Human',
        userId: message.user ?? '',
        content: message.text ?? '',
      };
    });
};

export const repliesToHistory = (messages: Reply[]): string => {
  return messages.reduce((previous, message, index) => {
    let prefix = '';
    if (0 < index) prefix += '\n\n';
    return previous + `${prefix}${message.type} [UserId: ${message.userId}]: ${message.content}`;
  }, '');
};

export const createLlm = (env: Env) => {
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

export const createEmbeddings = (env: Env) => {
  return new OpenAIEmbeddings({
    modelName: env.OPENAI_EMBEDDINGS_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
  });
};

export const createToolkit = ({
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
  webBrowser.description = 'useful for when you need to find something on or summarize a webpage. input should be a comma separated list of "ONE valid http URL starting with the protocol","what you want to find on the page or empty string for a summary".';

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
