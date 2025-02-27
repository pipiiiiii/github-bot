import { DingBot } from '@/ding/bot';
import { Context } from '@/ding/commands';
import { StringBuilder } from '@/utils';

import { OpenAI } from '../openai';

import { ConversationKVManager } from './kvManager';
import { EMessageRole } from './types';
// export const STOP_KEYWORD = '<|endoftext|>';
export const STOP_KEYWORD = '';

export class Conversation {
  conversationId: string;
  conversationKVManager: ConversationKVManager;

  currentRoundPrompt: string;

  constructor(bot: DingBot, ctx: Context, protected openai: OpenAI) {
    this.conversationId = bot.msg.conversationId;
    this.conversationKVManager = bot.conversationKVManager;

    this.currentRoundPrompt = ctx.command;
  }

  _maxResponseTokens = 1000;

  async reply() {
    const currentDate = new Date().toISOString().split('T')[0];

    const history = await this.conversationKVManager.getConversation();
    await history.recordHuman(this.currentRoundPrompt);

    const builder = new StringBuilder();
    builder.add(
      `Instructions:\nYou are ${EMessageRole.AI}, a large language model trained by OpenAI.
      Current date: ${currentDate}${STOP_KEYWORD}\n\n`,
    );
    builder.add(`${EMessageRole.AI} 和 ${EMessageRole.Human} 使用中文交流。\n`);
    builder.addLineIfNecessary();

    if (history) {
      const data = history.data;
      for (const item of data) {
        builder.add(`${item.type}: ${item.str}${STOP_KEYWORD}`);
      }
    }
    builder.add(
      `${EMessageRole.Human}: ${this.currentRoundPrompt}${STOP_KEYWORD}`,
    );
    builder.add(`${EMessageRole.AI}:${STOP_KEYWORD}`);

    const prompt = builder.toString();

    const text = await this.openai.createCompletion(prompt, {});

    if (text) {
      await history.recordAI(text);
      return text;
    }
  }
}
