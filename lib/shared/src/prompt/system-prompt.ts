export type SystemPrompt = {
	id: string
	name: string
	prompt: string
    category: string
}

export const CLINE_SYSTEM_PROMPT: SystemPrompt = {
	id: "cline",
	name: "CLINE",
	prompt: "default",
    category: "CLINE"
}

export function isClineBuiltInPrompt(prompt: SystemPrompt): boolean {
	return prompt.id.toLowerCase() === CLINE_SYSTEM_PROMPT.id
}
