// ===================================================================
// app.js — Main Application Logic
// Connects UI controls ↔ Eel (Python) ↔ Three.js ↔ Chart.js
// ===================================================================

(() => {
    // --- State ---
    let simulationData = null;  // { time: [], x: [], y: [], z: [] }
    let isPlaying = false;
    let animationStartTime = 0;
    let animFrameId = null;

    // Variable picker state
    let fmuVariables = [];           // Full list from backend
    let pinnedVarNames = new Set();  // Names of pinned variables
    let pinnedInputs = {};           // { varName: HTMLInputElement }
    let variableDefaults = {};       // { varName: defaultStringValue }

    // --- DOM Elements ---
    const massSlider = document.getElementById('massSlider');
    const dampingSlider = document.getElementById('dampingSlider');
    const posSlider = document.getElementById('posSlider');
    const massValueEl = document.getElementById('massValue');
    const dampingValueEl = document.getElementById('dampingValue');
    const posValueEl = document.getElementById('posValue');
    const stopTimeInput = document.getElementById('stopTimeInput');
    const stepSizeInput = document.getElementById('stepSizeInput');
    const solverSelect = document.getElementById('solverSelect');
    const btnSimular = document.getElementById('btnSimular');
    const btnPlay = document.getElementById('btnPlay');
    const btnStop = document.getElementById('btnStop');
    const btnReset = document.getElementById('btnReset');
    const playbackTime = document.getElementById('playbackTime');
    const statusBadge = document.getElementById('statusBadge');
    const toastContainer = document.getElementById('toastContainer');
    const pinnedContainer = document.getElementById('pinnedVarsContainer');

    // Modal DOM
    const btnOpenPicker = document.getElementById('btnOpenVarPicker');
    const modalOverlay = document.getElementById('varPickerModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnDoneModal = document.getElementById('btnDoneModal');
    const varSearchInput = document.getElementById('varSearchInput');
    const modalVarGroups = document.getElementById('modalVarGroups');
    const modalLoading = document.getElementById('modalLoading');
    const selectedCountEl = document.getElementById('selectedCount');

    // --- Initialize ---
    function init() {
        Scene3D.init('canvas3d');
        ChartModule.init('chartCanvas');

        Scene3D.setMassScale(parseFloat(massSlider.value));
        Scene3D.setMassPosition(parseFloat(posSlider.value));
        Scene3D.setInitialPositionIndicator(parseFloat(posSlider.value));

        _bindSliders();
        _bindButtons();
        _bindModal();

        console.log('✅ Simulador MRA inicializado');
    }

    // --- Slider Bindings ---
    function _bindSliders() {
        massSlider.addEventListener('input', () => {
            const val = parseFloat(massSlider.value);
            massValueEl.textContent = val.toFixed(1);
            Scene3D.setMassScale(val);
        });

        dampingSlider.addEventListener('input', () => {
            const val = parseFloat(dampingSlider.value);
            dampingValueEl.textContent = val.toFixed(1);
        });

        posSlider.addEventListener('input', () => {
            const val = parseFloat(posSlider.value);
            posValueEl.textContent = val.toFixed(1);
            Scene3D.setMassPosition(val);
            Scene3D.setInitialPositionIndicator(val);
        });
    }

    // --- Button Bindings ---
    function _bindButtons() {
        btnSimular.addEventListener('click', _onSimulate);
        btnPlay.addEventListener('click', _onPlay);
        btnStop.addEventListener('click', _onStop);
        btnReset.addEventListener('click', _onReset);
    }

    // =====================================================================
    //  VARIABLE PICKER MODAL
    // =====================================================================

    function _bindModal() {
        btnOpenPicker.addEventListener('click', _openModal);
        btnCloseModal.addEventListener('click', _closeModal);
        btnDoneModal.addEventListener('click', _applySelection);
        varSearchInput.addEventListener('input', _onSearchModalVars);

        // Close on backdrop click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) _closeModal();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalOverlay.classList.contains('open')) {
                _closeModal();
            }
        });
    }

    async function _openModal() {
        modalOverlay.classList.add('open');
        varSearchInput.value = '';

        // Load variables if not yet loaded
        if (fmuVariables.length === 0) {
            modalLoading.style.display = 'flex';

            try {
                const result = await eel.obtener_variables_fmu()();
                if (result.success) {
                    fmuVariables = result.variables;
                    _showToast('success', 'Variables cargadas',
                        `${fmuVariables.length} variables encontradas en "${result.modelName}".`);
                } else {
                    _showToast('error', 'Error cargando variables', result.error);
                    _closeModal();
                    return;
                }
            } catch (err) {
                _showToast('error', 'Error de conexión',
                    'No se pudieron obtener las variables del FMU.');
                _closeModal();
                return;
            }

            modalLoading.style.display = 'none';
        }

        _buildModalGroups();
        _updateSelectedCount();
        varSearchInput.focus();
    }

    function _closeModal() {
        modalOverlay.classList.remove('open');
    }

    /** Build the grouped variable list inside the modal with checkboxes */
    function _buildModalGroups() {
        modalVarGroups.innerHTML = '';

        // Group by component prefix
        const groups = {};
        for (const v of fmuVariables) {
            const dotIdx = v.name.indexOf('.');
            const groupName = dotIdx > 0 ? v.name.substring(0, dotIdx) : '_other';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(v);
        }

        for (const groupName of Object.keys(groups).sort()) {
            const vars = groups[groupName];
            const groupEl = document.createElement('div');
            groupEl.className = 'var-group';
            groupEl.dataset.groupName = groupName;

            // Count how many in this group are already pinned
            const pinnedInGroup = vars.filter(v => pinnedVarNames.has(v.name)).length;

            const header = document.createElement('div');
            header.className = 'var-group__header';
            header.innerHTML = `
                <span class="var-group__arrow">▶</span>
                <span>${groupName}</span>
                <span class="var-group__count ${pinnedInGroup > 0 ? 'var-group__count--active' : ''}">${pinnedInGroup > 0 ? pinnedInGroup + '/' : ''}${vars.length}</span>
            `;
            header.addEventListener('click', () => groupEl.classList.toggle('open'));

            const body = document.createElement('div');
            body.className = 'var-group__body';

            for (const v of vars) {
                const shortName = v.name.substring(groupName.length + 1) || v.name;
                const badgeClass = v.causality === 'parameter' ? 'param' : 'local';
                const badgeText = v.causality === 'parameter' ? 'P' : 'L';
                const defaultStr = v.start !== null && v.start !== undefined ? v.start : '—';

                // Store default
                variableDefaults[v.name] = v.start;

                const row = document.createElement('div');
                row.className = 'var-row';
                row.dataset.varName = v.name;
                row.innerHTML = `
                    <input type="checkbox" class="var-row__checkbox"
                           ${pinnedVarNames.has(v.name) ? 'checked' : ''}
                           data-var-name="${v.name}">
                    <span class="var-row__badge var-row__badge--${badgeClass}">${badgeText}</span>
                    <span class="var-row__name" title="${v.name}\n${v.description}">${shortName}</span>
                    <span class="var-row__default">${defaultStr}</span>
                `;

                // Toggle on row click (not just checkbox)
                row.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const cb = row.querySelector('.var-row__checkbox');
                        cb.checked = !cb.checked;
                    }
                    _updateSelectedCount();
                });

                body.appendChild(row);
            }

            groupEl.appendChild(header);
            groupEl.appendChild(body);
            modalVarGroups.appendChild(groupEl);
        }
    }

    function _updateSelectedCount() {
        const checked = modalVarGroups.querySelectorAll('.var-row__checkbox:checked');
        selectedCountEl.textContent = `${checked.length} seleccionada${checked.length !== 1 ? 's' : ''}`;
    }

    function _onSearchModalVars() {
        const query = varSearchInput.value.toLowerCase().trim();
        modalVarGroups.querySelectorAll('.var-group').forEach(groupEl => {
            let groupVisible = false;
            groupEl.querySelectorAll('.var-row').forEach(row => {
                const match = !query || row.dataset.varName.toLowerCase().includes(query);
                row.style.display = match ? '' : 'none';
                if (match) groupVisible = true;
            });
            groupEl.style.display = groupVisible ? '' : 'none';
            if (query && groupVisible) groupEl.classList.add('open');
        });
    }

    /** User clicked "Aplicar selección" — sync pinned vars */
    function _applySelection() {
        // Gather newly checked variable names
        const newPinnedNames = new Set();
        modalVarGroups.querySelectorAll('.var-row__checkbox:checked').forEach(cb => {
            newPinnedNames.add(cb.dataset.varName);
        });

        // Remove pins that were unchecked
        for (const name of [...pinnedVarNames]) {
            if (!newPinnedNames.has(name)) {
                _unpinVariable(name, false);
            }
        }

        // Add newly checked pins
        for (const name of newPinnedNames) {
            if (!pinnedVarNames.has(name)) {
                _pinVariable(name);
            }
        }

        _closeModal();

        const count = pinnedVarNames.size;
        if (count > 0) {
            _showToast('success', 'Variables configuradas',
                `${count} variable${count !== 1 ? 's' : ''} disponible${count !== 1 ? 's' : ''} para modificar en el panel.`);
        }
    }

    // =====================================================================
    //  PINNED VARIABLES (inside parameters card)
    // =====================================================================

    function _pinVariable(varName) {
        pinnedVarNames.add(varName);

        const defaultVal = variableDefaults[varName];
        const row = document.createElement('div');
        row.className = 'pinned-var';
        row.dataset.varName = varName;

        // Short display name
        const dotIdx = varName.indexOf('.');
        const shortName = dotIdx > 0 ? varName.substring(dotIdx + 1) : varName;

        row.innerHTML = `
            <span class="pinned-var__name" title="${varName}">${shortName}</span>
            <input type="number" class="pinned-var__input"
                   value="${defaultVal !== null && defaultVal !== undefined ? defaultVal : ''}"
                   data-default="${defaultVal !== null && defaultVal !== undefined ? defaultVal : ''}"
                   data-var-name="${varName}"
                   step="any">
            <button class="pinned-var__unpin" title="Quitar variable">✕</button>
        `;

        const input = row.querySelector('.pinned-var__input');
        pinnedInputs[varName] = input;

        // Track modification
        input.addEventListener('input', () => {
            input.classList.toggle('modified', input.value !== input.dataset.default);
        });

        // Unpin button
        row.querySelector('.pinned-var__unpin').addEventListener('click', () => {
            _unpinVariable(varName, true);
        });

        pinnedContainer.appendChild(row);
    }

    function _unpinVariable(varName, updateCheckbox) {
        pinnedVarNames.delete(varName);
        delete pinnedInputs[varName];

        const row = pinnedContainer.querySelector(`.pinned-var[data-var-name="${varName}"]`);
        if (row) row.remove();

        // Also uncheck in modal if it's open
        if (updateCheckbox) {
            const cb = modalVarGroups.querySelector(`.var-row__checkbox[data-var-name="${varName}"]`);
            if (cb) cb.checked = false;
        }
    }

    // =====================================================================
    //  SIMULATE
    // =====================================================================

    function _buildStartValues() {
        // Always include the basic sliders
        const values = {
            'body1.m': parseFloat(massSlider.value),
            'damper1.d': parseFloat(dampingSlider.value),
            'body1.frame_a.r_0[2]': parseFloat(posSlider.value),
        };

        // Add pinned variable values
        for (const [varName, input] of Object.entries(pinnedInputs)) {
            if (input.value !== '' && input.value !== input.dataset.default) {
                values[varName] = input.value;
            }
        }

        return values;
    }

    async function _onSimulate() {
        btnSimular.disabled = true;
        btnSimular.innerHTML = '<span class="btn__icon">⏳</span> Simulando...';
        statusBadge.classList.add('simulating');
        statusBadge.querySelector('span:last-child').textContent = 'Simulando...';

        _onStop();

        try {
            const startValues = _buildStartValues();

            const result = await eel.simular(
                startValues,
                parseFloat(stopTimeInput.value) || 10.0,
                parseFloat(stepSizeInput.value) || null,
                solverSelect.value
            )();

            if (result.success) {
                simulationData = result;
                console.log(`✅ Simulación exitosa: ${result.num_steps} pasos`);

                // Load data but don't show it yet (progressive reveal)
                ChartModule.setFullData(result.time, result.y);
                ChartModule.showUpToTime(0); // Show just the first point
                Scene3D.setMassPosition(result.y[0]);

                statusBadge.querySelector('span:last-child').textContent = `${result.num_steps} pasos`;

                _showToast('success', 'Simulación exitosa',
                    `Se completaron ${result.num_steps} pasos en ${result.time[result.time.length - 1].toFixed(1)}s de tiempo simulado.`);
            } else {
                console.error('❌ Simulación falló:', result.error);
                statusBadge.querySelector('span:last-child').textContent = 'Error';

                _showToast('error', 'Error en la simulación',
                    result.error || 'La simulación no produjo resultados.');
            }
        } catch (err) {
            console.error('Error llamando a Python:', err);
            statusBadge.querySelector('span:last-child').textContent = 'Error de conexión';

            _showToast('error', 'Error de conexión',
                'No se pudo comunicar con el backend. Verifique que el servidor esté corriendo.');
        }

        statusBadge.classList.remove('simulating');
        btnSimular.disabled = false;
        btnSimular.innerHTML = '<span class="btn__icon">▶</span> Ejecutar Simulación';
    }

    // --- Playback ---
    function _onPlay() {
        if (!simulationData || simulationData.time.length === 0) {
            console.warn('No hay simulación cargada. Ejecute primero.');
            return;
        }

        if (isPlaying) {
            _onStop();
            return;
        }

        isPlaying = true;
        btnPlay.textContent = '⏸';
        btnPlay.classList.add('playing');

        ChartModule.setFullData(simulationData.time, simulationData.y);

        const stopTime = simulationData.time[simulationData.time.length - 1];
        ChartModule.clear(stopTime);

        animationStartTime = performance.now();
        _animationLoop();
    }

    function _animationLoop() {
        if (!isPlaying) return;

        const elapsed = (performance.now() - animationStartTime) / 1000.0;
        const totalTime = simulationData.time[simulationData.time.length - 1];

        if (elapsed >= totalTime) {
            const lastIdx = simulationData.time.length - 1;
            Scene3D.setMassPosition(simulationData.y[lastIdx]);
            ChartModule.showUpToTime(totalTime);
            playbackTime.textContent = totalTime.toFixed(2) + 's';
            _onStop();

            ChartModule.showAll();
            return;
        }

        let idx = 0;
        for (let i = 0; i < simulationData.time.length; i++) {
            if (simulationData.time[i] <= elapsed) {
                idx = i;
            } else {
                break;
            }
        }

        Scene3D.setMassPosition(simulationData.y[idx]);
        ChartModule.showUpToTime(elapsed);
        playbackTime.textContent = elapsed.toFixed(2) + 's';

        animFrameId = requestAnimationFrame(_animationLoop);
    }

    function _onStop() {
        isPlaying = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        btnPlay.textContent = '▶';
        btnPlay.classList.remove('playing');
    }

    function _onReset() {
        _onStop();
        playbackTime.textContent = '0.00s';

        if (simulationData && simulationData.y.length > 0) {
            Scene3D.setMassPosition(simulationData.y[0]);
            ChartModule.showUpToTime(0); // Reset to start (hide trace)
        } else {
            Scene3D.setMassPosition(parseFloat(posSlider.value));
            ChartModule.clear(parseFloat(stopTimeInput.value) || 10);
        }
    }

    // --- Toast Notifications ---
    function _showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const icon = type === 'success' ? '✓' : '✕';
        toast.innerHTML = `
            <div class="toast__icon">${icon}</div>
            <div class="toast__content">
                <div class="toast__title">${title}</div>
                <div class="toast__message">${message}</div>
            </div>
            <button class="toast__close" aria-label="Cerrar">×</button>
            <div class="toast__progress"></div>
        `;

        toast.querySelector('.toast__close').addEventListener('click', () => _dismissToast(toast));
        toastContainer.appendChild(toast);

        const timer = setTimeout(() => _dismissToast(toast), 4000);
        toast._timer = timer;
    }

    function _dismissToast(toast) {
        if (toast._dismissed) return;
        toast._dismissed = true;
        clearTimeout(toast._timer);
        toast.classList.add('toast--exit');
        toast.addEventListener('animationend', () => toast.remove());
    }

    // --- Start ---
    document.addEventListener('DOMContentLoaded', init);
})();
