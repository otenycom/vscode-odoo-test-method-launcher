# Odoo Test Method Launcher

A Visual Studio Code extension that allows you to launch Odoo test methods directly from the editor.

## Features

- Right-click on a test method in a Python file to launch it directly in Odoo
- Configure Odoo path and configuration file through settings
- Supports running individual test methods or entire test classes

## Requirements

- Visual Studio Code 1.85.0 or higher
- Odoo installed on your system

## Extension Settings

This extension contributes the following settings:

* `odooTestMethodLauncher.odooPath`: Path to the Odoo executable
* `odooTestMethodLauncher.configPath`: Path to the Odoo configuration file

## How to Use

1. Open a Python test file (filename starting with `test_`)
2. Right-click on a test method or class
3. Select "Launch Odoo Test Method" from the context menu
4. The test will run in the integrated terminal

## Known Issues

Please report any issues on the GitHub repository.

## Release Notes

### 0.0.1

Initial release of Odoo Test Method Launcher 