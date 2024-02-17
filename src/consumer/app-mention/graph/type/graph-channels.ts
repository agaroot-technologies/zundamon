import type { BaseMessage } from '@langchain/core/messages';

export type GraphChannels = {
  context: {
    botUserId: string;
    replyUserId: string;
    replyUserText: string;
  };
  messages: BaseMessage[];
};
