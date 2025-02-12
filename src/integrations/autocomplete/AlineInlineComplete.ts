import * as vscode from 'vscode'
import { buildApiHandler } from '../../api'
import { ApiConfiguration } from '../../shared/api'
import { js_beautify } from 'js-beautify'
import { GlobalParser } from '../../services/tree-sitter/ocopilotParser'
import { formatCompletionMessages } from '@sourcegraph/cody-shared/src/prompt/templates'
import { OPENING_CODE_TAG, CLOSING_CODE_TAG } from '@sourcegraph/cody-shared/src/prompt/constants'

interface CompletionContext {
    prefixContext: string
    prefixCode: string
    suffixCode: string
    suffixContext: string
}

export class AlineInlineComplete implements vscode.InlineCompletionItemProvider {
    constructor(private readonly configuration: ApiConfiguration) { }


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
        // Get the current line text up to the cursor position
        const linePrefix = document.lineAt(position).text.substring(0, position.character)

        // Don't trigger completion if line is empty or only whitespace
        if (!linePrefix.trim()) { return null }

        try {
            const { prefixContext, prefixCode, suffixCode, suffixContext } = this.parseCodeContext(document, position)
            const messages = formatCompletionMessages(document.fileName, prefixContext+'\n'+prefixCode, suffixCode+'\n'+suffixContext)
            console.log(`completion content:\n\n ${messages.map(message => message.content).join('\n')}`)
            const systemPrompt = messages.shift()?.content
            const apiHandler = buildApiHandler(this.configuration)
            const completion = await apiHandler.completeMessage(
                systemPrompt!,
                messages
            )
            console.log(`completion: ${completion}`)
            // Clean up completion text
            let cleanedCompletion = completion
                .trim()
                .replace(/^```[\w-]*\n?/, '') // Remove opening code fence
                .replace(/\n?```$/, '')       // Remove closing code fence
                .replace(CLOSING_CODE_TAG, '').replace(OPENING_CODE_TAG, '')

            if (!cleanedCompletion) { return null }

            // cleanedCompletion = formatCompletionText(suffixCode, cleanedCompletion)
            console.log(`cleanedCompletion: ${cleanedCompletion}`)

            // Create and return completion item
            return [
                new vscode.InlineCompletionItem(
                    cleanedCompletion,
                    new vscode.Range(position, position)
                )
            ]
        } catch (error) {
            console.error('Inline completion error:', error)
            return null
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