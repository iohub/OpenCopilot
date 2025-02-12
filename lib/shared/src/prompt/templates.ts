import path from 'path'

import { getFileExtension, getNormalizedLanguageName } from '../chat/recipes/helpers'
import { ActiveTextEditorDiagnostic, ActiveTextEditorSelection } from '../editor'

import { MAX_RECIPE_INPUT_TOKENS } from './constants'
import { truncateText, truncateTextStart } from './truncation'
import { CompletionMessage } from '../common/message'

const CODE_CONTEXT_TEMPLATE = `Use following code snippet from file \`{filePath}\`:
\`\`\`{language}
{text}
\`\`\``

const CODE_CONTEXT_TEMPLATE_WITH_REPO = `Use following code snippet from file \`{filePath}\` in repository \`{repoName}\`:
\`\`\`{language}
{text}
\`\`\``

export function populateCodeContextTemplate(code: string, filePath: string, repoName?: string): string {
    return (repoName ? CODE_CONTEXT_TEMPLATE_WITH_REPO.replace('{repoName}', repoName) : CODE_CONTEXT_TEMPLATE)
        .replace('{filePath}', filePath)
        .replace('{language}', getExtension(filePath))
        .replace('{text}', code)
}

const PRECISE_CONTEXT_TEMPLATE = `The symbol '{symbol}' is defined in the file {filePath} as:
\`\`\`{language}
{text}
\`\`\``

export function populatePreciseCodeContextTemplate(symbol: string, filePath: string, code: string): string {
    return PRECISE_CONTEXT_TEMPLATE.replace('{symbol}', symbol)
        .replace('{filePath}', filePath)
        .replace('{language}', getExtension(filePath))
        .replace('{text}', code)
}

const MARKDOWN_CONTEXT_TEMPLATE = 'Use the following text from file `{filePath}`:\n{text}'

const MARKDOWN_CONTEXT_TEMPLATE_WITH_REPO =
    'Use the following text from file `{filePath}` in repository `{repoName}`:\n{text}'

export function populateMarkdownContextTemplate(markdown: string, filePath: string, repoName?: string): string {
    return (repoName ? MARKDOWN_CONTEXT_TEMPLATE_WITH_REPO.replace('{repoName}', repoName) : MARKDOWN_CONTEXT_TEMPLATE)
        .replace('{filePath}', filePath)
        .replace('{text}', markdown)
}

const CURRENT_EDITOR_CODE_TEMPLATE = 'I have the `{filePath}` file opened in my editor. '

const CURRENT_EDITOR_CODE_TEMPLATE_WITH_REPO =
    'I have the `{filePath}` file from the repository `{repoName}` opened in my editor. '

export function populateCurrentEditorContextTemplate(code: string, filePath: string, repoName?: string): string {
    const context = isMarkdownFile(filePath)
        ? populateMarkdownContextTemplate(code, filePath, repoName)
        : populateCodeContextTemplate(code, filePath, repoName)
    return (
        (repoName
            ? CURRENT_EDITOR_CODE_TEMPLATE_WITH_REPO.replace('{repoName}', repoName)
            : CURRENT_EDITOR_CODE_TEMPLATE
        ).replaceAll('{filePath}', filePath) + context
    )
}

const CURRENT_EDITOR_SELECTED_CODE_TEMPLATE = 'Here is the selected {language} code from file path `{filePath}`: '

const CURRENT_EDITOR_SELECTED_CODE_TEMPLATE_WITH_REPO =
    'Here is the selected code from file `{filePath}` in the {repoName} repository, written in {language}: '

export function populateCurrentEditorSelectedContextTemplate(
    code: string,
    filePath: string,
    repoName?: string
): string {
    const extension = getFileExtension(filePath)
    const languageName = getNormalizedLanguageName(extension)
    const context = isMarkdownFile(filePath)
        ? populateMarkdownContextTemplate(code, filePath, repoName)
        : populateCodeContextTemplate(code, filePath, repoName)
    return (
        (repoName
            ? CURRENT_EDITOR_SELECTED_CODE_TEMPLATE_WITH_REPO.replace('{repoName}', repoName)
            : CURRENT_EDITOR_SELECTED_CODE_TEMPLATE
        )
            .replace('{language}', languageName)
            .replaceAll('{filePath}', filePath) + context
    )
}

