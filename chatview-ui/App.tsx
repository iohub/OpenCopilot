import { useCallback, useEffect, useMemo, useState } from 'react'

import './App.css'

import { ContextFile } from '@sourcegraph/cody-shared/src/codebase-context/messages'
import { ChatContextStatus } from '@sourcegraph/cody-shared/src/chat/context'
import { CodyPrompt } from '@sourcegraph/cody-shared/src/chat/prompts'
import { ChatHistory, ChatMessage } from '@sourcegraph/cody-shared/src/chat/transcript/messages'
import { EnhancedContextContextT } from '@sourcegraph/cody-shared/src/codebase-context/context-status'
import { Configuration } from '@sourcegraph/cody-shared/src/configuration'
import { ExtensionState } from '@sourcegraph/cody-shared/src/common/state'
import { ChatModelSelection } from '@sourcegraph/cody-ui/src/Chat'

import { AuthMethod, AuthStatus, LocalEnv, authenticatedStatus } from '@sourcegraph/cody-shared/src/chat/protocol'

import { Chat } from './Chat'
import {
    EnhancedContextContext,
    EnhancedContextEnabled,
    EnhancedContextEventHandlers,
} from './Components/EnhancedContextSettings'
import { LoadingPage } from './LoadingPage'
import { View } from './NavBar'
import { Notices } from './Notices'
import { LoginSimplified } from './OnboardingExperiment'
import { UserHistory } from './UserHistory'
import { createWebviewTelemetryService } from './utils/telemetry'
import type { VSCodeWrapper } from './utils/VSCodeApi'
import { ModelSettings } from './ModelSettings'
import { PromptEditor } from './Components/PromptEditor'

