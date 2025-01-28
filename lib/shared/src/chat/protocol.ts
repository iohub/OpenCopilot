import { ContextFile } from '@sourcegraph/cody-shared/src/codebase-context/messages'
import { ActiveTextEditorSelectionRange } from '@sourcegraph/cody-shared/src/editor'
import { ChatContextStatus } from '@sourcegraph/cody-shared/src/chat/context'
import { CodyPrompt, CustomCommandType } from '@sourcegraph/cody-shared/src/chat/prompts'
import { RecipeID } from '@sourcegraph/cody-shared/src/chat/recipes/recipe'
import { ChatMessage, UserLocalHistory } from '@sourcegraph/cody-shared/src/chat/transcript/messages'
import { EnhancedContextContextT } from '@sourcegraph/cody-shared/src/codebase-context/context-status'
import { ContextFileType } from '@sourcegraph/cody-shared/src/codebase-context/messages'
import { Configuration } from '@sourcegraph/cody-shared/src/configuration'
import { SearchPanelFile } from '@sourcegraph/cody-shared/src/local-context'
import { isDotCom } from '@sourcegraph/cody-shared/src/sourcegraph-api/environments'
import { CodyLLMSiteConfiguration } from '@sourcegraph/cody-shared/src/sourcegraph-api/graphql/client'
import type { TelemetryEventProperties } from '@sourcegraph/cody-shared/src/telemetry'
import { ChatModelSelection, ChatSubmitType } from '@sourcegraph/cody-ui/src/Chat'
import { CodeBlockMeta } from '@sourcegraph/cody-ui/src/chat/CodeBlocks'

import { View } from '../../webviews/NavBar'

/**
 * A message sent from the webview to the extension host.
 */
export type WebviewMessage =
    | { command: 'ready' }
    | { command: 'initialized' }
    | {
          command: 'event'
          eventName: string
          properties: TelemetryEventProperties | undefined
      } // new event log internal API (use createWebviewTelemetryService wrapper)
    | {
          command: 'submit'
          text: string
          submitType: ChatSubmitType
          addEnhancedContext?: boolean
          contextFiles?: ContextFile[]
      }
    | { command: 'executeRecipe'; recipe: RecipeID }
    | { command: 'history'; action: 'clear' | 'export' }
    | { command: 'restoreHistory'; chatID: string }
    | { command: 'deleteHistory'; chatID: string }
    | { command: 'links'; value: string }
    | { command: 'chatModel'; model: string }
    | {
          command: 'openFile'
          filePath: string
          range?: ActiveTextEditorSelectionRange
      }
    | {
          command: 'openLocalFileWithRange'
          filePath: string
          // Note: we're not using vscode.Range objects or nesting here, as the protocol
          // tends ot munge the type in a weird way (nested fields become array indices).
          range?: { startLine: number; startCharacter: number; endLine: number; endCharacter: number }
      }
    | { command: 'edit'; text: string }
    | { command: 'embeddings/index' }
    | { command: 'insert'; text: string; metadata?: CodeBlockMeta }
    | { command: 'newFile'; text: string; metadata?: CodeBlockMeta }
    | { command: 'copy'; eventType: 'Button' | 'Keydown'; text: string; metadata?: CodeBlockMeta }
    | {
          command: 'auth'
          type:
              | 'signin'
              | 'signout'
              | 'support'
              | 'app'
              | 'callback'
              | 'simplified-onboarding'
              | 'simplified-onboarding-exposure'
          endpoint?: string
          value?: string
          authMethod?: AuthMethod
      }
    | { command: 'abort' }
    | { command: 'custom-prompt'; title: string; value?: CustomCommandType }
    | { command: 'reload' }
    | {
          command: 'simplified-onboarding'
          type: 'install-app' | 'open-app' | 'reload-state' | 'web-sign-in-token'
      }
    | { command: 'getUserContext'; query: string }
    | { command: 'search'; query: string }
    | {
          command: 'show-search-result'
          uriJSON: unknown
          range: { start: { line: number; character: number }; end: { line: number; character: number } }
      }

/**
 * A message sent from the extension host to the webview.
 */
export type ExtensionMessage =
    | { type: 'config'; config: ConfigurationSubsetForWebview & LocalEnv; authStatus: AuthStatus }
    | { type: 'login'; authStatus: AuthStatus }
    | { type: 'history'; messages: UserLocalHistory | null }
    | { type: 'transcript'; messages: ChatMessage[]; isMessageInProgress: boolean; chatID: string }
    // TODO(dpc): Remove classic context status when enhanced context status encapsulates the same information.
    | { type: 'contextStatus'; contextStatus: ChatContextStatus }
    | { type: 'view'; messages: View }
    | { type: 'errors'; errors: string }
    | { type: 'suggestions'; suggestions: string[] }
    // TODO(dpc): Remove app install status when the app install toasts are... toast.
    | { type: 'app-state'; isInstalled: boolean }
    | { type: 'notice'; notice: { key: string } }
    | { type: 'custom-prompts'; prompts: [string, CodyPrompt][] }
    | { type: 'transcript-errors'; isTranscriptError: boolean }
    | { type: 'userContextFiles'; context: ContextFile[] | null; kind?: ContextFileType }
    | { type: 'chatModels'; models: ChatModelSelection[] }
    | { type: 'update-search-results'; results: SearchPanelFile[]; query: string }
    | { type: 'index-updated'; scopeDir: string }
    | { type: 'enhanced-context'; context: EnhancedContextContextT }

/**
 * The subset of configuration that is visible to the webview.
 */
