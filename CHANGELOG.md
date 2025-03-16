# Change Log

List of notable changes to the "Odoo Test Method Launcher" VSCode extension

## [1.0.2] - 2025-03-15

- Initial release
- Added ability to launch a single Odoo test method by placing the caret in the method body and giving the 'Oteny: Run Current Odoo Test' command in the Command Pallete, or by pressing "option+command+T".

## [1.0.5] - 2025-03-15

- Added new command to run test method without debugging
- Modified existing command to run with debugging
- Added F5 and Ctrl+F5 keybindings matching standard VSCode behavior
- Added fallback to standard debugging behavior when no test method is found

## [1.0.6] - 2025-03-16

- Added logic to stop an existing debug session if it matches the current test configuration before starting a new test session
- Respect existing whitespace and comments in settings.json and launch.json