export const App: React.FunctionComponent<{ vscodeAPI: VSCodeWrapper }> = ({ vscodeAPI }) => {

    const [config, setConfig] = useState<
        Pick<Configuration, 'debugEnable' | 'serverEndpoint' | 'experimentalChatPanel'> & LocalEnv> ({
        debugEnable: true,
        serverEndpoint: '',
        experimentalChatPanel: false,

        // OS and architecture info
        os: 'darwin',
        arch: 'x64',
        homeDir: '/tmp/',

        // Editor registration and app info
        uriScheme: 'vscode',
        appName: 'VS Code',
        extensionVersion: '1.0.0',

        // UI environment flag
        uiKindIsWeb: false,

        // App state flags
        hasAppJson: true,
        isAppInstalled: true, 
        isAppRunning: true
    })
    
    const [endpoint, setEndpoint] = useState<string | null>(null)
    const [view, setView] = useState<View | undefined>('chat')
    const [messageInProgress, setMessageInProgress] = useState<ChatMessage | null>(null)
    const [messageBeingEdited, setMessageBeingEdited] = useState<boolean>(false)
    const [transcript, setTranscript] = useState<ChatMessage[]>([])
    const [authStatus, setAuthStatus] = useState<AuthStatus | null>(authenticatedStatus)
    const [formInput, setFormInput] = useState('')
    const [inputHistory, setInputHistory] = useState<string[] | []>([])
    const [userHistory, setUserHistory] = useState<ChatHistory | null>(null)

    const [contextStatus, setContextStatus] = useState<ChatContextStatus | null>(null)
    const [contextSelection, setContextSelection] = useState<ContextFile[] | null>(null)
    const [clineState, setClineState] = useState<ExtensionState | undefined>(undefined)
    const [errorMessages, setErrorMessages] = useState<string[]>([])
    const [suggestions, setSuggestions] = useState<string[] | undefined>()
    const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false)
    const [myPrompts, setMyPrompts] = useState<
        [string, CodyPrompt & { isLastInGroup?: boolean; instruction?: string }][] | null
    >(null)
    const [isTranscriptError, setIsTranscriptError] = useState<boolean>(false)

    const [chatModels, setChatModels] = useState<ChatModelSelection[]>()

    const [enhancedContextEnabled, setEnhancedContextEnabled] = useState<boolean>(true)
    const [enhancedContextStatus, setEnhancedContextStatus] = useState<EnhancedContextContextT>({
        groups: [],
    })
    const [showPromptEditor, setShowPromptEditor] = useState(false)
    const [showModelSettings, setShowModelSettings] = useState(false)

    const onConsentToEmbeddings = useCallback((): void => {
        vscodeAPI.postMessage({ command: 'embeddings/index' })
    }, [vscodeAPI])

    useEffect(
        () =>
            vscodeAPI.onMessage(message => {
                switch (message.type) {
                    case 'transcript': {
                        if (message.isMessageInProgress) {
                            setMessageInProgress(message.messages[0])
                            setIsTranscriptError(false)
                        } else {
                            setTranscript(prev => { return [...prev, message.messages[0]] })
                            setMessageInProgress(null)
                        }
                        vscodeAPI.setState(message.chatID)
                        break
                    }
                    case 'transcripts': {
                        for (const msg of message.messages) {
                            setTranscript(prev => { return [...prev, msg] })
                        }
                        setMessageInProgress(null)
                        vscodeAPI.setState(message.chatID)
                        break
                    }
                    case 'state': {
                        setClineState(message.state)
                        break
                    }
                    case 'config':
                        setConfig(message.config)
                        setIsAppInstalled(message.config.isAppInstalled)
                        setEndpoint(message.authStatus.endpoint)
                        setAuthStatus(message.authStatus)
                        setView(message.authStatus.isLoggedIn ? 'chat' : 'login')
                        break
                    case 'history':
                        setInputHistory(message.messages?.input ?? [])
                        setUserHistory(message.messages?.chat ?? null)
                        break
                    case 'contextStatus':
                        setContextStatus(message.contextStatus)
                        break
                    case 'enhanced-context':
                        setEnhancedContextStatus(message.context)
                        break
                    case 'userContextFiles':
                        setContextSelection(message.context)
                        break
                    case 'errors':
                        setErrorMessages([...errorMessages, message.errors].slice(-5))
                        break
                    case 'view':
                        setView(message.messages)
                        break
                    case 'suggestions':
                        setSuggestions(message.suggestions)
                        break
                    case 'app-state':
                        setIsAppInstalled(message.isInstalled)
                        break
                    case 'custom-prompts': {
                        let prompts: [string, CodyPrompt & { isLastInGroup?: boolean; instruction?: string }][] =
                            message.prompts

                        if (!prompts) {
                            setMyPrompts(null)
                            break
                        }

                        prompts = prompts.reduce(groupPrompts, []).map(addInstructions)

                        // mark last prompts as last in group before adding another group
                        const lastPrompt = prompts.at(-1)
                        if (lastPrompt) {
                            const [_, command] = lastPrompt
                            command.isLastInGroup = true
                        }

                        setMyPrompts([
                            ...prompts,
                            // add another group
                            ['reset', { prompt: '', slashCommand: '/reset', description: 'Clear the chat' }],
                        ])
                        break
                    }
                    case 'transcript-errors':
                        setIsTranscriptError(message.isTranscriptError)
                        break
                    case 'chatModels':
                        setChatModels(message.models)
                        break
                    case 'action': {
                        if (message.action === 'settingsButtonClicked') {
                            setView('settings')
                        }
                        if (message.action === 'clear-transcripts') {
                            setTranscript([])
                            setMessageInProgress(null)
                        }
                        break
                    }
                }
            }),
        [errorMessages, view, vscodeAPI]
    )

    useEffect(() => {
        // Notify the extension host that we are ready to receive events
        vscodeAPI.postMessage({ command: 'ready' })
    }, [vscodeAPI])

    useEffect(() => {
        if (!view) {
            vscodeAPI.postMessage({ command: 'initialized' })
        }
    }, [view, vscodeAPI])

    useEffect(() => {
        if (formInput.endsWith(' ')) {
            setContextSelection(null)
        }

        // TODO(toolmantim): Allow using @ mid-message by using cursor position not endsWith

        // Regex to check if input ends with the '@' tag format, always get the last @tag
        // pass: 'foo @bar.ts', '@bar.ts', '@foo.ts @bar', '@'
        // fail: 'foo ', '@foo.ts bar', '@ foo.ts', '@foo.ts '
        const addFileRegex = /@\S+$/
        // Get the string after the last '@' symbol
        const addFileInput = formInput.match(addFileRegex)?.[0]
        if (formInput.endsWith('@') || addFileInput) {
            vscodeAPI.postMessage({ command: 'getUserContext', query: addFileInput?.slice(1) || '' })
        } else {
            setContextSelection(null)
        }
    }, [formInput, vscodeAPI])

    const loginRedirect = useCallback(
        (method: AuthMethod) => {
            // We do not change the view here. We want to keep presenting the
            // login buttons until we get a token so users don't get stuck if
            // they close the browser during an auth flow.
            vscodeAPI.postMessage({ command: 'auth', type: 'simplified-onboarding', authMethod: method })
        },
        [vscodeAPI]
    )

    // Callbacks used for app setup after onboarding
    const onboardingPopupProps = {
        installApp: () => {
            vscodeAPI.postMessage({ command: 'simplified-onboarding', type: 'install-app' })
        },
        openApp: () => {
            vscodeAPI.postMessage({ command: 'simplified-onboarding', type: 'open-app' })
        },
        reloadStatus: () => {
            vscodeAPI.postMessage({ command: 'simplified-onboarding', type: 'reload-state' })
        },
    }

    const telemetryService = useMemo(() => createWebviewTelemetryService(vscodeAPI), [vscodeAPI])

    if (!view || !authStatus || !config) {
        return <LoadingPage />
    }

    return (
        <div className="outer-container">
            {view === 'login' || !authStatus.isLoggedIn ? (
                <LoginSimplified
                    simplifiedLoginRedirect={loginRedirect}
                    telemetryService={telemetryService}
                    uiKindIsWeb={config?.uiKindIsWeb}
                    vscodeAPI={vscodeAPI}
                />
            ) : (
                <>
                    {errorMessages && <ErrorBanner errors={errorMessages} setErrors={setErrorMessages} />}
                    {view === 'history' && (
                        <UserHistory
                            userHistory={userHistory}
                            setUserHistory={setUserHistory}
                            setInputHistory={setInputHistory}
                            setView={setView}
                            vscodeAPI={vscodeAPI}
                        />
                    )}
                    {view === 'settings' && (
                        <ModelSettings 
                            onClose={() => setView('chat')}
                            clineState={clineState}
                        />
                    )}
                    {view === 'chat' && (
                        <EnhancedContextEventHandlers.Provider
                            value={{
                                onConsentToEmbeddings,
                                onEnabledChange: (enabled): void => {
                                    if (enabled !== enhancedContextEnabled) {
                                        setEnhancedContextEnabled(enabled)
                                    }
                                },
                            }}
                        >
                            <EnhancedContextContext.Provider value={enhancedContextStatus}>
                                <EnhancedContextEnabled.Provider value={enhancedContextEnabled}>
                                    <Chat
                                        messageInProgress={messageInProgress}
                                        messageBeingEdited={messageBeingEdited}
                                        setMessageBeingEdited={setMessageBeingEdited}
                                        transcript={transcript}
                                        contextStatus={contextStatus}
                                        contextSelection={contextSelection}
                                        formInput={formInput}
                                        setFormInput={setFormInput}
                                        inputHistory={inputHistory}
                                        setInputHistory={setInputHistory}
                                        vscodeAPI={vscodeAPI}
                                        suggestions={suggestions}
                                        setSuggestions={setSuggestions}
                                        telemetryService={telemetryService}
                                        chatCommands={myPrompts || undefined}
                                        isTranscriptError={isTranscriptError}
                                        applessOnboarding={{
                                            endpoint,
                                            embeddingsEndpoint: contextStatus?.embeddingsEndpoint,
                                            props: {
                                                isAppInstalled,
                                                onboardingPopupProps,
                                            },
                                        }}
                                        chatModels={chatModels}
                                        enableNewChatUI={config.experimentalChatPanel || false}
                                        clineState={clineState}
                                        setChatModels={setChatModels}
                                        setShowPromptEditor={setShowPromptEditor}
                                        setShowModelSettings={setShowModelSettings}
                                    />
                                </EnhancedContextEnabled.Provider>
                            </EnhancedContextContext.Provider>
                        </EnhancedContextEventHandlers.Provider>
                    )}
                    {showPromptEditor && (
                        <PromptEditor 
                            onClose={() => setShowPromptEditor(false)}
                            clineState={clineState}
                        />
                    )}
                    {showModelSettings && (
                        <ModelSettings 
                            onClose={() => setShowModelSettings(false)}
                            clineState={clineState}
                        />
                    )}
                </>
            )}
        </div>
    )
}

