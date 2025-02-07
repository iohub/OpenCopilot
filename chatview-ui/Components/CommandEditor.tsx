import React, { useState, useEffect } from 'react'
import styles from './CommandEditor.module.css'
import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react'
import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'
import { Controlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/monokai.css'
import 'codemirror/mode/javascript/javascript'
import { CodeLensCommand } from '@sourcegraph/cody-shared/src/common/state'

interface CommandEditorProps {
    onClose: () => void
    commands?: CodeLensCommand[]
}

interface AddCommandDialogProps {
    isOpen: boolean
    onClose: () => void
    onSave: (command: CodeLensCommand) => void
}

function generateCommandId(): string {
    const randomStr = Math.random().toString(36).substring(2, 8)
    
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}-${hour}-${minute}-${randomStr}`
}

const AddCommandDialog: React.FC<AddCommandDialogProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('')
    const [tooltip, setTooltip] = useState('')
    const [action, setAction] = useState('')
    const [messageTemplate, setMessageTemplate] = useState('')

    if (!isOpen) return null

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <h3>Add New Command</h3>
                <div className={styles.dialogContent}>
                    <VSCodeTextField
                        value={title}
                        onChange={e => setTitle((e.target as HTMLInputElement).value)}
                        placeholder="Title (with emoji)"
                    />
                    <VSCodeTextField
                        value={tooltip}
                        onChange={e => setTooltip((e.target as HTMLInputElement).value)}
                        placeholder="Tooltip"
                    />
                    <textarea
                        value={messageTemplate}
                        onChange={e => setMessageTemplate(e.target.value)}
                        placeholder="Prompt Template"
                        className={styles.dialogTextarea}
                    />
                </div>
                <div className={styles.dialogFooter}>
                    <VSCodeButton onClick={onClose}>Cancel</VSCodeButton>
                    <VSCodeButton onClick={() => {
                        onSave({ 
                            id: generateCommandId(),
                            title, 
                            tooltip, 
                            action: 'explain',
                            messageTemplate 
                        })
                        setTitle('')
                        setTooltip('')
                        setAction('')
                        setMessageTemplate('')
                    }}>Save</VSCodeButton>
                </div>
            </div>
        </div>
    )
}

export const CommandEditor: React.FC<CommandEditorProps> = ({ onClose, commands = [] }) => {
    const [selectedCommandId, setSelectedCommandId] = useState<string>('')
    const [commandList, setCommandList] = useState<CodeLensCommand[]>(Array.isArray(commands) ? commands : [])
    const [messageTemplate, setMessageTemplate] = useState('')
    const [isAddCommandOpen, setIsAddCommandOpen] = useState(false)

    const cmOptions = {
        mode: 'javascript',
        theme: 'monokai',
        lineNumbers: false,
        lineWrapping: true,
        indentUnit: 2,
        tabSize: 2,
        autofocus: true
    }

    useEffect(() => {
        if (Array.isArray(commands) && commands.length > 0) {
            setCommandList(commands)
        }
    }, [commands])

    const handleCommandChange = (commandId: string) => {
        const selectedCommand = commandList.find(cmd => cmd.id === commandId)
        if (selectedCommand) {
            setSelectedCommandId(commandId)
            setMessageTemplate(selectedCommand.messageTemplate)
        }
    }

    const handleSave = () => {
        if (selectedCommandId) {
            const updatedCommands = commandList.map(cmd => {
                if (cmd.id === selectedCommandId) {
                    return { ...cmd, messageTemplate }
                }
                return cmd
            })

            setCommandList(updatedCommands)
            getVSCodeAPI().postMessage({
                type: 'SaveCommands',
                text: JSON.stringify({ commands: updatedCommands }, null, 2)
            })
        }
        onClose()
    }

    const handleAddCommand = (newCommand: CodeLensCommand) => {
        const updatedCommands = [...commandList, newCommand]
        setCommandList(updatedCommands)
        getVSCodeAPI().postMessage({
            type: 'SaveCommands',
            text: JSON.stringify({ commands: updatedCommands }, null, 2)
        })
        setIsAddCommandOpen(false)
    }

    const handleRemoveCommand = () => {
        if (!selectedCommandId) return

        const updatedCommands = commandList.filter(cmd => cmd.id !== selectedCommandId)
        setCommandList(updatedCommands)
        getVSCodeAPI().postMessage({
            type: 'SaveCommands',
            text: JSON.stringify({ commands: updatedCommands }, null, 2)
        })
        setSelectedCommandId('')
        setMessageTemplate('')
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Edit Commands</h2>
                    <VSCodeButton appearance="icon" onClick={onClose}>
                        <i className="codicon codicon-close" />
                    </VSCodeButton>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <label>Commands</label>
                            <VSCodeButton 
                                appearance="icon"
                                onClick={() => setIsAddCommandOpen(true)}
                                title="Add new command"
                            >
                                <i className="codicon codicon-add" />
                            </VSCodeButton>
                        </div>
                        <select 
                            value={selectedCommandId}
                            onChange={e => handleCommandChange(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">Select command</option>
                            {Array.isArray(commandList) && commandList.map(command => (
                                <option key={command.id} value={command.id}>
                                    {command.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.section}>
                        <label>Message Template</label>
                        <div className={styles.editorWrapper}>
                            <CodeMirror
                                value={messageTemplate}
                                options={cmOptions}
                                onBeforeChange={(editor, data, value) => {
                                    setMessageTemplate(value)
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <VSCodeButton
                        onClick={handleRemoveCommand}
                        disabled={!selectedCommandId}
                    >
                        Remove
                    </VSCodeButton>
                    <VSCodeButton onClick={handleSave}>Save</VSCodeButton>
                </div>

                <AddCommandDialog
                    isOpen={isAddCommandOpen}
                    onClose={() => setIsAddCommandOpen(false)}
                    onSave={handleAddCommand}
                />
            </div>
        </div>
    )
} 