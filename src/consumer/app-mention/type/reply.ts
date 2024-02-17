export type Reply = {
  type: 'AI' | 'Human';
  userId: string;
  content: string;
};
