import React, { useState, useEffect } from 'react'
import styles from './PromptEditor.module.css'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'

interface PromptEditorProps {
    onClose: () => void
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ onClose }) => {
    const [selectedPlatform, setSelectedPlatform] = useState<string>('')
    const [events, setEvents] = useState<string>('*')
    const [searchEntity, setSearchEntity] = useState<string>('')
    const [entities, setEntities] = useState<string[]>([])
    const [conditions, setConditions] = useState<string>('')
    const [template, setTemplate] = useState<string>('')
    const [services, setServices] = useState<string[]>([])

    useEffect(() => {
        // 加载初始数据
        getVSCodeAPI().postMessage({
            type: 'loadPromptConfig'
        })
    }, [])

    const handleSave = () => {
        // 保存配置
        getVSCodeAPI().postMessage({
            type: 'savePromptConfig',
            config: {
                platform: selectedPlatform,
                events,
                searchEntity,
                entities,
                conditions,
                template,
                services
            }
        })
        onClose()
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Edit System Prompt</h2>
                    <VSCodeButton appearance="icon" onClick={onClose}>
                        <i className="codicon codicon-close" />
                    </VSCodeButton>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <label>Trigger platforms</label>
                        <select 
                            value={selectedPlatform}
                            onChange={e => setSelectedPlatform(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">Select trigger platform</option>
                            <option value="platform1">Platform 1</option>
                            <option value="platform2">Platform 2</option>
                        </select>
                    </div>

                    <div className={styles.section}>
                        <label>Events</label>
                        <input
                            type="text"
                            value={events}
                            onChange={e => setEvents(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.section}>
                        <label>Search entity</label>
                        <input
                            type="text"
                            value={searchEntity}
                            onChange={e => setSearchEntity(e.target.value)}
                            placeholder="sensor.example"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.section}>
                        <label>Entities</label>
                        <div className={styles.entityList}>
                            {entities.map((entity, index) => (
                                <div key={index} className={styles.entityItem}>
                                    <span>{entity}</span>
                                    <VSCodeButton
                                        appearance="icon"
                                        onClick={() => setEntities(entities.filter((_, i) => i !== index))}
                                    >
                                        <i className="codicon codicon-close" />
                                    </VSCodeButton>
                                </div>
                            ))}
                            <VSCodeButton onClick={() => setEntities([...entities, ''])}>
                                Add Entity
                            </VSCodeButton>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <label>Conditions</label>
                        <textarea
                            value={conditions}
                            onChange={e => setConditions(e.target.value)}
                            className={styles.textarea}
                            rows={4}
                        />
                    </div>

                    <div className={styles.section}>
                        <label>Template</label>
                        <textarea
                            value={template}
                            onChange={e => setTemplate(e.target.value)}
                            className={styles.textarea}
                            rows={4}
                        />
                    </div>

                    <div className={styles.section}>
                        <label>Services</label>
                        <div className={styles.serviceList}>
                            {services.map((service, index) => (
                                <div key={index} className={styles.serviceItem}>
                                    <input
                                        type="text"
                                        value={service}
                                        onChange={e => {
                                            const newServices = [...services]
                                            newServices[index] = e.target.value
                                            setServices(newServices)
                                        }}
                                        className={styles.input}
                                    />
                                    <VSCodeButton
                                        appearance="icon"
                                        onClick={() => setServices(services.filter((_, i) => i !== index))}
                                    >
                                        <i className="codicon codicon-close" />
                                    </VSCodeButton>
                                </div>
                            ))}
                            <VSCodeButton onClick={() => setServices([...services, ''])}>
                                Add Service
                            </VSCodeButton>
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    <VSCodeButton onClick={onClose}>Cancel</VSCodeButton>
                    <VSCodeButton onClick={handleSave}>Save</VSCodeButton>
                </div>
            </div>
        </div>
    )
} 