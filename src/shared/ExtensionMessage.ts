// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import { CodeLensCommand } from "@sourcegraph/cody-shared/src/common/state"
import { ModelProvider } from "./AlineConfig"
import { ApiConfiguration, ModelInfo } from "./api"
import { AutoApprovalSettings } from "./AutoApprovalSettings"
import { HistoryItem } from "./HistoryItem"
import { McpServer } from "./mcp"
import { SystemPrompt } from "./SystemPrompt"
import { ChatMessage } from '@sourcegraph/cody-shared/src/chat/transcript/messages'

// webview will hold state
export interface ExtensionMessage {
	type:
		| "action"
		| "state"
		| "selectedImages"
		| "ollamaModels"
		| "lmStudioModels"
		| "theme"
		| "workspaceUpdated"
		| "invoke"
		| "partialMessage"
		| "openRouterModels"
		| "mcpServers"
		| "transcript"
		| "view"
	text?: string
	action?:
		| "chatButtonClicked"
		| "mcpButtonClicked"
		| "settingsButtonClicked"
		| "historyButtonClicked"
		| "didBecomeVisible"
		| "clear-transcripts"
		| "show-command-editor"
		| "selection-text"
		| "cancel-selection"
	invoke?: "sendMessage" | "primaryButtonClick" | "secondaryButtonClick"
	state?: ExtensionState
	images?: string[]
	ollamaModels?: string[]
	lmStudioModels?: string[]
	filePaths?: string[]
	partialMessage?: ClineMessage
	openRouterModels?: Record<string, ModelInfo>
	mcpServers?: McpServer[]
	transcript?: ChatMessage[]
	selectedFile?: {
		filename: string
		start: {
			line: number
			character: number
		}
		end: {
			line: number
			character: number
		}
	}
}

export interface ExtensionState {
	version: string
	apiConfiguration?: ApiConfiguration
	customInstructions?: string
	uriScheme?: string
	clineMessages: ClineMessage[]
	taskHistory: HistoryItem[]
	systemPrompts: SystemPrompt[]
	systemPrompt: SystemPrompt
	shouldShowAnnouncement: boolean
	autoApprovalSettings: AutoApprovalSettings
	modelOptions: ModelProvider[]
	codeLensCommands: CodeLensCommand[]
}

export interface ClineMessage {
	ts: number
	type: "ask" | "say"
	ask?: ClineAsk
	say?: ClineSay
	text?: string
	images?: string[]
	partial?: boolean
}

export type ClineAsk =
	| "followup"
	| "command"
	| "command_output"
	| "completion_result"
	| "tool"
	| "api_req_failed"
	| "resume_task"
	| "resume_completed_task"
	| "mistake_limit_reached"
	| "auto_approval_max_req_reached"
	| "browser_action_launch"
	| "use_mcp_server"

export type ClineSay =
	| "task"
	| "error"
	| "api_req_started"
	| "api_req_finished"
	| "text"
	| "completion_result"
	| "user_feedback"
	| "user_feedback_diff"
	| "api_req_retried"
	| "command"
	| "command_output"
	| "tool"
	| "shell_integration_warning"
	| "browser_action_launch"
	| "browser_action"
	| "browser_action_result"
	| "mcp_server_request_started"
	| "mcp_server_response"
	| "use_mcp_server"
	| "diff_error"

export interface ClineSayTool {
	tool:
		| "editedExistingFile"
		| "newFileCreated"
		| "readFile"
		| "listFilesTopLevel"
		| "listFilesRecursive"
		| "listCodeDefinitionNames"
		| "searchFiles"
	path?: string
	diff?: string
	content?: string
	regex?: string
	filePattern?: string
}

// must keep in sync with system prompt
export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const
export type BrowserAction = (typeof browserActions)[number]

export interface ClineSayBrowserAction {
	action: BrowserAction
	coordinate?: string
	text?: string
}

export type BrowserActionResult = {
	screenshot?: string
	logs?: string
	currentUrl?: string
	currentMousePosition?: string
}

export interface ClineAskUseMcpServer {
	serverName: string
	type: "use_mcp_tool" | "access_mcp_resource"
	toolName?: string
	arguments?: string
	uri?: string
}

export interface ClineApiReqInfo {
	request?: string
	tokensIn?: number
	tokensOut?: number
	cacheWrites?: number
	cacheReads?: number
	cost?: number
	cancelReason?: ClineApiReqCancelReason
	streamingFailedMessage?: string
}

export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled"

export function toChatMessage(msg: ClineMessage): ChatMessage {
	const speaker = msg.type === "ask" || msg.say === "api_req_started" ? "human" : "assistant"
	let displayText = msg.text || ""
	if (msg.say === "api_req_started") {
		displayText = JSON.parse(msg.text || "{}").request || ""
	}
	const chatMessage: ChatMessage = {
		speaker,
		displayText
	}
	return chatMessage
}