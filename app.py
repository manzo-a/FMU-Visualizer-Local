# app.py — Punto de entrada del simulador web (Eel)
# Conecta el frontend HTML/JS con la simulación FMU en Python.

import os
import eel
from fmpy import read_model_description
from simulador_fmu import run_fmu_simulation

# ── Configuración ────────────────────────────────────────────────
import sys

# Determine the base path for resources
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    if hasattr(sys, '_MEIPASS'):
        # --onefile mode
        base_path = sys._MEIPASS
    else:
        # --onedir mode
        base_path = os.path.dirname(sys.executable)
else:
    # Running in a normal Python environment
    base_path = os.path.dirname(__file__)

# Inicializar Eel apuntando a la carpeta web/
eel.init(os.path.join(base_path, "web"))

# FMU file path needs to be absolute or relative to CWD?
# read_model_description usually takes a file path.
# When frozen, the FMU is in base_path.
FMU_FILE = os.path.join(base_path, "SpringDamperSystem_FULLME.fmu")


# ── Funciones expuestas al frontend ─────────────────────────────
@eel.expose
def obtener_variables_fmu():
    """
    Lee el modelDescription.xml del FMU y devuelve todas las variables
    agrupadas por componente, para generar la UI dinámica.
    """
    try:
        md = read_model_description(FMU_FILE)
        variables = []
        for v in md.modelVariables:
            if v.causality not in ('parameter', 'local'):
                continue
            # Solo parámetros y locales con start value (configurables)
            if v.causality == 'local' and v.start is None:
                continue
            variables.append({
                "name": v.name,
                "causality": v.causality,
                "type": v.type,
                "start": v.start,
                "description": v.description or "",
            })
        return {
            "success": True,
            "modelName": md.modelName,
            "variables": variables,
        }
    except Exception as e:
        print(f"ERROR en obtener_variables_fmu(): {e}")
        return {"success": False, "error": str(e)}


@eel.expose
def simular(start_values, stop_time, step_size, solver):
    """
    Ejecuta la simulación del FMU con los parámetros recibidos
    desde el frontend y devuelve los resultados como dict JSON.
    start_values: dict con nombre_variable → valor numérico.
    """
    # Convertir valores string a float donde corresponda
    typed_values = {}
    for k, v in start_values.items():
        try:
            typed_values[k] = float(v)
        except (ValueError, TypeError):
            typed_values[k] = v

    # Resolver step_size nulo (paso adaptativo)
    actual_step = step_size if step_size and step_size > 0 else None

    try:
        results = run_fmu_simulation(
            fmu_filename=FMU_FILE,
            start_values=typed_values,
            stop_time=stop_time,
            step_size=actual_step,
            solver=solver,
        )

        if len(results) == 0:
            return {"success": False, "error": "La simulación no produjo resultados."}

        # Convertir a listas Python estándar (JSON-serializable)
        return {
            "success": True,
            "num_steps": len(results),
            "time": results["time"].tolist(),
            "x": results["x"].tolist(),
            "y": results["y"].tolist(),
            "z": results["z"].tolist(),
        }

    except Exception as e:
        print(f"ERROR en simular(): {e}")
        return {"success": False, "error": str(e)}


# ── Lanzar aplicación ────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 Iniciando Simulador MRA…")
    eel.start("main.html", size=(1280, 800), mode="edge")
