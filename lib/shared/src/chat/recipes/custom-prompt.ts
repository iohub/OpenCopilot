import { URI } from 'vscode-uri'

import { CodebaseContext } from '../../codebase-context'
import { ContextFile, ContextMessage } from '../../codebase-context/messages'
import { ActiveTextEditorSelection, Editor } from '../../editor'
import { MAX_HUMAN_INPUT_TOKENS, NUM_CODE_RESULTS, NUM_TEXT_RESULTS } from '../../prompt/constants'
import { truncateText } from '../../prompt/truncation'
import { CodyPromptContext, defaultCodyPromptContext, getCommandEventSource } from '../prompts'
import { createDisplayTextWithFileLinks, createDisplayTextWithFileSelection } from '../prompts/display-text'
import {
    extractTestType,
    getHumanLLMText,
    isOnlySelectionRequired,
    newInteraction,
    newInteractionWithError,
} from '../prompts/utils'
import {
    getCurrentDirContext,
    getCurrentFileContextFromEditorSelection,
    getContextFromEditorSelection,
    getCurrentFileImportsContext,
    getDirectoryFileListContext,
    getEditorDirContext,
    getEditorOpenTabsContext,
    getFilePathContext,
    getPackageJsonContext,
    getTerminalOutputContext,
} from '../prompts/vscode-context'
import { Interaction } from '../transcript/interaction'

import { ChatQuestion } from './chat-question'
import { getFileExtension, numResults } from './helpers'
import { Recipe, RecipeContext, RecipeID } from './recipe'

/**
 * ======================================================
 * Recipe for running custom prompts from the cody.json files
 * Works with VS Code only
====================================================== *
 */
export class CustomPrompt implements Recipe {
    public id: RecipeID = 'custom-prompt'
    public title = 'Custom Prompt'

    /**
     * Retrieves an Interaction object based on the humanChatInput and RecipeContext provided.
     * The Interaction object contains messages from both the human and the assistant, as well as context information.
     */
    public async getInteraction(commandRunnerID: string, context: RecipeContext): Promise<Interaction | null> {
        const command = context.editor.controllers?.command?.getCommand(commandRunnerID)
        if (!command) {
            const errorMessage = 'Invalid command -- command not found.'
            return newInteractionWithError(errorMessage)
        }
        const isChatQuestion = command?.slashCommand === '/ask'

        const contextConfig = command?.context || defaultCodyPromptContext
        // If selection is required, ensure not to accept visible content as selection
        const selection = contextConfig?.selection
            ? await context.editor.getActiveTextEditorSmartSelection()
            : context.editor.getActiveTextEditorSelectionOrVisibleContent()

        // Get prompt text from the editor command or from the human input
        const commandAdditionalInput = command.additionalInput
        const promptText = commandAdditionalInput ? `${command.prompt}\n${commandAdditionalInput}` : command.prompt
        const commandName = isChatQuestion ? promptText : command.slashCommand || promptText

        // Log all custom commands under 'custom'
        const source = getCommandEventSource(command)

        if (!promptText) {
            const errorMessage = 'Please enter a valid prompt for the custom command.'
            return newInteractionWithError(errorMessage, promptText || '')
        }

        if (contextConfig?.selection && !selection?.selectedText) {
            const errorMessage = `__${commandName}__ requires highlighted code. Please select some code in your editor and try again.`
            return newInteractionWithError(errorMessage, commandName)
        }

        const text = getHumanLLMText(promptText, selection?.fileName)

        const commandOutput = command.context?.output
        const contextFiles = command.contextFiles

        // Add selection file name as display when available
        const displayText = contextFiles?.length
            ? createDisplayTextWithFileLinks(contextFiles, promptText)
            : createDisplayTextWithFileSelection(
                  commandAdditionalInput ? `${commandName} ${commandAdditionalInput}` : commandName,
                  selection
              )

        const truncatedText = truncateText(text, MAX_HUMAN_INPUT_TOKENS)

        if (selection && context.onlySelectedContext) {
            const contextMessages = Promise.resolve(getContextFromEditorSelection(selection))
            return newInteraction({ text, displayText, contextMessages, source })
        }

        // Attach code selection to prompt text if only selection is needed as context
        if (selection && isOnlySelectionRequired(contextConfig)) {
            const contextMessages = Promise.resolve(getCurrentFileContextFromEditorSelection(selection))
            return newInteraction({ text, displayText, contextMessages, source })
        }

        const contextMessages = this.getContextMessages(
            promptText,
            context.editor,
            context.codebaseContext,
            contextConfig,
            selection,
            context.userInputContextFiles,
            commandOutput
        )

        return newInteraction({ text: truncatedText, displayText, contextMessages, source })
    }

