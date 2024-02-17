import { StateGraph } from '@langchain/langgraph';
import { Calculator } from 'langchain/tools/calculator';

import { createAgentNode } from './node/agent-node';
import { createConversationStoreNode } from './node/conversation-store-node';
import { createToolNode } from './node/tool-node';
import { createZundanizeNode } from './node/zundanize-node';
import { createConversationSearchTool } from '../tool/conversation-search-tool';
import { createThreadSummaryTool } from '../tool/thread-summary-tool';
import { createWebSummaryTool } from '../tool/web-summary-tool';

import type { GraphChannels } from './type/graph-channels';
import type { Reply } from '../type/reply';
import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredTool } from '@langchain/core/tools';
import type { ChatOpenAI } from 'langchain/chat_models/openai';
import type { Embeddings } from 'langchain/embeddings/base';
import type { VectorStore } from 'langchain/vectorstores/base';

export type CreateGraphParameters = {
  chatModel: ChatOpenAI;
  summaryModel: ChatOpenAI;
  zundanizeModel: ChatOpenAI;
  embeddingsModel: Embeddings;
  conversationVectorStore: VectorStore;
  replies: Reply[];
};

export type Graph = {
  invoke: (input: Partial<GraphChannels>) => Promise<GraphChannels>;
};

export const createGraph = ({
  chatModel,
  summaryModel,
  zundanizeModel,
  embeddingsModel,
  conversationVectorStore,
  replies,
}: CreateGraphParameters): Graph => {
  const tools: StructuredTool[] = [
    new Calculator(),
    createConversationSearchTool({ summaryModel, conversationVectorStore }),
    createThreadSummaryTool({ summaryModel, embeddingsModel, replies }),
    createWebSummaryTool({ summaryModel, embeddingsModel }),
  ];

  const agentNode = createAgentNode({ chatModel, tools, replies });
  const toolNode = createToolNode({ tools });
  const zundanizeNode = createZundanizeNode({ zundanizeModel });
  const conversationStoreNode = createConversationStoreNode({ conversationVectorStore, replies });

  const workflow = new StateGraph<GraphChannels>({
    channels: {
      context: {
        value: null,
      },
      messages: {
        value: (x: BaseMessage[], y: BaseMessage[]) => [...x, ...y],
        default: () => [],
      },
    },
  });

  workflow.addNode(agentNode.name, agentNode.action);
  workflow.addNode(toolNode.name, toolNode.action);
  workflow.addNode(zundanizeNode.name, zundanizeNode.action);
  workflow.addNode(conversationStoreNode.name, conversationStoreNode.action);

  workflow.setEntryPoint(agentNode.name);
  workflow.addConditionalEdges(agentNode.name, ({ messages }: GraphChannels) => {
    const lastMessage = messages.at(-1);
    const hasFunctionCall = !!lastMessage?.additional_kwargs?.function_call;
    return hasFunctionCall ? toolNode.name : zundanizeNode.name;
  }, {
    [toolNode.name]: toolNode.name,
    [zundanizeNode.name]: zundanizeNode.name,
  });
  workflow.addEdge(toolNode.name, agentNode.name);
  workflow.addEdge(zundanizeNode.name, conversationStoreNode.name);
  workflow.setFinishPoint(conversationStoreNode.name);

  return workflow.compile();
};