export interface ConfigurationSubsetForWebview
    extends Pick<Configuration, 'debugEnable' | 'serverEndpoint' | 'experimentalChatPanel'> {}

/**
 * URLs for the Sourcegraph instance and app.
 */
export const DOTCOM_CALLBACK_URL = new URL('https://sourcegraph.com/user/settings/tokens/new/callback')
export const CODY_DOC_URL = new URL('https://docs.sourcegraph.com/cody')

// Community and support
export const DISCORD_URL = new URL('https://discord.gg/s2qDtYGnAE')
export const CODY_FEEDBACK_URL = new URL(
    'https://github.com/sourcegraph/cody/discussions/new?category=product-feedback&labels=vscode'
)
// APP
export const APP_LANDING_URL = new URL('https://about.sourcegraph.com/app')
export const APP_CALLBACK_URL = new URL('sourcegraph://user/settings/tokens/new/callback')
export const APP_REPOSITORIES_URL = new URL('sourcegraph://users/admin/app-settings/local-repositories')
// Account
export const ACCOUNT_UPGRADE_URL = new URL('https://sourcegraph.com/cody/subscription')
export const ACCOUNT_USAGE_URL = new URL('https://sourcegraph.com/cody/manage')

/**
 * The status of a users authentication, whether they're authenticated and have a
 * verified email.
 */
export interface AuthStatus {
    username?: string
    endpoint: string | null
    isLoggedIn: boolean
    showInvalidAccessTokenError: boolean
    authenticated: boolean
    hasVerifiedEmail: boolean
    requiresVerifiedEmail: boolean
    siteHasCodyEnabled: boolean
    siteVersion: string
    configOverwrites?: CodyLLMSiteConfiguration
    showNetworkError?: boolean
    /**
     * Whether the users account can be upgraded.
     *
     * This is `true` if the user is on dotCom and has
     * not already upgraded. It is used to customise
     * rate limit messages and show additional upgrade
     * buttons in the UI.
     */
    userCanUpgrade: boolean
}

export const defaultAuthStatus = {
    endpoint: '',
    isLoggedIn: false,
    showInvalidAccessTokenError: false,
    authenticated: false,
    hasVerifiedEmail: false,
    requiresVerifiedEmail: false,
    siteHasCodyEnabled: false,
    siteVersion: '',
    userCanUpgrade: false,
}

export const unauthenticatedStatus = {
    endpoint: '',
    isLoggedIn: false,
    showInvalidAccessTokenError: true,
    authenticated: false,
    hasVerifiedEmail: false,
    requiresVerifiedEmail: false,
    siteHasCodyEnabled: false,
    siteVersion: '',
    userCanUpgrade: false,
}

export const authenticatedStatus = {
    endpoint: '',
    isLoggedIn: true,
    showInvalidAccessTokenError: false,
    authenticated: true,
    hasVerifiedEmail: true,
    requiresVerifiedEmail: false,
    siteHasCodyEnabled: true,
    siteVersion: '',
    userCanUpgrade: false,
}

export const networkErrorAuthStatus = {
    showInvalidAccessTokenError: false,
    authenticated: false,
    isLoggedIn: false,
    hasVerifiedEmail: false,
    showNetworkError: true,
    requiresVerifiedEmail: false,
    siteHasCodyEnabled: false,
    siteVersion: '',
    userCanUpgrade: false,
}

/** The local environment of the editor. */
export interface LocalEnv {
    // The operating system kind
    os: string
    arch: string
    homeDir?: string | undefined

    // The URL scheme the editor is registered to in the operating system
    uriScheme: string
    // The application name of the editor
    appName: string
    extensionVersion: string

    /** Whether the extension is running in VS Code Web (as opposed to VS Code Desktop). */
    uiKindIsWeb: boolean

    // App Local State
    hasAppJson: boolean
    isAppInstalled: boolean
    isAppRunning: boolean
}

export function isLoggedIn(authStatus: AuthStatus): boolean {
    return true
}

// The OS and Arch support for Cody app
export function isOsSupportedByApp(os?: string, arch?: string): boolean {
    if (!os || !arch) {
        return false
    }
    return os === 'darwin' || os === 'linux'
}

// Map the Arch to the app's supported Arch
export function archConvertor(arch: string): string {
    switch (arch) {
        case 'arm64':
            return 'aarch64'
        case 'x64':
            return 'x86_64'
    }
    return arch
}

export type AuthMethod = 'dotcom' | 'github' | 'gitlab' | 'google'

// NOTE: Only dotcom is supported currently
export function getChatModelsForWebview(endpoint?: string | null): ChatModelSelection[] {
    if (endpoint && isDotCom(endpoint)) {
        return defaultChatModels
    }
    return []
}

// The allowed chat models for dotcom
// The models must first be added to the custom chat models list in https://sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/internal/completions/httpapi/chat.go?L48-51
const defaultChatModels = [
    { title: 'Claude 2.0', model: 'anthropic/claude-2.0', provider: 'Anthropic', default: true },
    { title: 'Claude 2.1 Preview', model: 'anthropic/claude-2.1', provider: 'Anthropic', default: false },
    { title: 'Claude Instant', model: 'anthropic/claude-instant-1.2', provider: 'Anthropic', default: false },
    { title: 'ChatGPT 3.5 Turbo', model: 'openai/gpt-3.5-turbo', provider: 'OpenAI', default: false },
    { title: 'ChatGPT 4 Turbo Preview', model: 'openai/gpt-4-1106-preview', provider: 'OpenAI', default: false },
]
