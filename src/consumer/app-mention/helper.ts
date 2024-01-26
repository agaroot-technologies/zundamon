import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Calculator } from 'langchain/tools/calculator';
import { renderTextDescription } from 'langchain/tools/render';
import { SlackAPIClient } from 'slack-edge';

import { RepliesSummary } from './tools/replies-summary';
import { WebSummary } from './tools/web-summary';

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

export const createChatLlm = (env: Env) => {
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

export const createSummaryLlm = (env: Env) => {
  return new ChatOpenAI({
    verbose: true,
    modelName: env.OPENAI_SUMMARY_MODEL_NAME,
    openAIApiKey: env.OPENAI_API_KEY,
    configuration: {
      baseURL: env.OPENAI_BASE_URL,
    },
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
  replies,
}: {
  model: BaseLanguageModel;
  embeddings: Embeddings;
  replies: Reply[];
}) => {
  const tools: Tool[] = [
    new Calculator(),
    new RepliesSummary({ model, embeddings, replies }),
    new WebSummary({ model }),
  ];

  return {
    tools,
    toolNames: tools.map(tool => tool.name),
    toolDescriptions: renderTextDescription(tools),
  };
};

export const formatTextDecoration = (text: string): string => {
  return text
    .replaceAll(/\*\*(.+?)\*\*/g, ' *$1* ')
    .replaceAll(/\*(.+?)\*/g, ' *$1* ')
    .replaceAll(/_(.+?)_/g, ' _$1_ ')
    .replaceAll(/~(.+?)~/g, ' ~$1~ ')
    .replaceAll(/`(.+?)`/g, ' `$1` ')
    .replaceAll(/<(.+?)>/g, ' <$1> ')
    .replaceAll('¥¥¥', '```');
};
