import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

interface DeployOptions {
    [key: string]: string[] | string[][];
}

export class DeployCommandProvider implements vscode.TreeDataProvider<DeployCommandItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeployCommandItem | undefined | null | void> = new vscode.EventEmitter<DeployCommandItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeployCommandItem | undefined | null | void> = this._onDidChangeTreeData.event;
    
    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeployCommandItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DeployCommandItem): Promise<DeployCommandItem[]> {
        if (element) {
            // Child elements for a parent
            return element.children || [];
        } else {
            // Root elements
            return await this.getDeployCommands();
        }
    }

    private async getDeployCommands(): Promise<DeployCommandItem[]> {
        const config = vscode.workspace.getConfiguration();
        const deployFilePath = config.get<string>('oteny-deploy-launch');
        
        if (!deployFilePath) {
            return [new DeployCommandItem(
                'Configure Deploy File',
                'Configure the deploy file in settings',
                vscode.TreeItemCollapsibleState.None,
                { command: 'oteny-deploy-commands.configureDeployFile', title: 'Configure Deploy File' }
            )];
        }

        // Check if file exists
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [new DeployCommandItem(
                'No Workspace Folder',
                'Open a workspace folder to use deploy commands',
                vscode.TreeItemCollapsibleState.None
            )];
        }

        const fullPath = path.isAbsolute(deployFilePath) 
            ? deployFilePath 
            : path.join(workspaceFolder.uri.fsPath, deployFilePath);

        if (!fs.existsSync(fullPath)) {
            return [new DeployCommandItem(
                'Deploy File Not Found',
                `File not found: ${fullPath}`,
                vscode.TreeItemCollapsibleState.None,
                { command: 'oteny-deploy-commands.configureDeployFile', title: 'Configure Deploy File' }
            )];
        }

        try {
            // Parse the Python file to extract OPTIONS
            const options = await this.parseOptionsFromPythonFile(fullPath);
            if (!options) {
                return [new DeployCommandItem(
                    'Invalid Deploy File',
                    'Could not parse OPTIONS from deploy file',
                    vscode.TreeItemCollapsibleState.None
                )];
            }

            // Create tree items from the options
            const items: DeployCommandItem[] = [];
            for (const [key, values] of Object.entries(options)) {
                const title = this.formatTitle(key);
                const parent = new DeployCommandItem(
                    title,
                    `${title} command group`,
                    vscode.TreeItemCollapsibleState.Collapsed
                );
                
                // Add child items for each value
                parent.children = this.createChildren(key, values);
                items.push(parent);
            }
            
            return items;
        } catch (error) {
            console.error('Error parsing deploy file:', error);
            return [new DeployCommandItem(
                'Error',
                `Error reading deploy file: ${error instanceof Error ? error.message : String(error)}`,
                vscode.TreeItemCollapsibleState.None
            )];
        }
    }

    private createChildren(key: string, values: string[] | string[][]): DeployCommandItem[] {
        const children: DeployCommandItem[] = [];

        if (Array.isArray(values)) {
            for (const value of values) {
                if (Array.isArray(value)) {
                    // Handle nested arrays (source and target)
                    const label = `${value[0]} → ${value[1]}`;
                    
                    // Run Command item
                    children.push(new DeployCommandItem(
                        `Run: ${label}`,
                        `Run deploy command for ${label}`,
                        vscode.TreeItemCollapsibleState.None,
                        { 
                            command: 'oteny-deploy-commands.runCommand', 
                            title: 'Run Command',
                            arguments: [key, value, false]
                        }
                    ));
                    
                    // Debug Command item
                    children.push(new DeployCommandItem(
                        `Debug: ${label}`,
                        `Debug deploy command for ${label}`,
                        vscode.TreeItemCollapsibleState.None,
                        { 
                            command: 'oteny-deploy-commands.runCommand', 
                            title: 'Debug Command',
                            arguments: [key, value, true]
                        }
                    ));
                } else {
                    // Handle single values
                    // Run Command item
                    children.push(new DeployCommandItem(
                        `Run: ${value}`,
                        `Run deploy command for ${value}`,
                        vscode.TreeItemCollapsibleState.None,
                        { 
                            command: 'oteny-deploy-commands.runCommand', 
                            title: 'Run Command',
                            arguments: [key, value, false]
                        }
                    ));
                    
                    // Debug Command item
                    children.push(new DeployCommandItem(
                        `Debug: ${value}`,
                        `Debug deploy command for ${value}`,
                        vscode.TreeItemCollapsibleState.None,
                        { 
                            command: 'oteny-deploy-commands.runCommand', 
                            title: 'Debug Command',
                            arguments: [key, value, true]
                        }
                    ));
                }
            }
        }

        return children;
    }

    private formatTitle(key: string): string {
        // Format 'excel-to-staging' as 'Excel To Staging'
        return key
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private async parseOptionsFromPythonFile(filePath: string): Promise<DeployOptions | null> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Simple regex to extract the OPTIONS dictionary
            const optionsMatch = content.match(/OPTIONS\s*=\s*({[\s\S]*?})/);
            if (!optionsMatch) {
                return null;
            }
            
            const optionsStr = optionsMatch[1];
            
            // Convert Python dict syntax to JSON
            // Replace single quotes with double quotes, remove trailing commas
            let jsonLike = optionsStr
                .replace(/#.*$/gm, '')
                .replace(/'/g, '"')
                .replace(/,\s*\]/g, ']')
                .replace(/,\s*}/g, '}');
            
            // Use JSON.parse to parse the string
            try {
                return JSON.parse(jsonLike) as DeployOptions;
            } catch (e) {
                console.error('Error parsing OPTIONS to JSON:', e);
                return null;
            }
        } catch (error) {
            console.error('Error reading Python file:', error);
            return null;
        }
    }
}

