@echo off
echo 🚀 Setting up clean build environment...

:: 1. Create Virtual Environment
python -m venv build_venv

:: 2. Upgrade pip (optional but good)
build_venv\Scripts\python -m pip install --upgrade pip

:: 3. Install ONLY necessary dependencies
echo 📦 Installing dependencies...
build_venv\Scripts\python -m pip install eel fmpy numpy pyinstaller

:: 4. Run the build script using the virtual environment's Python
echo 🔨 Building executable...
build_venv\Scripts\python build.py

:: 5. Cleanup (optional - comment out if you want to keep the env)
echo 🧹 Cleaning up environment...
rd /s /q build_venv
if exist build rd /s /q build
del SimuladorWeb.spec

echo ✅ Done! Check 'dist/SimuladorWeb.exe'
pause
