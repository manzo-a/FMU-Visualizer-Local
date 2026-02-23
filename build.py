import PyInstaller.__main__
import os

# Define the build parameters
app_name = "SimuladorWeb"
main_script = "app.py"

# Data files to include: (source, destination)
# On Windows, path separator for --add-data is ';'
# On Linux/Mac, it is ':'
sep = ';' if os.name == 'nt' else ':'

datas = [
    (f"web{sep}web"),  # Include the entire web folder
    (f"SpringDamperSystem_FULLME.fmu{sep}."), # Include the FMU file in the root
]

# Hidden imports that PyInstaller might miss
hidden_imports = [
    "eel",
    "fmpy",
    "numpy",
]

# Exclude unnecessary and conflicting modules
excludes = [
    "PyQt5",
    "PyQt6",
    "PySide2",
    "PySide6",
    "tkinter",
    "matplotlib",
    "pandas",
    "scipy",
    "notebook",
    "ipython",
    "ipykernel",
    "jedi",
    "share", # often pulls in big data deps
    "PIL", # Pillow, if not used
    "pytest",
    "unittest",
    "difflib",
    "doctest",
    "share", 
] # Add more as identified

# Construct the arguments
args = [
    main_script,
    f"--name={app_name}",
    "--onefile",
    "--noconsole",
    "--clean",
]

for source in datas:
    args.append(f"--add-data={source}")

for module in hidden_imports:
    args.append(f"--hidden-import={module}")

for module in excludes:
    args.append(f"--exclude-module={module}")

print("🚀 Building Executable with PyInstaller...")
print(f"Command arguments: {args}")

# Run PyInstaller
PyInstaller.__main__.run(args)

print(f"✅ Build complete! Check the 'dist' folder for {app_name}.exe")