    private async getContextMessages(
        promptText: string,
        editor: Editor,
        codebaseContext: CodebaseContext,
        promptContext: CodyPromptContext,
        selection?: ActiveTextEditorSelection | null,
        contextFiles?: ContextFile[],
        commandOutput?: string | null
    ): Promise<ContextMessage[]> {
        const contextMessages: ContextMessage[] = []
        const workspaceRootUri = editor.getWorkspaceRootUri()
        const isUnitTestRequest = extractTestType(promptText) === 'unit'

        if (promptContext.none) {
            return []
        }

        if (promptContext.codebase) {
            const codebaseMessages = await codebaseContext.getContextMessages(promptText, numResults)
            contextMessages.push(...codebaseMessages)
        }

        if (promptContext.openTabs) {
            const openTabsMessages = await getEditorOpenTabsContext()
            contextMessages.push(...openTabsMessages)
        }

        if (promptContext.currentDir) {
            const currentDirMessages = await getCurrentDirContext(isUnitTestRequest)
            contextMessages.push(...currentDirMessages)
        }

        if (promptContext.directoryPath) {
            const dirMessages = await getEditorDirContext(promptContext.directoryPath, selection?.fileName)
            contextMessages.push(...dirMessages)
        }

        if (promptContext.filePath) {
            const fileMessages = await getFilePathContext(promptContext.filePath)
            contextMessages.push(...fileMessages)
        }

        // Context for unit tests requests
        if (isUnitTestRequest && contextMessages.length === 0) {
            if (selection?.fileName) {
                const importsContext = await this.getUnitTestContextMessages(selection, workspaceRootUri)
                contextMessages.push(...importsContext)
            }
        }

        if (promptContext.currentFile || promptContext.selection !== false) {
            if (selection) {
                const currentFileMessages = getCurrentFileContextFromEditorSelection(selection)
                contextMessages.push(...currentFileMessages)
            }
        }

        if (promptContext.command && commandOutput) {
            const outputMessages = getTerminalOutputContext(commandOutput)
            contextMessages.push(...outputMessages)
        }

        if (contextFiles?.length) {
            const contextFileMessages = await ChatQuestion.getContextFilesContext(editor, contextFiles)
            contextMessages.push(...contextFileMessages)
        }

        // Return sliced results
        const maxResults = Math.floor((NUM_CODE_RESULTS + NUM_TEXT_RESULTS) / 2) * 2
        return contextMessages.slice(-maxResults * 2)
    }

    private async getUnitTestContextMessages(
        selection: ActiveTextEditorSelection,
        workspaceRootUri?: URI | null
    ): Promise<ContextMessage[]> {
        const contextMessages: ContextMessage[] = []

        if (workspaceRootUri) {
            const rootFileNames = await getDirectoryFileListContext(workspaceRootUri, true)
            contextMessages.push(...rootFileNames)
        }
        // Add package.json content only if files matches the ts/js extension regex
        if (selection?.fileName && getFileExtension(selection?.fileName).match(/ts|js/)) {
            const packageJson = await getPackageJsonContext(selection?.fileName)
            contextMessages.push(...packageJson)
        }
        // Try adding import statements from current file as context
        if (selection?.fileName) {
            const importsContext = await getCurrentFileImportsContext()
            contextMessages.push(...importsContext)
        }

        return contextMessages
    }
}
