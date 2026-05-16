# Scripts Guide

This folder contains build and development scripts for the PVRD Framework.

## Platform Support

### Linux/Mac
Use the **`.sh`** versions of the scripts directly from the terminal.

### Windows
Use the wrappers in `scripts/bat/`. They run the matching `.sh` scripts through WSL.

## Available Scripts

### build.sh / bat/build.bat
Builds and starts the Docker containers with no cache.

**Linux/Mac:**
```bash
./build.sh
```

**Windows (WSL wrapper):**
```batch
bat\build.bat
```

### start.sh / bat/start.bat
Starts the Docker containers.

**Linux/Mac:**
```bash
./start.sh
```

**Windows (WSL wrapper):**
```batch
bat\start.bat
```

### python_shell.sh / bat/python_shell.bat
Opens a Python interactive shell (IPython) in the API container.

**Linux/Mac:**
```bash
./python_shell.sh
```

**Windows (WSL wrapper):**
```batch
bat\python_shell.bat
```

### create_module.sh / bat/create_module.bat
Creates a new Django module for the framework.

**Linux/Mac:**
```bash
./create_module.sh <app_name>
```

**Windows (WSL wrapper):**
```batch
bat\create_module.bat <app_name>
```

### run_migration.sh / bat/run_migration.bat
Runs Django migrations for selected modules. You can either:
- Run without arguments for an interactive menu
- Pass app names or numbers as arguments

**Linux/Mac:**
```bash
# Interactive mode
./run_migration.sh

# Run all migrations
./run_migration.sh all

# Specific apps
./run_migration.sh app1 app2
```

**Windows (WSL wrapper):**
```batch
rem Interactive mode
bat\run_migration.bat

rem Run all migrations
bat\run_migration.bat all

rem Specific apps
bat\run_migration.bat app1 app2
```

## Running Scripts

### On Linux/Mac
Make sure you have execution permissions (they should already be set):
```bash
chmod +x *.sh
chmod +x util/*.sh
```

Then run any script:
```bash
./build.sh
./start.sh
./python_shell.sh
./create_module.sh my_app
./run_migration.sh
```

### On Windows with WSL wrappers
From Command Prompt or PowerShell, run the wrappers:
```batch
cd scripts
bat\build.bat
```

### On Windows using WSL directly
Open WSL terminal and run scripts the same way as Linux/Mac:
```bash
cd /mnt/c/path/to/pvrd_framework/scripts
./build.sh
```

## Troubleshooting

### Script not found or permission denied
If you get a "permission denied" error on Linux/Mac, make the script executable:
```bash
chmod +x script_name.sh
```

### Docker command not found
Ensure Docker is installed and running on your system.

### Container not found
Make sure you've run `start.sh` or `build.sh` first to start the containers.

## Requirements

- Docker and Docker Compose installed
- On Windows: WSL enabled (`wsl` command available)
- Python 3.8+ (for Django apps)
