import React, { useState, useEffect } from 'react'
import styles from './PromptEditor.module.css'
import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react'
import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'
import { SharedState } from '@sourcegraph/cody-shared/src/common/state'
import { SystemPrompt } from '@sourcegraph/cody-shared/src/prompt/system-prompt'

interface PromptEditorProps {
    onClose: () => void
    sharedState?: SharedState
}

interface PromptCategory {
    title: string
    prompts: SystemPrompt[]
}

function systemPromptsToPromptCategory(extensionState?: SharedState): PromptCategory[] {
    if (!extensionState?.systemPrompts) { 
        return [] 
    }

    // 按照 category 对 prompts 进行分组
    const categoryMap = new Map<string, SystemPrompt[]>()
    
    extensionState.systemPrompts.forEach(prompt => {
        const category = prompt.category || 'General'
        if (!categoryMap.has(category)) {
            categoryMap.set(category, [])
        }
        categoryMap.get(category)?.push(prompt)
    })

    // 转换为数组格式并排序
    const categories: PromptCategory[] = Array.from(categoryMap.entries()).map(([title, prompts]) => ({
        title,
        prompts: prompts.sort((a, b) => a.name.localeCompare(b.name))
    }))

    return categories.sort((a, b) => a.title.localeCompare(b.title))
}

function promptCategoryToSystemPrompts(promptCategory: PromptCategory[]): SystemPrompt[] {
    return promptCategory.flatMap(category => category.prompts)
}

interface AddPromptDialogProps {
    isOpen: boolean
    category: string
    onClose: () => void
    onSave: (name: string, category: string, prompt: string) => void
}

interface AddCategoryDialogProps {
    isOpen: boolean
    onClose: () => void
    onSave: (category: string) => void
}

const AddPromptDialog: React.FC<AddPromptDialogProps> = ({ isOpen, category, onClose, onSave }) => {
    const [name, setName] = useState('')
    const [categoryName, setCategoryName] = useState(category)
    const [prompt, setPrompt] = useState('')

    if (!isOpen) return null

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <h3>Add New Template</h3>
                <div className={styles.dialogContent}>
                    <VSCodeTextField
                        value={name}
                        onChange={e => setName((e.target as HTMLInputElement).value)}
                        placeholder="name"
                    />
                    <VSCodeTextField
                        value={categoryName}
                        onChange={e => setCategoryName((e.target as HTMLInputElement).value)}
                        placeholder="category"
                    />
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="prompt content"
                        className={styles.dialogTextarea}
                    />
                </div>
                <div className={styles.dialogFooter}>
                    <VSCodeButton onClick={onClose}>Cancel</VSCodeButton>
                    <VSCodeButton onClick={() => {
                        onSave(name, categoryName, prompt)
                        setName('')
                        setCategoryName('')
                        setPrompt('')
                    }}>Save</VSCodeButton>
                </div>
            </div>
        </div>
    )
}

