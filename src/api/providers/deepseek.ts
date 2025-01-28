import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import {
	ApiHandlerOptions,
	ModelInfo,
	deepseekModelInfo,
} from "../../shared/api"
import { ApiHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

export class DeepseekHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		this.options = options
		console.log(`DeepseekHandler options ${JSON.stringify(this.options)}`)
		this.client = new OpenAI({
			baseURL: this.options.providerConfig?.baseUrl,
			apiKey: this.options.providerConfig?.apiKey,
		})
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]
		const stream = await this.client.chat.completions.create({
			model: this.options.providerConfig?.model ?? "deepseek-chat",
			messages: openAiMessages,
			temperature: 0,
			stream: true,
			stream_options: { include_usage: true },
		})
		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}
			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
				}
			}
		}
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.providerConfig?.model ?? "deepseek-chat",
			info: deepseekModelInfo,
		}
	}

	async completeMessage(systemPrompt: string, messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
		const response = await this.client.chat.completions.create({
			model: this.options.providerConfig?.model ?? "deepseek-chat",
			messages: [
				{ role: "system", content: systemPrompt },
				...messages
			],
			temperature: 0,
			stream: false,
		})

		return response.choices[0]?.message?.content || ""
	}
}
