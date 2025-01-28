import * as vscode from 'vscode'
import { ConfigurationWithAccessToken } from '../../configuration'

import { CompletionCallbacks, CompletionParameters, CompletionResponse, Event } from './types'

export interface CompletionLogger {
    startCompletion(params: CompletionParameters | {}):
        | undefined
        | {
              onError: (error: string) => void
              onComplete: (response: string | CompletionResponse | string[] | CompletionResponse[]) => void
              onEvents: (events: Event[]) => void
          }
}

export type CompletionsClientConfig = Pick<
    ConfigurationWithAccessToken,
    'serverEndpoint' | 'accessToken' | 'debugEnable' | 'customHeaders'
>

/**
 * Access the chat based LLM APIs via a Sourcegraph server instance.
 */
export abstract class SourcegraphCompletionsClient {
    private errorEncountered = false

    constructor(
        protected config: CompletionsClientConfig,
        protected logger?: CompletionLogger
    ) {}

    public onConfigurationChange(newConfig: CompletionsClientConfig): void {
        this.config = newConfig
    }

    protected get completionsEndpoint(): string {
        let config = vscode.workspace.getConfiguration()
        const endpoint = config.get<string>('cody.llama.serverEndpoint')
        // stream chat completion URL
        return new URL('/completion', endpoint).href
    }

    protected sendEvents(events: Event[], cb: CompletionCallbacks): void {
        for (const event of events) {
            switch (event.type) {
                case 'completion':
                    cb.onChange(event.completion)
                    break
                case 'error':
                    this.errorEncountered = true
                    cb.onError(event.error)
                    break
                case 'done':
                    if (!this.errorEncountered) {
                        cb.onComplete()
                    }
                    // reset errorEncountered for next request
                    this.errorEncountered = false
                    break
            }
        }
    }

    public abstract stream(params: CompletionParameters, cb: CompletionCallbacks): () => void
}

/**
 * A helper function that calls the streaming API but will buffer the result
 * until the stream has completed.
 */
export function bufferStream(
    client: Pick<SourcegraphCompletionsClient, 'stream'>,
    params: CompletionParameters
): Promise<string> {
    return new Promise((resolve, reject) => {
        let buffer = ''
        const callbacks: CompletionCallbacks = {
            onChange(text: string) {
                buffer = text
            },
            onComplete() {
                resolve(buffer)
            },
            onError(message: string, code?: number) {
                reject(new Error(code ? `${message} (code ${code})` : message))
            },
        }
        client.stream(params, callbacks)
    })
}
