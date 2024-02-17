import type { GraphChannels } from './graph-channels';
import type { RunnableLike } from '@langchain/core/runnables';

export type GraphNode = {
  name: string;
  action: RunnableLike<GraphChannels, Partial<GraphChannels>>;
};
