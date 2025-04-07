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

## [1.1.0] - 2024-04-XX

### Added
- New Deploy Commands panel feature to launch deployment operations
- Tree view for displaying deploy commands from a configurable Python file
- Support for running and debugging deploy commands
- Example deploy file with sample OPTIONS dictionary

### Changed
- Updated README with documentation for the deploy commands feature

## [1.0.7] - 2024-XX-XX

### Fixed
- Fixed handling of test method detection when cursor is inside a nested function
