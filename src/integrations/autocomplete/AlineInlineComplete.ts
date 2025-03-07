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
        if (!linePrefix.trim()) {
            return null
        }

        // Calculate the indentation of the current line
        const currentLineIndent = linePrefix.match(/^(\s*)/)?.[1] || ''

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

            if (!cleanedCompletion) {
                return null
            }

            // Process the completion to avoid duplication with suffix code
            cleanedCompletion = processCompletionText(cleanedCompletion, suffixCode, currentLineIndent)
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

/**
 * Process the completion text to avoid duplication with suffix code
 * and format it appropriately
 */
function processCompletionText(completionText: string, suffixCode: string, currentIndent: string): string {
    // Trim both texts to normalize them
    const trimmedCompletion = completionText.trim()
    const trimmedSuffix = suffixCode.trim()
    
    // If suffix is empty, just return the formatted completion
    if (!trimmedSuffix) {
        return formatCode(trimmedCompletion, currentIndent)
    }
    
    // Check if completion ends with the beginning of suffix
    // This helps avoid duplication when the model predicts part of the existing code
    let finalCompletion = trimmedCompletion
    
    // Find the longest common substring at the end of completion and start of suffix
    const maxOverlapLength = Math.min(trimmedCompletion.length, trimmedSuffix.length)
    let overlapLength = 0
    
    for (let i = 1; i <= maxOverlapLength; i++) {
        const completionEnd = trimmedCompletion.slice(-i)
        const suffixStart = trimmedSuffix.slice(0, i)
        
        if (completionEnd === suffixStart) {
            overlapLength = i
        }
    }
    
    // Remove the overlapping part from the completion
    if (overlapLength > 0) {
        finalCompletion = trimmedCompletion.slice(0, -overlapLength)
    }
    
    // Format the final completion
    return formatCode(finalCompletion, currentIndent)
}

/**
 * Format code using js-beautify and preserve indentation
 */
function formatCode(code: string, currentIndent: string): string {
    try {
        // First format the code with js-beautify
        const formattedCode = js_beautify(code, {
            indent_size: 4,
            indent_with_tabs: false,
            brace_style: "collapse",
        });
        
        // Then adjust the indentation to match the current line
        if (!currentIndent) {
            return formattedCode;
        }
        
        // For multi-line completions, we need to add the current indentation to each line
        if (formattedCode.includes('\n')) {
            const lines = formattedCode.split('\n');
            
            // First line doesn't need additional indentation as it continues the current line
            const firstLine = lines[0];
            
            // Subsequent lines need the current indentation plus their own relative indentation
            const restLines = lines.slice(1).map(line => {
                // Preserve empty lines
                if (!line.trim()) {
                    return '';
                }
                
                // Get the line's own indentation
                const lineIndent = line.match(/^(\s*)/)?.[1] || '';
                
                // Return the line with current indentation plus its own indentation
                return currentIndent + line;
            });
            
            return [firstLine, ...restLines].join('\n');
        }
        
        // For single-line completions, just return the formatted code
        return formattedCode;
    } catch (error) {
        console.error('Error formatting code:', error)
        return code
    }
}