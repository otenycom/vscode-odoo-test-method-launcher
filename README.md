# OdooRunTest

OdooRunTest is a Visual Studio Code extension designed to make running Odoo tests easier. It allows you to quickly run a specific test method directly from your code editor with a simple keyboard shortcut.

## Features

- Identify the current test method based on your cursor position in Python files
- Automatically update `.vscode/settings.json` with the correct test method name
- Ensure a test debug configuration exists in `.vscode/launch.json`
- Start the debugger with the appropriate test configuration

## Usage

1. Open a Python file containing Odoo test methods
2. Place your cursor within (or on the line of) the test method you want to run
3. Press `Ctrl+Alt+T` (or `Cmd+Alt+T` on macOS) 
4. The extension will:
   - Update `.vscode/settings.json` with the current test method
   - Ensure a test configuration exists in `.vscode/launch.json`
   - Start the debugger using this configuration

## Requirements

- Visual Studio Code 1.60.0 or higher
- An Odoo project with a properly configured `.vscode/settings.json` file

## Extension Settings

This extension contributes the following command:

* `odoo-runtest.runCurrentTest`: Run the current Odoo test method

## How It Works

The extension updates the `odoo.testTags` property in your `.vscode/settings.json` file with the current method name prefixed with a dot (e.g., `.test_method_name`). It then ensures there's a debug configuration that uses this setting to run the test.

## License

[MIT](LICENSE) 