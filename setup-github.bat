@echo off
echo Setting up AI Security Auditor project for GitHub deployment...
echo.

:: Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Git is not installed or not in PATH.
    echo Please install Git from https://git-scm.com/downloads
    exit /b 1
)

echo Creating GitHub repository...
echo.

:: Initialize git repository if not already
if not exist .git (
    git init
    echo Git repository initialized.
) else (
    echo Git repository already exists.
)

:: Add all files to git
git add .

:: Initial commit
git commit -m "Initial commit: AI Security Auditor MVP"

echo.
echo To push to GitHub, you need to:
echo 1. Create a new repository on GitHub
echo 2. Run the following commands:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo Replace YOUR_USERNAME and YOUR_REPO_NAME with your GitHub username and repository name.
echo.
echo Setup complete!