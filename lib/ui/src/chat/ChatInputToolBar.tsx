import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatInputToolBar.module.css';
import DynamicTextArea from "react-textarea-autosize";
import { CategoryOption, CategoryList } from '@sourcegraph/cody-shared/src/common/component';
import { ExtensionState, getCurrentModelName } from '@sourcegraph/cody-shared/src/common/state'
import { getVSCodeAPI } from '@sourcegraph/cody-shared/src/common/VSCodeApi'
import { DropdownMenu, DropdownButton } from './DropdownMenu';
import dropdownStyles from './DropdownMenu.module.css';
import styled from 'styled-components';

const MODEL_CATEGORIES: CategoryList[] = [
  {
    title: 'More powerful models',
    options: [
      {
        title: 'OpenAI o1-preview',
        model: 'o1-preview',
        provider: 'openai',
        badge: 'Early Access'
      }
    ]
  },
  {
    title: 'Balanced for power and speed',
    options: [
      {
        title: 'Gemini 1.5 Pro',
        model: 'gemini-1.5-pro',
        provider: 'google'
      }
    ]
  },
  {
    title: 'Faster models',
    options: [
      {
        title: 'Gemini 2.0 Flash Experimental',
        model: 'gemini-2.0-flash',
        provider: 'google',
        badge: 'Experimental'
      }
    ]
  }
];

function modelOptionsToCategories(extensionState?: ExtensionState): CategoryList[] {
  if (!extensionState?.modelOptions) { return []; }
  const categoryMap = new Map<string, CategoryOption[]>();
  
  extensionState.modelOptions
    .filter(model => model.visible)
    .sort((a, b) => a.order - b.order)
    .forEach(model => {
      const category = model.category || 'uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push({
        title: model.name,
        model: model.id,
        provider: model.id,
      });
    });

  const categories: CategoryList[] = [];
  categoryMap.forEach((models, category) => {
    categories.push({
      title: category,
      options: models
    });
  });
  return categories;
}

function systemPromptsToCategories(extensionState?: ExtensionState): CategoryList[] {
  if (!extensionState?.systemPrompts) { return []; }
  const categoryMap = new Map<string, CategoryOption[]>();
  
  extensionState.systemPrompts
    .forEach(prompt => {
      const category = prompt.category || 'General';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push({
        title: prompt.name,
        model: prompt.id,
        provider: prompt.id
      });
    });

  const categories: CategoryList[] = [];
  categoryMap.forEach((prompts, category) => {
    categories.push({
      title: category,
      options: prompts.sort((a, b) => a.title.localeCompare(b.title))
    });
  });
  
  return categories.sort((a, b) => a.title.localeCompare(b.title));
}

export const ChatInputToolBar: React.FC<{
  onChatSubmit?: (text: string) => void
  extensionState?: ExtensionState
  setShowPromptEditor?: (show: boolean) => void
}> = ({ onChatSubmit, extensionState, setShowPromptEditor }) => {
  const [inputValue, setInputValue] = useState('');
  const modelCategory = modelOptionsToCategories(extensionState);
  const promptCategory = systemPromptsToCategories(extensionState);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<CategoryOption>(MODEL_CATEGORIES[1].options[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [webViewMode, setWebViewMode] = useState<'CLINE' | 'Chat'>('Chat');

  const handleSubmitInput = () => {
    if (inputValue.trim() && onChatSubmit) {
      onChatSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmitInput();
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmitInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      handleSubmitInput();
    }
  };

  const handleEditPrompt = () => {
    setIsPromptDropdownOpen(false);
    if (setShowPromptEditor) {
      setShowPromptEditor(true);
    }
  };

  const handleEditModel = () => {
    setIsModelDropdownOpen(false);
    getVSCodeAPI().postMessage({
      type: "openFile",
      text: "{ModelProviderFile}"
    })
  };

  const handleToggleModelDropdown = () => {
    const newIsOpen = !isModelDropdownOpen
    setIsModelDropdownOpen(newIsOpen)
    if (newIsOpen) {
      getVSCodeAPI().postMessage({
        type: "loadModelProvider",
      })
    }
  }

  const handleTogglePromptDropdown = () => {
    const newIsOpen = !isPromptDropdownOpen
    setIsPromptDropdownOpen(newIsOpen)
    if (newIsOpen) {
      getVSCodeAPI().postMessage({
        type: "loadSystemPrompts",
      })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 添加初始化加载数据的 useEffect
  useEffect(() => {
    // 加载模型选项和系统提示
    getVSCodeAPI().postMessage({
      type: "loadModelProvider",
    })
    getVSCodeAPI().postMessage({
      type: "loadSystemPrompts",
    })
  }, []) // 空依赖数组确保只在组件挂载时执行一次

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputContainer}>
          <DynamicTextArea
            className={styles.input}
            placeholder="Ask me (@ to add context)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            minRows={1}
            maxRows={10}
            cacheMeasurements
          />
          <div className={styles.inputHint}>
            Shift + ⏎ 换行
          </div>
        </div>
        
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            
            <div className={dropdownStyles.dropdown}>
              <DropdownButton
                onClick={handleTogglePromptDropdown}
                icon="terminal"
                label={extensionState?.systemPrompt.name}
              />

              <DropdownMenu
                isOpen={isPromptDropdownOpen}
                categories={promptCategory}
                onSelect={(option) => {
                  setIsPromptDropdownOpen(false);
                  getVSCodeAPI().postMessage({
                    type: "updateSystemPrompt",
                    text: option.model,
                  });
                }}
                onEdit={handleEditPrompt}
                icon="terminal"
                label="System Prompt"
                position="left"
              />
            </div>

            <div className={dropdownStyles.dropdown} ref={dropdownRef}>
              <DropdownButton
                onClick={handleToggleModelDropdown}
                icon="rocket"
                label={getCurrentModelName(extensionState!)}
              />

              <DropdownMenu
                isOpen={isModelDropdownOpen}
                categories={modelCategory}
                onSelect={(option) => {
                  setSelectedModel(option);
                  setIsModelDropdownOpen(false);
                  getVSCodeAPI().postMessage({
                    type: "switchToProvider",
                    text: option.model,
                  });
                }}
                onEdit={handleEditModel}
                icon="rocket"
                label="Model"
                position="center"
              />
            </div>
          </div>

          <button 
            type="button"
            className={styles.submitButton}
            onClick={handleButtonClick}
            disabled={!inputValue.trim()}
          >
            <svg viewBox="0 0 16 16" className={styles.playIcon} fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 13.5V2.5L13 8L4 13.5Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

const ToggleContainer = styled.div`
  display: flex;
  background: var(--vscode-input-background);
  border-radius: 20px;
  padding: 2px;
  width: fit-content;
  border: 1px solid var(--vscode-input-border);
  margin: 0 0 0 -26px;
`

const ToggleButton = styled.button<{ active: boolean }>`
  all: unset;
  padding: 4px 16px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  background: ${props => props.active ? 'var(--vscode-button-background)' : 'transparent'};
  color: ${props => props.active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)'};

  &:hover {
    background: ${props => props.active ? 'var(--vscode-button-hoverBackground)' : 'var(--vscode-toolbar-hoverBackground)'};
  }
`
