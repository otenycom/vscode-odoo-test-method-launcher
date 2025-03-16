# Odoo Test Method Launcher by Oteny.com

Odoo Test Method Launcher is a Visual Studio Code / Cursor extension developed by Oteny.com, designed to make running Odoo tests easier. It allows you to quickly run a specific test method directly from your code editor with a simple keyboard shortcut.

## Features

- Automatically detects the current test method based on your cursor position in Python files
- Launches the debugger with the appropriate test configuration
- Updates `.vscode/settings.json` with the correct test method name in the `odoo.testTags` property
- Creates or updates a test configuration in `.vscode/launch.json` if needed
- Works with standard Odoo test classes (like `TransactionCase`)

## Usage

1. Open a Python file containing Odoo test methods
2. Place your cursor within a test method (or on the method definition line)
3. Press `F5` to debug the test method or `Ctrl+F5` to run without debugging
4. The extension will:
   - Identify the current test method (starting with "def test_").
   - If your cursor is not on a test method the extension will fall back to the standard start/debug behavior of VSCode.
   - Update `.vscode/settings.json` with the test method name (as `.test_method_name`)
   - Ensure a launch configuration named `*-test` exists in `.vscode/launch.json`
   - Lauch Odoo using the "-test" launch configuration. Note that the -test launch configuration is used even if the launch configuration selected in the "Run and Debug" pane is different. This behavior reduces the need for the user to manually switch between launch configurations for testing and regular Odoo startups.

## Extension Commands

This extension contributes the following commands:

- `oteny-run-odoo-test.debugCurrentTest`: Debug Current Odoo Test Method (F5)
- `oteny-run-odoo-test.runCurrentTest`: Run Current Odoo Test Method without Debugging (Ctrl+F5)

## How It Works

The extension:

1. Identifies the current method by searching backward from the cursor position for a method definition
2. Updates the `odoo.testTags` property in your `.vscode/settings.json` file with the current method name prefixed with a dot (e.g., `.test_method_name`)
3. Ensures there's a debug configuration in `.vscode/launch.json` that:
   - Is based on your existing launch configuration
   - Has `-test` appended to the name
   - Includes the necessary test arguments (`--test-enable`, `--test-tags=${config:odoo.testTags}`, `--limit-time-real 0`)
4. Launches the debugger with this test configuration

## Example Configuration Files

### Example `launch.json`

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "odoo",
            "type": "debugpy",
            "request": "launch",
            "cwd": "${workspaceRoot}",
            "python": "${workspaceRoot}/path/to/venv/bin/python3",
            "program": "${workspaceRoot}/path/to/odoo/odoo-bin",
            "args": [
                "--addons-path=${config:odoo.addonsPath}",
                "-d",
                "${config:odoo.database}",
                "-r",
                "${config:odoo.user}",
                "-w",
                "${config:odoo.password}"
            ]
        },
        {
            "name": "odoo-test",
            "type": "debugpy",
            "request": "launch",
            "cwd": "${workspaceRoot}",
            "python": "${workspaceRoot}/path/to/venv/bin/python3",
            "program": "${workspaceRoot}/path/to/odoo/odoo-bin",
            "args": [
                "--addons-path=${config:odoo.addonsPath}",
                "--test-enable",
                "--test-tags=${config:odoo.testTags}",
                "-d",
                "${config:odoo.database}",
                "-r",
                "${config:odoo.user}",
                "-w",
                "${config:odoo.password}",
                "--limit-time-real",
                "0"
            ]
        }
    ]
}
```

### Example `settings.json`

```json
{
    "odoo": {
        "database": "odoo_db",
        "user": "odoo",
        "password": "password",
        "addonsPath": "/path/to/addons,/path/to/custom/addons",
        "testTags": ".test_method_name"
    }
}
```

The extension will automatically update the `odoo.testTags` value in your settings.json when you run a test, and will create the test configuration in launch.json if it doesn't already exist.

## Why Use `settings.json` for Test Configuration?

Using `settings.json` for test-specific configuration offers several advantages:

- **Developer-specific settings**: The `.vscode/settings.json` file is typically added to `.gitignore`, making it local to each developer's environment. This means each developer can have their own test configuration without affecting others.

- **Avoiding merge conflicts**: Since `settings.json` isn't typically committed to version control, you won't encounter merge conflicts when multiple developers are working on different tests simultaneously.

- **Separation of concerns**: By keeping the test method selection in `settings.json` and referencing it from `launch.json`, we maintain a clean separation between the debugger configuration (shared across the team) and the specific test being run (individual to each developer).

- **Quick switching**: This approach allows you to quickly switch between different test methods without modifying shared configuration files, making your workflow more efficient.

The extension handles all the necessary updates to `settings.json` automatically, so you can focus on writing and testing your code.

## About Oteny.com

Oteny.com specializes in Odoo development tools and services. This extension is part of our commitment to improving the Odoo development experience for the community.

## License

[MIT](LICENSE)
