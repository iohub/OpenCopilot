import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import { TelemetryService } from '@sourcegraph/cody-shared/src/telemetry'

import { APP_CALLBACK_URL, APP_LANDING_URL, archConvertor } from '../src/chat/protocol'

import { VSCodeWrapper } from './utils/VSCodeApi'

import styles from './ConnectApp.module.css'

interface ConnectAppProps {
    vscodeAPI: VSCodeWrapper
    telemetryService: TelemetryService
    isAppInstalled: boolean
    isOSSupported: boolean
    appOS?: string
    appArch?: string
    callbackScheme?: string
    isAppRunning: boolean
}

export const ConnectApp: React.FunctionComponent<ConnectAppProps> = ({
    vscodeAPI,
    telemetryService,
    isAppInstalled,
    isAppRunning = false,
    isOSSupported,
    appOS = '',
    appArch = '',
    callbackScheme,
}) => {
    const inDownloadMode = !isAppInstalled && isOSSupported && !isAppRunning
    const buttonText = inDownloadMode ? 'Download Cody App' : isAppRunning ? 'Connect Cody App' : 'Open Cody App'
    const buttonIcon = inDownloadMode ? 'cloud-download' : isAppRunning ? 'link' : 'rocket'
    // Open landing page if download link for user's arch cannot be found
    const DOWNLOAD_URL =
        isOSSupported && appOS && appArch
            ? `https://sourcegraph.com/.api/app/latest?arch=${archConvertor(appArch)}&target=${appOS}`
            : APP_LANDING_URL.href
    // If the user already has the app installed, open the callback URL directly.
    const callbackUri = new URL(APP_CALLBACK_URL.href)
    callbackUri.searchParams.append('requestFrom', callbackScheme === 'vscode-insiders' ? 'CODY_INSIDERS' : 'CODY')

    // Use postMessage to open because it won't open otherwise due to the sourcegraph:// scheme.
    const authApp = (url: string): void => {
        vscodeAPI.postMessage({
            command: 'auth',
            type: 'app',
            endpoint: url,
            value: inDownloadMode ? 'download' : 'connect',
        })
    }

    return (
        <div className={styles.buttonContainer}>
            <VSCodeButton
                type="button"
                disabled={!isOSSupported}
                onClick={() => {
                    telemetryService.log('CodyVSCodeExtension:auth:clickConnectApp', {
                        isAppInstalled,
                        isAppRunning,
                        isOSSupported,
                        buttonText,
                    })
                    authApp(isAppInstalled ? callbackUri.href : DOWNLOAD_URL)
                }}
            >
                <i className={'codicon codicon-' + buttonIcon} slot="start" />
                {buttonText}
            </VSCodeButton>
        </div>
    )
}