const ErrorBanner: React.FunctionComponent<{ errors: string[]; setErrors: (errors: string[]) => void }> = ({
    errors,
    setErrors,
}) => (
    <div className="error-container">
        {errors.map((error, i) => (
            <div key={i} className="error">
                <span>{error}</span>
                <button type="button" className="close-btn" onClick={() => setErrors(errors.filter(e => e !== error))}>
                    ×
                </button>
            </div>
        ))}
    </div>
)

/**
 * Adds `isLastInGroup` field to a prompt if represents last item in a group (e.g., default/custom/etc. prompts).
 */
function groupPrompts(
    acc: [string, CodyPrompt & { isLastInGroup?: boolean }][],
    [key, command]: [string, CodyPrompt],
    index: number,
    array: [string, CodyPrompt][]
): [string, CodyPrompt & { isLastInGroup?: boolean }][] {
    if (key === 'separator') {
        return acc
    }

    const nextItem = array[index + 1]
    if (nextItem?.[0] === 'separator') {
        acc.push([key, { ...command, isLastInGroup: true }])
        return acc
    }

    acc.push([key, command])
    return acc
}

const instructionLabels: Record<string, string> = {
    '/ask': '[question]',
    '/edit': '[instruction]',
}

/**
 * Adds `instruction` field to a prompt if it requires additional instruction.
 */
function addInstructions<T extends CodyPrompt>([key, command]: [string, T]): [string, T & { instruction?: string }] {
    const instruction = instructionLabels[command.slashCommand]
    return [key, { ...command, instruction }]
}
