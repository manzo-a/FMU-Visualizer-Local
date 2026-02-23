# simulador_fmu.py
# Este módulo se encarga exclusivamente de la lógica de simulación del FMU.
# Copiado del proyecto Qt original — funciona de manera independiente.

import numpy as np
from fmpy import simulate_fmu

# --- CONFIGURACIÓN PREDETERMINADA DE LA SIMULACIÓN ---
DEFAULT_STOP_TIME = 10.0
DEFAULT_STEP_SIZE = None  # None = FMPy usa paso adaptativo
DEFAULT_SOLVER = 'CVode'

AVAILABLE_SOLVERS = ['CVode', 'Euler']

# Variables de salida del FMU
OUTPUT_VARIABLES = [
    "body1.r_0[1]",  # Posición en X
    "body1.r_0[2]",  # Posición en Y
    "body1.r_0[3]",  # Posición en Z
]


def run_fmu_simulation(fmu_filename: str, start_values: dict,
                       stop_time: float = None,
                       step_size: float = None,
                       solver: str = None):
    """
    Ejecuta una simulación de un FMU y formatea los resultados.

    Args:
        fmu_filename: Ruta al archivo .fmu
        start_values: Diccionario con parámetros de entrada
        stop_time: Tiempo de simulación en segundos
        step_size: Tamaño del paso de integración
        solver: Solver a usar ('CVode' o 'Euler')

    Returns:
        np.ndarray con campos ('time', 'x', 'y', 'z')
    """
    actual_stop_time = stop_time if stop_time is not None else DEFAULT_STOP_TIME
    actual_solver = solver if solver is not None else DEFAULT_SOLVER
    actual_step_size = step_size if step_size is not None else DEFAULT_STEP_SIZE

    print(f"Iniciando simulación de '{fmu_filename}'")
    print(f"  Parámetros FMU: {start_values}")
    print(f"  Tiempo: {actual_stop_time}s, Paso: {actual_step_size}, Solver: {actual_solver}")

    dtype_for_animation = np.dtype([('time', 'f8'), ('x', 'f8'), ('y', 'f8'), ('z', 'f8')])

    try:
        sim_kwargs = {
            'filename': fmu_filename,
            'stop_time': actual_stop_time,
            'solver': actual_solver,
            'output': OUTPUT_VARIABLES,
            'start_values': start_values
        }

        if actual_step_size is not None:
            sim_kwargs['output_interval'] = actual_step_size

        raw_results = simulate_fmu(**sim_kwargs)
        print("Simulación FMU completada con éxito.")

        num_steps = len(raw_results['time'])
        results = np.zeros(num_steps, dtype=dtype_for_animation)

        results['time'] = raw_results['time']
        results['x'] = raw_results[OUTPUT_VARIABLES[0]]
        results['y'] = raw_results[OUTPUT_VARIABLES[1]]
        results['z'] = raw_results[OUTPUT_VARIABLES[2]]

        return results

    except Exception as e:
        print(f"ERROR: No se pudo completar la simulación. Detalles: {e}")
        return np.array([], dtype=dtype_for_animation)
