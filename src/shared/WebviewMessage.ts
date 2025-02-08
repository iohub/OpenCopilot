import { ProviderConfig } from "@sourcegraph/cody-shared/src/common/state"
import { ApiConfiguration } from "./api"
import { AutoApprovalSettings } from "./AutoApprovalSettings"

export interface WebviewMessage {
	type:
		| "apiConfiguration"
		| "customInstructions"
		| "webviewDidLaunch"
		| "newTask"
		| "askResponse"
		| "clearTask"
		| "didShowAnnouncement"
		| "selectImages"
		| "exportCurrentTask"
		| "showTaskWithId"
		| "deleteTaskWithId"
		| "exportTaskWithId"
		| "resetState"
		| "requestOllamaModels"
		| "requestLmStudioModels"
		| "openImage"
		| "openFile"
		| "openMention"
		| "cancelTask"
		| "refreshOpenRouterModels"
		| "openMcpSettings"
		| "restartMcpServer"
		| "autoApprovalSettings"
		| "loadSystemPrompts"
		| "switchSystemPrompt"
		| "switchToProvider"
		| "loadModelProvider"
		| "switchWebview"
		| "updateProviderConfig"
		| "SaveSystemPrompts"
		| "SaveCommands"
	text?: string
	askResponse?: ClineAskResponse
	apiConfiguration?: ApiConfiguration
	images?: string[]
	bool?: boolean
	autoApprovalSettings?: AutoApprovalSettings
	providerConfig?: ProviderConfig
}

export type ClineAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse"
