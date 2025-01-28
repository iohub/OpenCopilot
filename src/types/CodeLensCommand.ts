export interface CodeLensCommand {
    id: string
    title: string
    tooltip: string
    action: string
    messageTemplate: string
}

export interface CodeLensCommands {
    commands: CodeLensCommand[]
} 