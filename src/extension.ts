import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';

export function activate(context: vscode.ExtensionContext) {
  console.log('OdooRunTest extension is now active!');

  let disposable = vscode.commands.registerCommand('oteny-run-odoo-test.runCurrentTest', async () => {
    try {
      // Get current editor and document
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      const document = editor.document;
      if (document.languageId !== 'python') {
        vscode.window.showErrorMessage('Not a Python file');
        return;
      }

      // Get the current method name
      const methodName = getCurrentMethodName(document, editor.selection.active);
      if (!methodName) {
        vscode.window.showErrorMessage('No method found at cursor position');
        return;
      }

      vscode.window.showInformationMessage(`Running test method: ${methodName}`);

      // Update settings.json
      await updateSettingsJson(methodName);

      // Update launch.json
      await ensureTestConfigInLaunchJson();

      // Start debugging with the test configuration
      await startDebugging();

    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(disposable);
}

/**
 * Get the name of the current method based on cursor position
 */
function getCurrentMethodName(document: vscode.TextDocument, position: vscode.Position): string | null {
  // Get the current line
  const currentLine = position.line;
  
  // Look backwards for a method definition line (starts with def test_...)
  for (let line = currentLine; line >= 0; line--) {
    const lineText = document.lineAt(line).text;
    const methodMatch = lineText.match(/\s*def\s+(\w+)\s*\(/);
    
    if (methodMatch) {
      return methodMatch[1]; // Return the method name
    }
  }
  
  return null;
}

/**
 * Update the settings.json file with the test method name
 */
async function updateSettingsJson(methodName: string): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder opened');
  }
  
  const settingsPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'settings.json');
  
  // Create .vscode directory if it doesn't exist
  const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
  
  let settingsJson: any = {};
  
  // Read existing settings.json if it exists
  if (fs.existsSync(settingsPath)) {
    try {
      const fileContent = fs.readFileSync(settingsPath, 'utf-8');
      settingsJson = jsonc.parse(fileContent);
    } catch (error) {
      console.error('Error reading settings.json:', error);
      // Continue with empty settings if there's an error
    }
  }
  
  // Ensure the odoo section exists
  if (!settingsJson.odoo) {
    settingsJson.odoo = {};
  }
  
  // Update the testTags with the method name
  settingsJson.odoo.testTags = `.${methodName}`;
  
  // Write the updated settings back to the file
  fs.writeFileSync(settingsPath, JSON.stringify(settingsJson, null, 4), 'utf-8');
  
  console.log(`Updated settings.json with testTags: ${settingsJson.odoo.testTags}`);
}

/**
 * Ensure a test configuration exists in launch.json
 */
async function ensureTestConfigInLaunchJson(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder opened');
  }
  
  const launchPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
  
  // Create .vscode directory if it doesn't exist
  const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir, { recursive: true });
  }
  
  let launchJson: any = {
    version: "0.2.0",
    configurations: []
  };
  
  // Read existing launch.json if it exists
  if (fs.existsSync(launchPath)) {
    try {
      const fileContent = fs.readFileSync(launchPath, 'utf-8');
      launchJson = jsonc.parse(fileContent);
    } catch (error) {
      console.error('Error reading launch.json:', error);
      // Continue with default launch.json if there's an error
    }
  }
  
  // Check if a test configuration already exists
  const testConfig = launchJson.configurations.find((config: any) => 
    config.name.endsWith('-test')
  );
  
  if (!testConfig && launchJson.configurations.length > 0) {
    // Clone the first configuration and adapt it for testing
    const baseConfig = { ...launchJson.configurations[0] };
    const baseName = baseConfig.name;
    
    // Create a new test configuration
    const newTestConfig = {
      ...baseConfig,
      name: `${baseName}-test`,
      args: [...(baseConfig.args || [])]
    };
    
    // Add or ensure test-specific arguments
    if (!newTestConfig.args.includes('--test-enable')) {
      newTestConfig.args.push('--test-enable');
    }
    
    // Add or update test-tags parameter
    const testTagsIndex = newTestConfig.args.findIndex((arg: string) => arg.startsWith('--test-tags='));
    if (testTagsIndex >= 0) {
      newTestConfig.args[testTagsIndex] = '--test-tags=${config:odoo.testTags}';
    } else {
      newTestConfig.args.push('--test-tags=${config:odoo.testTags}');
    }
    
    // Add limit-time-real parameter if not present
    if (!newTestConfig.args.includes('--limit-time-real')) {
      newTestConfig.args.push('--limit-time-real');
      newTestConfig.args.push('0');
    }
    
    // Add the new config to the launch configurations
    launchJson.configurations.push(newTestConfig);
    
    // Write the updated launch.json
    fs.writeFileSync(launchPath, JSON.stringify(launchJson, null, 4), 'utf-8');
    
    console.log(`Added test configuration "${newTestConfig.name}" to launch.json`);
  }
}

/**
 * Start the debugging session using the test configuration
 */
async function startDebugging(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder opened');
  }
  
  // Get all launch configurations
  const launchPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
  if (!fs.existsSync(launchPath)) {
    throw new Error('No launch.json found');
  }
  
  const launchConfig = jsonc.parse(fs.readFileSync(launchPath, 'utf-8'));
  
  // Find a test configuration
  const testConfig = launchConfig.configurations.find((config: any) => 
    config.name.endsWith('-test')
  );
  
  if (!testConfig) {
    throw new Error('No test configuration found in launch.json');
  }
  
  // Start debugging with the test configuration
  console.log('Starting debugging with test configuration:', testConfig.name);
  vscode.debug.startDebugging(workspaceFolder, testConfig.name);
}

export function deactivate() {} 