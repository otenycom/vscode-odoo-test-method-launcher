import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as jsonc from 'jsonc-parser';

export function activate(context: vscode.ExtensionContext) {
  console.log('OdooRunTest extension is now active!');

  // Command to run the current test without debugging
  let runDisposable = vscode.commands.registerCommand('oteny-run-odoo-test.runCurrentTest', async () => {
    await executeTestCommand(false);
  });

  // Command to debug the current test
  let debugDisposable = vscode.commands.registerCommand('oteny-run-odoo-test.debugCurrentTest', async () => {
    await executeTestCommand(true);
  });

  context.subscriptions.push(runDisposable, debugDisposable);
}

/**
 * Execute the appropriate test command based on context
 */
async function executeTestCommand(useDebugger: boolean): Promise<void> {
  try {
    // Get current editor and document
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor, running default configuration');
      await runDefaultConfiguration(useDebugger);
      return;
    }

    const document = editor.document;
    if (document.languageId !== 'python') {
      vscode.window.showInformationMessage('Not a Python file, running default configuration');
      await runDefaultConfiguration(useDebugger);
      return;
    }

    // Get the current method name
    const methodName = getCurrentMethodName(document, editor.selection.active);
    if (!methodName || !methodName.startsWith('test_')) {
      vscode.window.showInformationMessage('No test method found at cursor position, running default configuration');
      await runDefaultConfiguration(useDebugger);
      return;
    }

    vscode.window.showInformationMessage(`${useDebugger ? 'Debugging' : 'Running'} test method: ${methodName}`);

    // Update settings.json
    await updateSettingsJson(methodName);

    // Update launch.json
    await ensureTestConfigInLaunchJson();

    // Start with or without debugging using the test configuration
    await startTest(useDebugger);

  } catch (error) {
    vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
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
 * Run the default configuration
 */
async function runDefaultConfiguration(useDebugger: boolean): Promise<void> {
  try {
    if (useDebugger) {
      // Use the default F5 behavior
      await vscode.commands.executeCommand('workbench.action.debug.start');
    } else {
      // Use the default Ctrl+F5 behavior
      await vscode.commands.executeCommand('workbench.action.debug.run');
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to start ${useDebugger ? 'debugging' : 'running'}. ` +
      `Ensure you have a valid launch configuration.`
    );
  }
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
  
  let fileContent = '';
  let settingsJson: any = {};
  
  // Read existing settings.json if it exists
  if (fs.existsSync(settingsPath)) {
    try {
      fileContent = fs.readFileSync(settingsPath, 'utf-8');
      settingsJson = jsonc.parse(fileContent);
    } catch (error) {
      console.error('Error reading settings.json:', error);
      // Continue with empty settings if there's an error
    }
  }
  
  // If the file doesn't exist or is empty, initialize it
  if (!fileContent) {
    fileContent = '{}';
  }
  
  // Ensure the odoo section exists and update testTags
  const edits = [];
  if (!settingsJson.odoo) {
    edits.push({
      path: ['odoo'],
      value: {},
      formattingOptions: { tabSize: 4, insertSpaces: true }
    });
  }
  
  // Update the testTags with the method name
  edits.push({
    path: ['odoo', 'testTags'],
    value: `.${methodName}`,
    formattingOptions: { tabSize: 4, insertSpaces: true }
  });
  
  // Apply the edits
  for (const edit of edits) {
    const modifications = jsonc.modify(fileContent, edit.path, edit.value, {
      formattingOptions: edit.formattingOptions
    });
    fileContent = jsonc.applyEdits(fileContent, modifications);
  }
  
  // Write the updated settings back to the file
  fs.writeFileSync(settingsPath, fileContent, 'utf-8');
  
  console.log(`Updated settings.json with testTags: .${methodName}`);
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
  
  let fileContent = '';
  let launchJson: any = {
    version: "0.2.0",
    configurations: []
  };
  
  // Read existing launch.json if it exists
  if (fs.existsSync(launchPath)) {
    try {
      fileContent = fs.readFileSync(launchPath, 'utf-8');
      launchJson = jsonc.parse(fileContent);
    } catch (error) {
      console.error('Error reading launch.json:', error);
      // Continue with default launch.json if there's an error
    }
  }
  
  // If the file doesn't exist or is empty, initialize it
  if (!fileContent) {
    fileContent = JSON.stringify(launchJson, null, 4);
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
    const configurations = [...launchJson.configurations, newTestConfig];
    const modifications = jsonc.modify(fileContent, ['configurations'], configurations, { formattingOptions: { tabSize: 4, insertSpaces: true } });
    fileContent = jsonc.applyEdits(fileContent, modifications);
    
    // Write the updated launch.json
    fs.writeFileSync(launchPath, fileContent, 'utf-8');
    
    console.log(`Added test configuration "${newTestConfig.name}" to launch.json`);
  }
}

/**
 * Start the test session with or without debugging
 */
async function startTest(useDebugger: boolean): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    throw new Error('No workspace folder opened');
  }
  
  // Get all launch configurations
  const launchPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
  if (!fs.existsSync(launchPath)) {
    vscode.window.showErrorMessage('No launch.json found. Please create a debug configuration first.');
    return;
  }
  
  const launchConfig = jsonc.parse(fs.readFileSync(launchPath, 'utf-8'));
  
  // Find a test configuration
  const testConfig = launchConfig.configurations.find((config: any) => 
    config.name.endsWith('-test')
  );
  
  if (!testConfig) {
    throw new Error('No test configuration found in launch.json');
  }
  
  // Start with or without debugging based on parameter
  console.log(`Starting ${useDebugger ? 'debugging' : 'running'} with test configuration: ${testConfig.name}`);
  
  if (useDebugger) {
    await vscode.debug.startDebugging(workspaceFolder, testConfig.name);
  } else {
    await vscode.debug.startDebugging(workspaceFolder, testConfig.name, { noDebug: true });
  }
}

export function deactivate() {} 