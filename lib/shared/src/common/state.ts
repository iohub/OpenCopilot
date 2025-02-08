import { SystemPrompt } from "../prompt/system-prompt"

export interface CodeLensCommand {
    id: string
    title: string
    tooltip: string
    action: string
    messageTemplate: string
}

export interface ModelProvider {
    id: string
    name: string
    visible: boolean
    order: number
    status?: string
    category: string
}

export interface SharedState {
	version: string
	uriScheme?: string
	apiConfiguration?: ApiConfiguration
	systemPrompts: SystemPrompt[]
	systemPrompt: SystemPrompt
	modelOptions: ModelProvider[]
	codeLensCommands: CodeLensCommand[]
}

export interface ProviderConfig {
    provider: string
    model: string
    apiKey: string
    baseUrl: string
}

export type ApiProvider =
	| "anthropic"
	| "openrouter"
	| "bedrock"
	| "vertex"
	| "openai"
	| "ollama"
	| "lmstudio"
	| "gemini"
	| "openai-native"
	| "deepseek"

type ApiConfiguration = {
	apiProvider?: ApiProvider
	providerConfig?: ProviderConfig
}

export function getSystemPromptNameByID(systemPrompts: SystemPrompt[], id: string): string {
    const prompt = systemPrompts.find(prompt => prompt.id === id);
    return prompt?.name || id;
}

export function getCurrentModelName(state: SharedState | undefined): string {
	if (!state) {
		return "";
	}
    const found = state.modelOptions.find(entry => entry.id === state.apiConfiguration?.apiProvider);
    return found?.name || "";
}