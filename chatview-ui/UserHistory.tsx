import { useCallback } from 'react'

import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import { ChatHistory } from '@sourcegraph/cody-shared/src/chat/transcript/messages'

import { View } from './NavBar'
import { VSCodeWrapper } from './utils/VSCodeApi'

import chatStyles from './Chat.module.css'
import styles from './UserHistory.module.css'

interface HistoryProps {
    userHistory: ChatHistory | null
    setUserHistory: (history: ChatHistory | null) => void
    setInputHistory: (inputHistory: string[] | []) => void
    setView: (view: View | undefined) => void
    vscodeAPI: VSCodeWrapper
}

export const UserHistory: React.FunctionComponent<React.PropsWithChildren<HistoryProps>> = ({
    userHistory,
    setUserHistory,
    setInputHistory,
    setView,
    vscodeAPI,
}) => {
    const onDeleteHistoryItemClick = useCallback(
        (event: React.MouseEvent<HTMLElement, MouseEvent>, chatID: string) => {
            event.stopPropagation()
            if (userHistory) {
                delete userHistory[chatID]
                setUserHistory({ ...userHistory })
                vscodeAPI.postMessage({ command: 'deleteHistory', chatID })
            }
        },
        [userHistory, setUserHistory, vscodeAPI]
    )

    const onAllHistoryClick = useCallback(
        (action: 'clear' | 'export') => {
            if (userHistory) {
                vscodeAPI.postMessage({ command: 'history', action })
                if (action === 'clear') {
                    setUserHistory(null)
                    setInputHistory([])
                }
            }
        },
        [setInputHistory, userHistory, setUserHistory, vscodeAPI]
    )

    function restoreMetadata(chatID: string): void {
        vscodeAPI.postMessage({ command: 'restoreHistory', chatID })
        setView('chat')
    }

    return (
        <div className={chatStyles.innerContainer}>
            <div className={chatStyles.nonTranscriptContainer}>
                <div className={styles.headingContainer}>
                    <h3>Chat History</h3>
                    <div className={styles.headingButtonContainer}>
                        <VSCodeButton
                            className={styles.headingButton}
                            type="button"
                            onClick={() => onAllHistoryClick('export')}
                            disabled={!userHistory || !Object.keys(userHistory).length}
                        >
                            Export
                        </VSCodeButton>
                        <VSCodeButton
                            className={styles.headingButton}
                            type="button"
                            onClick={() => onAllHistoryClick('clear')}
                            disabled={!userHistory || !Object.keys(userHistory).length}
                        >
                            Clear
                        </VSCodeButton>
                    </div>
                </div>
                <div className={styles.itemsContainer}>
                    {userHistory &&
                        [...Object.entries(userHistory)]
                            .sort(
                                (a, b) =>
                                    +new Date(b[1].lastInteractionTimestamp) - +new Date(a[1].lastInteractionTimestamp)
                            )
                            .filter(
                                ([, transcriptJSON]) =>
                                    transcriptJSON.interactions && transcriptJSON.interactions.length > 0
                            )
                            .map(([id, transcriptJSON]) => {
                                const lastMessage = transcriptJSON.interactions.at(-1)!.humanMessage
                                if (!lastMessage?.displayText) {
                                    return null
                                }

                                return (
                                    <VSCodeButton
                                        key={id}
                                        className={styles.itemButton}
                                        onClick={() => restoreMetadata(id)}
                                        type="button"
                                    >
                                        <div className={styles.itemButtonInnerContainer}>
                                            <div className={styles.itemDate}>{new Date(id).toLocaleString()}</div>
                                            <div className={styles.itemDelete}>
                                                <VSCodeButton
                                                    appearance="icon"
                                                    type="button"
                                                    onClick={event => {
                                                        onDeleteHistoryItemClick(event, id)
                                                    }}
                                                >
                                                    <i className="codicon codicon-trash" />
                                                </VSCodeButton>
                                            </div>
                                            <div className={styles.itemLastMessage}>{lastMessage.displayText}</div>
                                        </div>
                                    </VSCodeButton>
                                )
                            })}
                </div>
            </div>
        </div>
    )
}
