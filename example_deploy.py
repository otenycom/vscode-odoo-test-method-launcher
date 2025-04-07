#!/usr/bin/env python3
"""
Example deploy script for VS Code Odoo Deploy Commands Extension.

This file contains the OPTIONS dictionary used by the extension to populate the
deploy commands view. Each option in the dictionary will appear as a clickable command.
"""

import sys
import argparse

# This dictionary will be parsed by the extension
# Keys are command names, values are arrays of:
# - Simple strings for single target commands
# - Arrays of [source, target] for transfer operations
OPTIONS = {
    "excel-to-staging": ["acc", "acc2"],
    "excel-to-main": ["prod"],
    "main-to-other": [["main", "acc"], ["main", "acc2"], ["main", "local"]],
    "staging-to-local": [["acc", "local"], ["acc2", "local"]],
    "create-reference-db": ["local"],
    "restore-reference-db": ["local"]
}

def main():
    """
    Main function to parse command line arguments and execute the appropriate action.
    
    Command line format:
    python example_deploy.py <command_key> <value>
    
    Example:
    python example_deploy.py excel-to-staging acc
    python example_deploy.py main-to-other main-acc
    """
    parser = argparse.ArgumentParser(description='Deploy command execution')
    parser.add_argument('command', help='Command key from OPTIONS dictionary')
    parser.add_argument('target', help='Target value or source-target pair')
    
    args = parser.parse_args()
    
    print(f"Running deploy command: {args.command} with target: {args.target}")
    
    # Parse the target
    if '-' in args.target:
        # This is a source-target pair
        source, target = args.target.split('-')
        print(f"Source: {source}, Target: {target}")
        # Add your implementation logic here
    else:
        # This is a single target
        print(f"Target: {args.target}")
        # Add your implementation logic here
    
    # Here you would implement the actual deployment logic
    # For example, executing database operations, file transfers, etc.
    
    print("Deployment completed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 