export class DeployCommandItem extends vscode.TreeItem {
    children?: DeployCommandItem[];

    constructor(
        public readonly label: string,
        public readonly tooltip: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip;
        this.command = command;
        
        // Set different icons based on the type of item
        if (collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ||
            collapsibleState === vscode.TreeItemCollapsibleState.Expanded) {
            // Parent items (categories)
            this.iconPath = new vscode.ThemeIcon('package');
        } else if (label.startsWith('Run:')) {
            // Run command items
            this.iconPath = new vscode.ThemeIcon('play');
        } else if (label.startsWith('Debug:')) {
            // Debug command items
            this.iconPath = new vscode.ThemeIcon('debug');
        } else if (label === 'Configure Deploy File') {
            // Configuration item
            this.iconPath = new vscode.ThemeIcon('gear');
        } else if (label === 'Deploy File Not Found' || label === 'Invalid Deploy File' || label === 'Error') {
            // Error items
            this.iconPath = new vscode.ThemeIcon('warning');
        } else {
            // Default icon
            this.iconPath = new vscode.ThemeIcon('zap');
        }
    }
}

export async function runDeployCommand(commandKey: string, value: string | string[], debug: boolean): Promise<void> {
    try {
        const config = vscode.workspace.getConfiguration();
        const deployFilePath = config.get<string>('oteny-deploy-launch');
        
        if (!deployFilePath) {
            vscode.window.showErrorMessage('Deploy file path not configured');
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const fullPath = path.isAbsolute(deployFilePath) 
            ? deployFilePath 
            : path.join(workspaceFolder.uri.fsPath, deployFilePath);

        if (!fs.existsSync(fullPath)) {
            vscode.window.showErrorMessage(`Deploy file not found: ${fullPath}`);
            return;
        }

        // Handle both string and array inputs
        let argValues: string[];
        let displayValue: string;
        
        if (Array.isArray(value)) {
            argValues = value;
            displayValue = value.join(' → ');
        } else {
            argValues = [value as string];
            displayValue = value as string;
        }

        // Prepare the command arguments
        const args = [fullPath, commandKey, ...argValues];
        
        if (debug) {
            // For debugging, create a debug configuration and start debugging
            const debugConfig = {
                type: 'python',
                name: 'Debug Deploy Command',
                request: 'launch',
                program: fullPath,
                args: [commandKey, ...argValues],
                console: 'integratedTerminal',
            };
            
            vscode.debug.startDebugging(workspaceFolder, debugConfig);
        } else {
            // For running, spawn a process
            const pythonPath = 'python3'; // TODO: Get python path from config
            let terminal = vscode.window.terminals.find(t => t.name === 'Deploy Command');
            if (!terminal) {
                terminal = vscode.window.createTerminal('Deploy Command');
            }
            terminal.show();
            
            // Format command for display
            const formattedCommand = `${formatTitle(commandKey)} (${displayValue})`;
            
            // Execute the command with separated arguments
            const commandArgs = [commandKey, ...argValues].join(' ');
            terminal.sendText(`${pythonPath} ${fullPath} ${commandArgs}`);
            vscode.window.showInformationMessage(`Running ${formattedCommand}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error running deploy command: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function formatTitle(key: string): string {
    // Format 'excel-to-staging' as 'Excel To Staging'
    return key
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
} 