export interface ModelProvider {
    id: string
    name: string
    visible: boolean
    order: number
    status?: string
    category?: string
}

export const DEFAULT_MODEL_PROVIDER_STR = `

[
  {
    "id": "openrouter",
    "name": "OpenRouter",
    "visible": false,
    "order": 1,
    "category": "CLINE"
  },
  {
    "id": "deepseek",
    "name": "DeepSeek V3",
    "visible": true,
    "order": 2,
    "category": "powerful models"
  },
  {
    "id": "anthropic", 
    "name": "Anthropic",
    "visible": false,
    "order": 102,
    "category": "assistant"
  },
  {
    "id": "openai",
    "name": "OpenAI Compatible",
    "visible": true,
    "order": 103,
    "category": "assistant"
  },
  {
    "id": "openai-native",
    "name": "OpenAI",
    "visible": false,
    "order": 104
  },
  {
    "id": "ollama",
    "name": "Ollama | LLaMA.cpp",
    "visible": true,
    "order": 105,
    "category": "assistant"
  },
  {
    "id": "bedrock",
    "name": "AWS Bedrock",
    "visible": false,
    "order": 106
  },
  {
    "id": "vertex",
    "name": "Vertex AI",
    "visible": false,
    "order": 107
  },
  {
    "id": "lmstudio",
    "name": "LM Studio",
    "visible": false,
    "order": 108
  },
  {
    "id": "gemini",
    "name": "Gemini",
    "visible": false,
    "order": 109
  }
]

`;

export const DEFAULT_CODELENS_COMMANDS_STR = `{
    "commands": [
        {
            "id": "explain",
            "title": "💡Explain",
            "tooltip": "Get an explanation of this code",
            "action": "explain",
            "messageTemplate": "Please explain this code in {fileName}:\\n\\n\`\`\`\\n{code}\\n\`\`\`\\n\\n"
        },
        {
            "id": "comment", 
            "title": "📝Comment",
            "tooltip": "Generate comments for this code",
            "action": "comment",
            "messageTemplate": "Please generate comprehensive comments for this code in {fileName}:\\n\\n\`\`\`\\n{code}\\n\`\`\`\\n\\n"
        },
        {
            "id": "fix",
            "title": "🔧Fix",
            "tooltip": "Suggest improvements or fixes",
            "action": "fix", 
            "messageTemplate": "Please review and suggest improvements or fixes for this code in {fileName}:\\n\\n\`\`\`\\n{code}\\n\`\`\`\\n\\n"
        },
        {
            "id": "edit",
            "title": "⚙️Edit Commands",
            "tooltip": "Edit CodeLens commands configuration",
            "action": "edit",
            "messageTemplate": ""
        }
    ]
}`;