const AddCategoryDialog: React.FC<AddCategoryDialogProps> = ({ isOpen, onClose, onSave }) => {
    const [category, setCategory] = useState('')

    if (!isOpen) return null

    return (
        <div className={styles.dialogOverlay}>
            <div className={styles.dialog}>
                <h3>Add New Category</h3>
                <div className={styles.dialogContent}>
                    <VSCodeTextField
                        value={category}
                        onChange={e => setCategory((e.target as HTMLInputElement).value)}
                        placeholder="Category name"
                    />
                </div>
                <div className={styles.dialogFooter}>
                    <VSCodeButton onClick={onClose}>Cancel</VSCodeButton>
                    <VSCodeButton onClick={() => {
                        onSave(category)
                        setCategory('')
                    }}>Save</VSCodeButton>
                </div>
            </div>
        </div>
    )
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ onClose, sharedState }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [template, setTemplate] = useState<string>('')
    const [selectedPromptId, setSelectedPromptId] = useState<string>('')
    const [promptCategories, setPromptCategories] = useState<PromptCategory[]>([])
    const [isAddPromptOpen, setIsAddPromptOpen] = useState(false)
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)

    // 修改 useEffect，添加 sharedState 依赖
    useEffect(() => {
        // 每当 sharedState 更新时，重新加载数据
        const categories = systemPromptsToPromptCategory(sharedState)
        setPromptCategories(categories)
        setSelectedCategory('')
        setSelectedPromptId('')
        setTemplate('')
    }, [sharedState?.systemPrompts])

    // 当选择分类时更新提示列表
    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category)
        
        // 找到选中分类的第一个提示
        const selectedCategoryPrompts = promptCategories.find(cat => cat.title === category)?.prompts
        if (selectedCategoryPrompts && selectedCategoryPrompts.length > 0) {
            const firstPrompt = selectedCategoryPrompts[0]
            setSelectedPromptId(firstPrompt.id)
            setTemplate(firstPrompt.prompt)
        } else {
            setSelectedPromptId('')
            setTemplate('')
        }
    }

    // 当选择提示时更新内容
    const handlePromptChange = (promptId: string) => {
        const selectedCategory = promptCategories.find(cat => 
            cat.prompts.some(p => p.id === promptId)
        )
        const selectedPrompt = selectedCategory?.prompts.find(p => p.id === promptId)
        
        if (selectedPrompt) {
            setSelectedPromptId(promptId)
            setTemplate(selectedPrompt.prompt)
        }
    }

    const handleSave = () => {
        // 如果有选中的prompt且内容有变化
        if (selectedPromptId && template) {
            const newCategories = promptCategories.map(cat => ({
                ...cat,
                prompts: cat.prompts.map(p => 
                    p.id === selectedPromptId 
                        ? { ...p, prompt: template }
                        : p
                )
            }))
            setPromptCategories(newCategories)
            const systemPrompts = promptCategoryToSystemPrompts(newCategories)
            getVSCodeAPI().postMessage({
                type: 'SaveSystemPrompts',
                text: JSON.stringify(systemPrompts, null, 2)
            })
        }
        
        // 清空选择
        setSelectedPromptId('')
        setTemplate('')
        onClose()
    }

    const handleAddPrompt = (name: string, category: string, promptContent: string) => {
        const newPrompt: SystemPrompt = {
            id: `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            name,
            prompt: promptContent,
            category
        }

        // 更新本地状态并获取最新状态
        setPromptCategories(prevCategories => {
            const categoryIndex = prevCategories.findIndex(cat => cat.title === category)
            
            let newCategories: PromptCategory[]
            if (categoryIndex === -1) {
                // 如果分类不存在，创建新分类
                newCategories = [...prevCategories, {
                    title: category,
                    prompts: [newPrompt]
                }]
            } else {
                // 如果分类存在，添加到现有分类
                newCategories = [...prevCategories]
                newCategories[categoryIndex] = {
                    ...newCategories[categoryIndex],
                    prompts: [...newCategories[categoryIndex].prompts, newPrompt]
                }
            }

            // 在更新状态的同时发送消息
            const systemPrompts = promptCategoryToSystemPrompts(newCategories)
            getVSCodeAPI().postMessage({
                type: 'SaveSystemPrompts',
                text: JSON.stringify(systemPrompts, null, 2)
            })

            return newCategories
        })

        setIsAddPromptOpen(false)
    }

    const handleAddCategory = (categoryName: string) => {
        setIsAddCategoryOpen(false)
    }

    const handleRemovePrompt = () => {
        if (!selectedCategory || !selectedPromptId) return

        setPromptCategories(prevCategories => {
            const newCategories = prevCategories.map(cat => {
                if (cat.title === selectedCategory) {
                    return {
                        ...cat,
                        prompts: cat.prompts.filter(p => p.id !== selectedPromptId)
                    }
                }
                return cat
            }).filter(cat => cat.prompts.length > 0) // 移除空分类

            // 发送更新后的数据
            const systemPrompts = promptCategoryToSystemPrompts(newCategories)
            getVSCodeAPI().postMessage({
                type: 'SaveSystemPrompts',
                text: JSON.stringify(systemPrompts, null, 2)
            })
            return newCategories
        })

        // 清空选择
        setSelectedPromptId('')
        setTemplate('')
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
                        <div className={styles.sectionHeader}>
                            <label>Category</label>
                        </div>
                        <select 
                            value={selectedCategory}
                            onChange={e => handleCategoryChange(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">Select category</option>
                            {promptCategories.map(category => (
                                <option key={category.title} value={category.title}>
                                    {category.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <label>Prompts</label>
                            <VSCodeButton 
                                appearance="icon"
                                onClick={() => setIsAddPromptOpen(true)}
                                title="Add new template"
                                disabled={!selectedCategory}
                            >
                                <i className="codicon codicon-add" />
                            </VSCodeButton>
                        </div>
                        <select 
                            value={selectedPromptId}
                            onChange={e => handlePromptChange(e.target.value)}
                            className={styles.select}
                            disabled={!selectedCategory}
                        >
                            <option value="">Select prompt template</option>
                            {promptCategories
                                .find(cat => cat.title === selectedCategory)
                                ?.prompts.map(prompt => (
                                    <option key={prompt.id} value={prompt.id}>
                                        {prompt.name}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    <div className={styles.section}>
                        <textarea
                            value={template}
                            onChange={e => setTemplate(e.target.value)}
                            className={styles.messageTemplate}
                            placeholder="Enter prompt template..."
                            rows={8}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <VSCodeButton
                        onClick={handleRemovePrompt}
                        disabled={!selectedPromptId}
                    >
                        Remove
                    </VSCodeButton>
                    <VSCodeButton onClick={handleSave}>Save</VSCodeButton>
                </div>

                <AddPromptDialog
                    isOpen={isAddPromptOpen}
                    category={selectedCategory}
                    onClose={() => setIsAddPromptOpen(false)}
                    onSave={handleAddPrompt}
                />

                <AddCategoryDialog
                    isOpen={isAddCategoryOpen}
                    onClose={() => setIsAddCategoryOpen(false)}
                    onSave={handleAddCategory}
                />
            </div>
        </div>
    )
} 