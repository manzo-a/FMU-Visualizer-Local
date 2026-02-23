# Simulador Web - Dinámica de Sistemas Físicos

Este repositorio contiene un simulador interactivo diseñado para la enseñanza de la Dinámica de Sistemas Físicos, específicamente enfocado en el sistema Masa-Resorte-Amortiguador (MRA).

La aplicación utiliza un modelo FMU (Functional Mock-up Unit) desarrollado previamente y lo integra en una interfaz web amigable, permitiendo a los estudiantes visualizar la simulación tanto en gráficos 2D como en un entorno 3D interactivo en tiempo real.

## Características Principales

- **Simulación FMU Integrada**: Ejecuta el archivo `SpringDamperSystem_FULLME.fmu` para obtener resultados físicamente precisos del sistema mecánico.
- **Interfaz Web Interactiva**: Desarrollada en HTML, CSS y JavaScript para que la parametrización de variables físicas (masa, constante del resorte, coeficiente de amortiguación) sea intuitiva.
- **Visualización 3D**: Representación gráfica del sistema físico en tiempo real utilizando WebGL/Three.js.
- **Gráficos Dinámicos**: Plot de posición frente al tiempo mostrando paso a paso el comportamiento del sistema.
- **Empaquetado Standalone**: Preparado para ser compilado en un archivo ejecutable (`.exe`) fácilmente distribuible a los estudiantes sin necesidad de instalar Python ni dependencias complejas.

## Tecnologías Utilizadas

- **Backend**: Python 3.x
- **Framework Web/Desktop**: [Eel](https://github.com/python-eel/Eel) (Comunica Python con el frontend web)
- **Motor de Simulación**: `fmpy` (Para lectura y ejecución de modelos FMU en Python)
- **Frontend**: HTML5, CSS3, JavaScript puro

## Requisitos de Instalación (Modo Desarrollo / Docente)

Si deseas clonar este repositorio y ejecutar el código fuente o modificarlo, asegúrate de tener Python instalado y ejecutar los siguientes comandos en tu terminal:

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 2. Entrar a la carpeta del proyecto
cd TU_REPOSITORIO

# 3. Instalar las librerías necesarias
pip install -r requirements.txt
```

## Ejecución desde el Código Fuente

Para iniciar el simulador desde el código de desarrollo, simplemente ejecuta:

```bash
python app.py
```
Esto abrirá de forma automática la interfaz gráfica en una ventana dedicada de tu navegador web predeterminado.

## Compilación (Crear el ejecutable para estudiantes)

Para distribuir la aplicación a los estudiantes de manera sencilla, puedes compilar el código fuente para generar un ejecutable (.exe) de Windows. Necesitarás tener instalada la librería `pyinstaller` (se instala con `pip install pyinstaller`).

El repositorio incluye utilidades para hacer esto automáticamente:

```bash
# Opción A: Compilar en modo "un solo archivo" (genera un único .exe)
python build.py

# Opción B: Compilar en modo "carpeta" (recomendado si los estudiantes experimentan 
# bloqueos o falsos positivos con sus programas antivirus)
python build_folder.py
```

Los ejecutables compilados se generarán dentro de una nueva subcarpeta llamada `dist/`. Solo debes comprimir el contenido de esa carpeta en un `.zip` y compartirlo (o subirlo a los "Releases" de GitHub). También puedes utilizar las rutinas `clean_build.bat` si requieres limpiar los archivos temporales antes de compilar nuevamente.

## Licencia

Este proyecto se distribuye bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
