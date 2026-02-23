@echo off
echo 🚀 Setting up clean build environment for FOLDER build...

:: 1. Create Virtual Environment
python -m venv build_venv_folder

:: 2. Upgrade pip (optional but good)
build_venv_folder\Scripts\python -m pip install --upgrade pip

:: 3. Install ONLY necessary dependencies
echo 📦 Installing dependencies...
build_venv_folder\Scripts\python -m pip install eel fmpy numpy pyinstaller

:: 4. Run the FOLDER build script using the virtual environment's Python
echo 🔨 Building folder executable...
build_venv_folder\Scripts\python build_folder.py

:: 5. Cleanup (optional - comment out if you want to keep the env)
echo 🧹 Cleaning up environment...
rd /s /q build_venv_folder
if exist build rd /s /q build
del SimuladorWeb.spec

echo ✅ Done! Check the folder 'dist/SimuladorWeb'
pause
