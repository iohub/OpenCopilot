import { Anthropic } from "@anthropic-ai/sdk"

export function removeMiddleImageBlockParam(messages: Anthropic.Messages.MessageParam[]): Anthropic.Messages.MessageParam[] {
    // Find indices of messages containing ImageBlockParam
    const imageIndices: number[] = messages.map((msg, index) => {
      if (Array.isArray(msg.content) && msg.content.some(block => block.type === 'image')) {
        return index;
      }
      return -1;
    }).filter(index => index !== -1);
  
    // If 0 or 1 messages with images, return original array
    if (imageIndices.length <= 1) {
      return messages;
    }
  
    // Keep first and last image messages, remove images from others
    return messages.map((msg, msgIndex) => {
      if (!Array.isArray(msg.content)) {
        return msg;
      }
  
      // If this message isn't the first or last one containing an image,
      // filter out the ImageBlockParam
      if (msgIndex !== imageIndices[0] && msgIndex !== imageIndices[imageIndices.length - 1]) {
        return {
          ...msg,
          content: msg.content.filter(block => block.type !== 'image')
        };
      }
  
      return msg;
    });
  }