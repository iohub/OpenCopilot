import * as vscode from "vscode"
import { GlobalParser } from "./services/tree-sitter/ocopilotParser"
import path from "path"
import { CommandCodeLens } from "./integrations/codelens/CommandProvider"
import { ClineProvider } from "./core/webview/ClineProvider"

export async function ocopilotActivate(context: vscode.ExtensionContext, sidebarProvider: ClineProvider) {
    // Initialize parser
    GlobalParser.getInstance().initialize()

    // Register CodeLens provider
    const supportedLanguages = ['javascript', 'python', 'java', 'typescript']
    const provider = new CommandCodeLens(await sidebarProvider.loadCodelenCommands())
    
    // Register for each supported language
    supportedLanguages.forEach(language => {
        context.subscriptions.push(
            vscode.languages.registerCodeLensProvider(
                { scheme: 'file', language },
                provider
            )
        )
    })

    // Register edit config command
    context.subscriptions.push(
        vscode.commands.registerCommand('ocopilot.editCodeLensConfig', async () => {
            await vscode.commands.executeCommand('workbench.view.extension.ocopilot-dev-ActivityBar')
            await sidebarProvider.postMessageToWebview({ type: "action", action: "show-command-editor" })
        })
    )

    // Force an initial update of CodeLenses for all visible editors
    vscode.window.visibleTextEditors.forEach(editor => {
        if (supportedLanguages.includes(editor.document.languageId)) {
            provider.provideCodeLenses(editor.document, new vscode.CancellationTokenSource().token)
        }
    })

    // Listen for active editor changes to update CodeLenses
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && supportedLanguages.includes(editor.document.languageId)) {
                provider.provideCodeLenses(editor.document, new vscode.CancellationTokenSource().token)
            }
        })
    )

    // Listen for document changes to update CodeLenses
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor
            if (editor && event.document === editor.document && 
                supportedLanguages.includes(editor.document.languageId)) {
                provider.provideCodeLenses(editor.document, new vscode.CancellationTokenSource().token)
            }
        })
    )

    // Add selection change listener
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(event => {
            const editor = event.textEditor
            if (editor) {
                if (editor.selection.isEmpty) {
                    // Send null when selection is cleared
                    sidebarProvider.postMessageToWebview({ 
                        type: "action", 
                        action: "cancel-selection"
                    })
                } else {
                    const selectedText = editor.document.getText(editor.selection)
                    const fileName = path.basename(editor.document.fileName)
                    
                    // Send selection info to webview
                    sidebarProvider.postMessageToWebview({ 
                        type: "action", 
                        action: "selection-text",
                        selectedFile: {
                            filename: fileName,
                            start: {
                                line: editor.selection.start.line,
                                character: editor.selection.start.character
                            },
                            end: {
                                line: editor.selection.end.line, 
                                character: editor.selection.end.character
                            }
                        }
                    })
                }
            }
        })
    )

	// Register command handler
	context.subscriptions.push(
		vscode.commands.registerCommand('ocopilot.executeCodelenCommand', async (args: {
			document: vscode.TextDocument,
			range: vscode.Range,
			nodeType: string,
			action: string,
			messageTemplate: string
		}) => {
			// Show the sidebar view directly
			await vscode.commands.executeCommand('workbench.view.extension.ocopilot-dev-ActivityBar')

			const code = args.document.getText(args.range)
			const fileName = path.basename(args.document.fileName)
			
			// Use template from config
			const message = args.messageTemplate
				.replace('{fileName}', fileName)
				.replace('{code}', code)

			await sidebarProvider.initClineWithTask(message, undefined)
			if (sidebarProvider.InClineView()) { await sidebarProvider.switchToChatView() }
		})
	)

	sidebarProvider.setCodelensProvider(provider)
}

export function ocopilotDeactivate() {
}