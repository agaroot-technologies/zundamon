import type { BaseMessage } from '@langchain/core/messages';

export type GraphChannels = {
  context: {
    botUserId: string;
    replyUserId: string;
    replyUserText: string;
    images: string[];
  };
  messages: BaseMessage[];
};
