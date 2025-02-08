import * as React from 'react'
import { useState, useEffect } from 'react'
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react'
import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'
import styles from './ModelSettings.module.css'
import { SharedState, ProviderConfig } from '@sourcegraph/cody-shared/src/common/state'

interface ModelSettingsProps {
    onClose: () => void
    sharedState?: SharedState
}

interface Provider {
    id: string
    name: string
    visible: boolean
    order: number
    category?: string
}

function modelOptionsToProviders(extensionState?: SharedState): Provider[] {
    if (!extensionState?.modelOptions) { 
        return [] 
    }
    
    // 过滤可见的选项并按 order 排序
    return extensionState.modelOptions
        .filter(provider => provider.visible)
        .sort((a, b) => a.order - b.order)
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({ onClose, sharedState }) => {
    // 使用 modelOptionsToProviders 初始化 providers
    const [providers, setProviders] = useState<Provider[]>(() => 
        modelOptionsToProviders(sharedState)
    )

    const [modelConfig, setModelConfig] = useState<ProviderConfig>({
        provider: sharedState?.apiConfiguration?.apiProvider! ?? "deepseek",
        model: sharedState?.apiConfiguration?.providerConfig?.model ?? "deepseek-chat",
        apiKey: sharedState?.apiConfiguration?.providerConfig?.apiKey ?? "",
        baseUrl: sharedState?.apiConfiguration?.providerConfig?.baseUrl ?? ""
    })

    // 添加监听 sharedState 变化的 effect
    useEffect(() => {
        const newProviders = modelOptionsToProviders(sharedState)
        setProviders(newProviders)
        
        // 更新 modelConfig 以反映最新的 sharedState 配置
        if (sharedState?.apiConfiguration) {
            setModelConfig(prev => ({
                ...prev,
                // 保持当前 provider 如果它仍然有效，否则使用新的 provider
                provider: newProviders.find(p => p.id === prev.provider) 
                    ? prev.provider 
                    : (sharedState.apiConfiguration?.apiProvider ?? "deepseek"),
                // 更新其他配置项
                model: sharedState?.apiConfiguration?.providerConfig?.model ?? "",
                apiKey: sharedState?.apiConfiguration?.providerConfig?.apiKey ?? "",
                baseUrl: sharedState?.apiConfiguration?.providerConfig?.baseUrl ?? ""
            }))
        }
        
        // 如果当前选择的 provider 不在新的列表中，重置为第一个可用的 provider
        if (newProviders.length > 0 && !newProviders.find(p => p.id === modelConfig.provider)) {
            setModelConfig(prev => ({
                ...prev,
                provider: newProviders[0].id
            }))
        }
    }, [sharedState])

    // 添加加载 provider 的 effect
    useEffect(() => {
        // 发送加载请求
        getVSCodeAPI().postMessage({
            type: 'loadModelProvider'
        })
    }, [])

    const handleConnect = async () => {
        // 发送 updateProviderConfig 消息
        getVSCodeAPI().postMessage({
            type: 'updateProviderConfig',
            providerConfig: {
                provider: modelConfig.provider,
                model: modelConfig.model,
                apiKey: modelConfig.apiKey,
                baseUrl: modelConfig.baseUrl
            }
        })
        onClose()
    }

    const handleProviderChange = (event: any) => {
        const newProvider = event.target.value
        // 发送切换provider的消息
        getVSCodeAPI().postMessage({
            type: 'switchToProvider',
            text: newProvider
        })

        setModelConfig(prev => ({
            ...prev,
            provider: newProvider
        }))
    }

    const handleEditClick = (event: React.MouseEvent) => {
        event.preventDefault()
        getVSCodeAPI().postMessage({
            type: 'openFile',
            text: '{ModelProviderFile}'
        })
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Model Settings</h2>
                    <VSCodeButton appearance="icon" onClick={onClose}>
                        <i className="codicon codicon-close" />
                    </VSCodeButton>
                </div>

                <div className={styles.form}>
                    <div className={styles.formGroup}>
                        <div className={styles.labelWrapper}>
                            <span className={styles.labelText}>Provider</span>
                            <a href="#" onClick={handleEditClick} style={{ marginLeft: '4px' }}>Edit</a>
                        </div>
                        <VSCodeDropdown 
                            value={modelConfig.provider}
                            onChange={handleProviderChange}
                            className={styles.providerDropdown}
                        >
                            {providers.map(provider => (
                                <VSCodeOption key={provider.id} value={provider.id}>
                                    <div className={styles.optionContent}>
                                        <i className={getProviderIcon(provider.id)} />
                                        <span>{provider.name}</span>
                                    </div>
                                </VSCodeOption>
                            ))}
                        </VSCodeDropdown>
                    </div>

                    {modelConfig.provider !== 'ollama' && (
                        <>
                            <div className={styles.formGroup}>
                                <div className={styles.labelWrapper}>
                                    <span className={styles.labelText}>Model</span>                 
                                </div>
                                <VSCodeTextField
                                    value={modelConfig.model}
                                    onChange={(e: any) => setModelConfig({...modelConfig, model: e.target.value})}
                                    placeholder="Enter the model name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.labelWrapper}>
                                    <span className={styles.labelText}>API key</span>
                                </div>
                                <VSCodeTextField 
                                    type="password"
                                    value={modelConfig.apiKey}
                                    onChange={(e: any) => setModelConfig({...modelConfig, apiKey: e.target.value})}
                                    placeholder="Enter your API key"
                                />
                            </div>
                        </>
                    )}

                    <div className={styles.formGroup}>
                        <div className={styles.labelWrapper}>
                            <span className={styles.labelText}>API Base URL</span>
                        </div>
                        <VSCodeTextField
                            value={modelConfig.baseUrl}
                            onChange={(e: any) => setModelConfig({...modelConfig, baseUrl: e.target.value})}
                            placeholder="Enter the API Base URL"
                        />
                    </div>

                    <div className={styles.footer}>
                        <VSCodeButton 
                            onClick={handleConnect}
                            className={styles.connectButton}
                        >
                            Save
                        </VSCodeButton>
                    </div>
                </div>
            </div>
        </div>
    )
}

function getProviderIcon(providerId: string): string {
    const iconMap: Record<string, string> = {
        'openai': '$(symbol-method)',
        'anthropic': '$(symbol-class)', 
        'openrouter': '$(symbol-variable)',
        'deepseek': '$(symbol-namespace)',
        'ollama': '$(symbol-interface)',
        'bedrock': '$(symbol-enum)',
        'vertex': '$(symbol-function)',
        'lmstudio': '$(symbol-struct)',
        'gemini': '$(symbol-constant)',
        // 可以根据需要添加更多映射
    }
    return iconMap[providerId] || '$(symbol-misc)' // 默认图标
} 