const DIAGNOSTICS_CONTEXT_TEMPLATE = `Use the following {type} from the code snippet in the file \`{filePath}\`
{prefix}: {message}
Code snippet:
\`\`\`{language}
{code}
\`\`\``

export function populateCurrentEditorDiagnosticsTemplate(
    { message, type, text }: ActiveTextEditorDiagnostic,
    filePath: string
): string {
    const language = getExtension(filePath)
    return DIAGNOSTICS_CONTEXT_TEMPLATE.replace('{type}', type)
        .replace('{filePath}', filePath)
        .replace('{prefix}', type)
        .replace('{message}', message)
        .replace('{language}', language)
        .replace('{code}', text)
}

const COMMAND_OUTPUT_TEMPLATE = 'Here is the output returned from the terminal.\n'

export function populateTerminalOutputContextTemplate(output: string): string {
    return COMMAND_OUTPUT_TEMPLATE + output
}

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown'])

export function isMarkdownFile(filePath: string): boolean {
    return MARKDOWN_EXTENSIONS.has(getExtension(filePath))
}

function getExtension(filePath: string): string {
    return path.extname(filePath).slice(1)
}

const SELECTED_CODE_CONTEXT_TEMPLATE = `"My selected {languageName} code from file \`{filePath}\`:
<selected>
{code}
</selected>`

const SELECTED_CODE_CONTEXT_TEMPLATE_WITH_REPO = `"My selected {languageName} code from file \`{filePath}\` in \`{repoName}\` repository:
<selected>
{code}
</selected>`

export function populateCurrentSelectedCodeContextTemplate(code: string, filePath: string, repoName?: string): string {
    const extension = getFileExtension(filePath)
    const languageName = getNormalizedLanguageName(extension)
    return (
        repoName
            ? SELECTED_CODE_CONTEXT_TEMPLATE_WITH_REPO.replace('{repoName}', repoName)
            : SELECTED_CODE_CONTEXT_TEMPLATE
    )
        .replace('{code}', code)
        .replaceAll('{filePath}', filePath)
        .replace('{languageName}', languageName)
}

const CURRENT_FILE_CONTEXT_TEMPLATE = `My selected code from file path \`{filePath}\` in <selected> tags:
{precedingText}<selected>\n{selectedText}\n</selected>{followingText}`

const SELECTED_CONTEXT_TEMPLATE = `Here is my selected code:\n\`\`\`\n{selectedText}\n\`\`\``

export function populateCurrentFileFromEditorSelectionContextTemplate(
    selection: ActiveTextEditorSelection,
    filePath: string
): string {
    const extension = getFileExtension(filePath)
    const languageName = getNormalizedLanguageName(extension)
    const surroundingTextLength = (MAX_RECIPE_INPUT_TOKENS - selection.selectedText.length) / 2
    const truncatedSelectedText = truncateText(selection.selectedText, MAX_RECIPE_INPUT_TOKENS) || ''
    const truncatedPrecedingText = truncateTextStart(selection.precedingText, surroundingTextLength)
    const truncatedFollowingText = truncateText(selection.followingText, surroundingTextLength)

    const fileContext = CURRENT_FILE_CONTEXT_TEMPLATE.replace('{languageName}', languageName)
        .replaceAll('{filePath}', filePath)
        .replace('{followingText}', truncatedFollowingText)
        .replace('{selectedText}', truncatedSelectedText)
        .replace('{precedingText}', truncatedPrecedingText)

    return truncateText(fileContext, MAX_RECIPE_INPUT_TOKENS * 3)
}

export function populateOnlySelectionContextTemplate(
    selection: ActiveTextEditorSelection,
    filePath: string
): string {
    const extension = getFileExtension(filePath)
    const languageName = getNormalizedLanguageName(extension)
    const truncatedSelectedText = truncateText(selection.selectedText, MAX_RECIPE_INPUT_TOKENS) || ''

    const fileContext = SELECTED_CONTEXT_TEMPLATE.replace('{languageName}', languageName)
        .replace('{selectedText}', truncatedSelectedText)

    return truncateText(fileContext, MAX_RECIPE_INPUT_TOKENS * 3)
}

