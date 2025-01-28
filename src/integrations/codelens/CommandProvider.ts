import * as vscode from "vscode"
import { GlobalParser } from "../../services/tree-sitter/ocopilotParser"
import path from "path"
import { CodeLensCommand, CodeLensCommands } from "../../types/CodeLensCommand"
import fs from "fs/promises"
import os from "os"
import { DEFAULT_CODELENS_COMMANDS_STR } from "../../shared/AlineConfig"
import { GlobalFileNames } from "../../shared/AlineDefined"
import { mkdir } from 'fs/promises'

export class CommandCodeLens implements vscode.CodeLensProvider {
    private codeLenses: vscode.CodeLens[] = []
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event
    private commands: CodeLensCommand[] = []

    constructor() {
        this.loadCommands()

        // Refresh codelenses when configuration changes
        vscode.workspace.onDidChangeConfiguration((_) => {
            this.loadCommands()
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

    private async loadCommands() {
        try {
            const configPath = path.join(os.homedir(), ".ocopilot", GlobalFileNames.codelensCommands)
            let commandsJson: CodeLensCommands

            try {
                const userConfig = await fs.readFile(configPath, 'utf-8')
                commandsJson = JSON.parse(userConfig)
            } catch {
                commandsJson = JSON.parse(DEFAULT_CODELENS_COMMANDS_STR)
            }

            this.commands = commandsJson.commands
        } catch (error) {
            console.error('Error loading codelens commands:', error)
            // Use empty commands array if loading fails
            this.commands = []
        }
    }

    private async ensureConfigDirExists() {
        const configDir = path.join(os.homedir(), ".ocopilot")
        try {
            await mkdir(configDir, { recursive: true })
            return true
        } catch (error) {
            console.error('Error creating config directory:', error)
            return false
        }
    }

    private async createDefaultConfigFile(configPath: string) {
        try {
            await fs.writeFile(configPath, DEFAULT_CODELENS_COMMANDS_STR, 'utf-8')
            return true
        } catch (error) {
            console.error('Error creating default config file:', error)
            return false
        }
    }

    public async openConfigFile() {
        const configPath = path.join(os.homedir(), ".ocopilot", GlobalFileNames.codelensCommands)
        
        // Ensure config directory exists
        if (!await this.ensureConfigDirExists()) {
            vscode.window.showErrorMessage('Failed to create config directory')
            return
        }

        // Create default config file if it doesn't exist
        try {
            await fs.access(configPath)
        } catch {
            if (!await this.createDefaultConfigFile(configPath)) {
                vscode.window.showErrorMessage('Failed to create config file')
                return
            }
        }

        // Open the file
        const document = await vscode.workspace.openTextDocument(configPath)
        await vscode.window.showTextDocument(document)
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
                            // Special handling for edit command
                            const codeLensCommand = {
                                title: cmd.title,
                                tooltip: cmd.tooltip,
                                command: "ocopilot.editCodeLensConfig",
                                arguments: []
                            }
                            this.codeLenses.push(new vscode.CodeLens(range, codeLensCommand))
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
                }
            }
        } catch (error) {
            console.error("Error providing code lenses:", error)
        }

        return this.codeLenses
    }
}
