import * as vscode from "vscode"
import { GlobalParser } from "../../services/tree-sitter/ocopilotParser"
import path from "path"
import { CodeLensCommand } from "@sourcegraph/cody-shared/src/common/state"


export class CommandCodeLens implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = []
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event
    private commands: CodeLensCommand[] = []

    constructor(commands: CodeLensCommand[]) {
        this.commands = commands

        // Refresh codelenses when configuration changes
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire()
        })

        // Refresh codelenses when text document changes
        vscode.workspace.onDidChangeTextDocument((_) => {
            this._onDidChangeCodeLenses.fire()
        })

        // Refresh codelenses when the active editor changes
        vscode.window.onDidChangeActiveTextEditor((_) => {
            this._onDidChangeCodeLenses.fire()
        })

        // Initial refresh for any already open editors
        this._onDidChangeCodeLenses.fire()
    }

    public updateCommands(commands: CodeLensCommand[]) {
        this.commands = commands
        this._onDidChangeCodeLenses.fire()
    }

    public async provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeLens[]> {
        if (token.isCancellationRequested) {
            return []
        }
        
        this.codeLenses = []
        const fileExt = path.extname(document.fileName).slice(1)

        try {
            if (!GlobalParser.getInstance().hasParser(fileExt)) {
                console.log(`no parser for ${fileExt}`)
                return []
            }

            const { parser, query } = GlobalParser.getInstance().getParser(fileExt)
            const tree = parser.parse(document.getText())
            const captures = query.captures(tree.rootNode)

            for (const capture of captures) {
                if (capture.name.startsWith('definition')) {
                    const range = new vscode.Range(
                        document.positionAt(capture.node.startIndex),
                        document.positionAt(capture.node.endIndex)
                    )

                    // Create CodeLens for each command in config
                    this.commands.forEach(cmd => {
                        if (cmd.action === 'edit') {
                            // ignore edit command
                        } else {
                            // Normal command handling
                            const codeLensCommand = {
                                title: cmd.title,
                                tooltip: cmd.tooltip,
                                command: "ocopilot.executeCodelenCommand",
                                arguments: [{
                                    document,
                                    range,
                                    nodeType: capture.name,
                                    action: cmd.action,
                                    messageTemplate: cmd.messageTemplate
                                }]
                            }
                            this.codeLenses.push(new vscode.CodeLens(range, codeLensCommand))
                        }
                    })
                    const codeLensCommand = {
                        title: '⚙️Edit',
                        tooltip: 'Edit the commands',
                        command: "ocopilot.editCodeLensConfig",
                        arguments: []
                    }
                    this.codeLenses.push(new vscode.CodeLens(range, codeLensCommand))
                }
            }
        } catch (error) {
            console.error("Error providing code lenses:", error)
        }

        return this.codeLenses
    }
}