const DIRECTORY_FILE_LIST_TEMPLATE = 'Here is a list of files from the directory contains {fileName} in my codebase: '
const ROOT_DIRECTORY_FILE_LIST_TEMPLATE = 'Here is a list of files from the root codebase directory: '

export function populateListOfFilesContextTemplate(fileList: string, fileName: string): string {
    const templateText = fileName === 'root' ? ROOT_DIRECTORY_FILE_LIST_TEMPLATE : DIRECTORY_FILE_LIST_TEMPLATE
    return templateText.replace('{fileName}', fileName) + fileList
}

export function populateContextTemplateFromText(templateText: string, content: string, fileName: string): string {
    return templateText.replace('{fileName}', fileName) + content
}

const FILE_IMPORTS_TEMPLATE = '{fileName} has imported the folowing: '

export function populateImportListContextTemplate(importList: string, fileName: string): string {
    return FILE_IMPORTS_TEMPLATE.replace('{fileName}', fileName) + importList
}

const completionPrompt = `
# System Prompt for Code Completion with FIM

**Role**: You are an expert code completion assistant trained to generate missing code segments using Fill-in-the-Middle (FIM) methodology. You analyze code context from provided prefixes/suffixes and reference code to produce accurate, syntactically correct completions.

## Task Requirements
1. Use FIM pattern: \`<PRE>{prefix}</PRE><SUF>{suffix}</SUF><MID>\`
2. Accept inputs:
   - Prefix (code before missing segment)
   - Suffix (code after missing segment) 
   - Reference code (relevant functions/variables from other files)
3. Generate completion that:
   - Matches surrounding code style
   - Maintains syntactic consistency
   - Leverages reference code when applicable
   - Prioritizes correctness over creativity

## Input Structure
\`\`\`xml
<CONTEXT>
<PRE>{infillPrefix}</PRE>
<SUF>{infillSuffix}</SUF>
</CONTEXT>
\`\`\`

## Output Guidelines
1. Respond ONLY with the missing code segment
2. No markdown formatting in output
3. Never repeat code from prefix/suffix
4. Explicit error handling when:
    - Missing critical references
    - Detected syntax contradictions
    - Ambiguous completion paths
5. Indentation Formatting:
    - Auto-detect indentation style from prefix (tabs/2-space/4-space)
    - Maintain exact column alignment
    - Fix inconsistent indentation in generated code
    - Never mix tabs and spaces

## Critical Constraints
* Never hallucinate APIs/functions not present in reference code
* Avoid introducing new variables unless absolutely required
* Strictly maintain original code indentation style (tabs/spaces)
* No explanatory text - only code output

## Example Pattern
### Input:

\`\`\`xml
<CONTEXT>
<PRE>
def calculate_stats(data):
    mean = sum(data)/len(data)
    sorted_data</PRE>
<SUF>
    return {
        "mean": mean,
        "median": median
    }
</SUF>
<REF>
# utils.py
def find_middle(sorted_list):
    n = len(sorted_list)
    return (sorted_list[n//2] + sorted_list[-n//2])/2
</REF>
</CONTEXT>
\`\`\`

### Output:
\`\`\`
     = sorted(data)
    middle_index = len(sorted_data)//2
    median = (sorted_data[middle_index] + sorted_data[-middle_index])/2
\`\`\`


`

export function formatCompletionMessages(fileName: string, infillPrefix: string, infillSuffix: string): CompletionMessage[] {
    return [
        {
            role: 'system',
            content: `You are a code completion AI designed to take the surrounding code and shared context into account in order to predict and suggest high-quality code to complete. You only respond with code that works and fits seamlessly with surrounding code if any or use best practice and nothing else.`
        },
        {
            role: 'assistant',
            content: 'I am a code completion AI with exceptional context-awareness designed to auto-complete nested code blocks with high-quality code that seamlessly integrates with surrounding code.'
        },
        {
            role: 'user',
            content: completionPrompt.replace('{infillPrefix}', infillPrefix).replace('{infillSuffix}', infillSuffix)
        }
    ];
}
