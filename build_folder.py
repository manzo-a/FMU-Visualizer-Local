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
    "share", 
    "PIL", 
    "pytest",
    "unittest",
    "difflib",
    "doctest",
    "email",
    "html",
    "http", 
    "multiprocessing", 
] 

# Construct the arguments
args = [
    main_script,
    f"--name={app_name}",
    "--onedir",      # CHANGE: Create a folder instead of one file
    "--noconsole",
    "--clean",
]

for source in datas:
    args.append(f"--add-data={source}")

for module in hidden_imports:
    args.append(f"--hidden-import={module}")

for module in excludes:
    args.append(f"--exclude-module={module}")

print("🚀 Building Folder-based Executable with PyInstaller...")
print(f"Command arguments: {args}")

# Run PyInstaller
PyInstaller.__main__.run(args)

print(f"✅ Build complete! Check the 'dist/{app_name}' folder.")
