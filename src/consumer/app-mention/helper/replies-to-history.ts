import { replyToText } from './reply-to-text';

import type { Reply } from '../type/reply';

export const repliesToText = (replies: Reply[]): string => {
  return replies.reduce((previous, reply, index) => {
    let prefix = '';
    if (0 < index) prefix += '\n\n';
    return previous + `${prefix}${replyToText(reply)}`;
  }, '');
};
