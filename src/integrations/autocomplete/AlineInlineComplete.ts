import * as vscode from 'vscode'
import { buildApiHandler } from '../../api'
import { ApiConfiguration } from '../../shared/api'
import { js_beautify } from 'js-beautify'
import { GlobalParser } from '../../services/tree-sitter/ocopilotParser'
import { formatCompletionMessages } from '@sourcegraph/cody-shared/src/prompt/templates'
import { OPENING_CODE_TAG, CLOSING_CODE_TAG } from '@sourcegraph/cody-shared/src/prompt/constants'
import { debounce, DebouncedFunc } from 'lodash'

interface CompletionContext {
    prefixContext: string
    prefixCode: string
    suffixCode: string
    suffixContext: string
}

export class AlineInlineComplete implements vscode.InlineCompletionItemProvider {
    private currentController: AbortController | null = null
    
    private readonly debouncedComplete: DebouncedFunc<
        (
            document: vscode.TextDocument,
            position: vscode.Position,
            prefixContext: string,
            prefixCode: string,
            suffixCode: string,
            suffixContext: string,
            controller: AbortController
        ) => Promise<string | null>
    >

    constructor(private readonly configuration: ApiConfiguration) {
        this.debouncedComplete = debounce(
            async (
                document: vscode.TextDocument,
                position: vscode.Position,
                prefixContext: string,
                prefixCode: string,
                suffixCode: string,
                suffixContext: string,
                controller: AbortController
            ): Promise<string | null> => {
                try {
                    // Check if this request has been aborted
                    if (controller.signal.aborted) {
                        return null
                    }

                    const messages = formatCompletionMessages(document.fileName, prefixContext+'\n'+prefixCode, suffixCode+'\n'+suffixContext)
                    console.log(`completion content:\n\n ${messages.map(message => message.content).join('\n')}`)
                    const systemPrompt = messages.shift()?.content
                    const apiHandler = buildApiHandler(this.configuration)

                    // Add abort signal check before making the API call
                    if (controller.signal.aborted) {
                        return null
                    }

                    const completion = await apiHandler.completeMessage(
                        systemPrompt!,
                        messages
                    )

                    // Check again after the API call
                    if (controller.signal.aborted) {
                        return null
                    }

                    console.log(`completion: ${completion}`)
                    
                    let cleanedCompletion = completion
                        .trim()
                        .replace(/^```[\w-]*\n?/, '')
                        .replace(/\n?```$/, '')
                        .replace(CLOSING_CODE_TAG, '').replace(OPENING_CODE_TAG, '')

                    return cleanedCompletion || null
                } catch (error) {
                    if (!controller.signal.aborted) {
                        console.error('Inline completion error:', error)
                    }
                    return null
                }
            },
            800
        )
    }

    private parseCodeContext(document: vscode.TextDocument, position: vscode.Position): CompletionContext {
        const fileExt = document.fileName.split('.').pop()!
        const parseUtil = GlobalParser.getInstance().getParser(fileExt)
        const query = parseUtil.query
        const tree = parseUtil.parser.parse(document.getText())
        const captures = query.captures(tree.rootNode)
        const codeText = document.getText()
        const beforeFunctions = []
        const afterFunctions = []

        for (const capture of captures) {
            if (capture.node.type === "function_declaration" || capture.node.type === "method_definition") { // only consider ts now.
                const startPosition = document.positionAt(capture.node.startIndex)
                // const functionCode = codeText.substring(capture.node.startIndex, capture.node.endIndex)
                if (startPosition.line < position.line) {
                    if (document.positionAt(capture.node.endIndex).line < position.line) {
                        beforeFunctions.push(capture.node)
                    }
                } else if (startPosition.line > position.line) {
                    afterFunctions.push(capture.node)
                }
            }
        }

        const lastBeforeFunctions = beforeFunctions.slice(-3)
        const firstAfterFunctions = afterFunctions.slice(0, 2)
        const currentStartIndex = lastBeforeFunctions.length > 0 ? lastBeforeFunctions[lastBeforeFunctions.length - 1].endIndex : 0
        const currentEndIndex = firstAfterFunctions.length > 0 ? firstAfterFunctions[0].startIndex : document.getText().length
        const currentPosition = document.offsetAt(position)
        const prefixCode = codeText.substring(currentStartIndex, currentPosition)
        const suffixCode = codeText.substring(currentPosition, currentEndIndex)
        const prefixContext = lastBeforeFunctions.map(node => codeText.substring(node.startIndex, node.endIndex)).join('\n')
        const suffixContext = firstAfterFunctions.map(node => codeText.substring(node.startIndex, node.endIndex)).join('\n')
        return { prefixContext, prefixCode, suffixCode, suffixContext }
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        // Cancel any existing completion request
        if (this.currentController) {
            this.currentController.abort()
        }

        // Create new controller for this request
        this.currentController = new AbortController()
        const controller = this.currentController

        // Get the current line text up to the cursor position
        const linePrefix = document.lineAt(position).text.substring(0, position.character)

        // Don't trigger completion if line is empty or only whitespace
        if (!linePrefix.trim()) { return null }

        try {
            const { prefixContext, prefixCode, suffixCode, suffixContext } = this.parseCodeContext(document, position)
            
            // Use debounced completion function with the controller
            const cleanedCompletion = await this.debouncedComplete(
                document,
                position,
                prefixContext,
                prefixCode,
                suffixCode,
                suffixContext,
                controller
            )

            // Check if this request was aborted or if VSCode cancelled it
            if (controller.signal.aborted || token.isCancellationRequested) {
                return null
            }

            if (!cleanedCompletion) { return null }

            console.log(`cleanedCompletion: ${cleanedCompletion}`)

            return [
                new vscode.InlineCompletionItem(
                    cleanedCompletion,
                    new vscode.Range(position, position)
                )
            ]
        } catch (error) {
            if (!controller.signal.aborted) {
                console.error('Inline completion error:', error)
            }
            return null
        } finally {
            // Clear the controller reference if it hasn't been replaced
            if (this.currentController === controller) {
                this.currentController = null
            }
        }
    }
}

function formatCompletionText(suffixCode: string, completionText: string): string {
    const combinedCode = suffixCode + completionText;
    const formattedCode = js_beautify(combinedCode, {
        indent_size: 4,
        indent_with_tabs: false,
        brace_style: "collapse",
    });

    const inputTextEndIndex = findInputTextEndInFormattedCode(suffixCode, formattedCode);
    if (inputTextEndIndex !== -1) {
        return formattedCode.slice(inputTextEndIndex);
    }
    return formattedCode;
}

function findInputTextEndInFormattedCode(suffixCode: string, formattedCode: string): number {
    const normalizedInputText = suffixCode.replace(/\s+/g, '');
    const normalizedFormattedCode = formattedCode.replace(/\s+/g, '');
    const inputTextEndInNormalized = normalizedInputText.length;
    const normalizedCodePrefix = normalizedFormattedCode.slice(0, inputTextEndInNormalized);

    if (normalizedCodePrefix !== normalizedInputText) {
        return -1;
    }

    let formattedCodeIndex = 0;
    let normalizedCodeIndex = 0;

    while (normalizedCodeIndex < inputTextEndInNormalized && formattedCodeIndex < formattedCode.length) {
        if (!/\s/.test(formattedCode[formattedCodeIndex])) {
            normalizedCodeIndex++;
        }
        formattedCodeIndex++;
    }

    return formattedCodeIndex;
}