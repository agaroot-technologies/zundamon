import { AIMessage } from '@langchain/core/messages';
import { Document } from 'langchain/document';

import { repliesToText } from '../../helper/replies-to-history';

import type { Reply } from '../../type/reply';
import type { GraphNode } from '../type/graph-node';
import type { VectorStore } from 'langchain/vectorstores/base';

export type CreateAgentNodeParameters = {
  conversationVectorStore: VectorStore;
  replies: Reply[];
};

export const createConversationStoreNode = ({
  conversationVectorStore,
  replies,
}: CreateAgentNodeParameters): GraphNode => {
  return {
    name: 'conversation-store',
    action: async ({ context, messages }) => {
      const lastMessage = messages.at(-1);
      if (!lastMessage || !(lastMessage instanceof AIMessage)) {
        throw new Error('No message found');
      }

      await conversationVectorStore.addDocuments([
        new Document({
          pageContent: repliesToText([
            ...replies.slice(-5),
            { type: 'Human', userId: context.replyUserId, content: context.replyUserText },
            { type: 'AI', userId: context.botUserId, content: String(lastMessage.content ?? '') },
          ]),
        }),
      ]);

      return {};
    },
  };
};
