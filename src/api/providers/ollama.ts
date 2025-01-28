import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { ApiHandler } from "../"
import { ApiHandlerOptions, ModelInfo, openAiModelInfoSaneDefaults } from "../../shared/api"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

export class OllamaHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		this.options = options
		this.client = new OpenAI({
			baseURL: this.options.providerConfig?.baseUrl || "http://localhost:11434",
			apiKey: this.options.providerConfig?.apiKey || "ollama",
		})
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...convertToOpenAiMessages(messages),
		]

		const stream = await this.client.chat.completions.create({
			model: this.getModel().id,
			messages: openAiMessages,
			temperature: 0,
			stream: true,
		})
		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta
			if (delta?.content) {
				yield {
					type: "text",
					text: delta.content,
				}
			}
		}
	}

	async completeMessage(systemPrompt: string, messages: OpenAI.Chat.ChatCompletionMessageParam[]): Promise<string> {
		const response = await this.client.chat.completions.create({
			model: this.getModel().id,
			messages: [
				{ role: "system", content: systemPrompt },
				...messages
			],
			temperature: 0,
			stream: false,
		})

		return response.choices[0]?.message?.content || ""
	}

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.providerConfig?.model || "",
			info: openAiModelInfoSaneDefaults,
		}
	}
}
