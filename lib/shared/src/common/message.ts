
export interface CompletionMessage {
    role: 'system' | 'assistant' | 'user';
    content: string;
}