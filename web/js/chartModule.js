// ===================================================================
// chartModule.js — Chart.js Graph for Position vs Time
// ===================================================================

const ChartModule = (() => {
    let chart = null;
    let animationDataset = [];

    function init(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Posición Y (m)',
                    data: [],
                    borderColor: '#4a9eff',
                    backgroundColor: 'rgba(74, 158, 255, 0.1)',
                    borderWidth: 2.0,
                    pointRadius: 0,        // Hide points for clean look
                    pointHoverRadius: 4,
                    tension: 0,            // No smoothing (linear interpolation) to show steps
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(30, 33, 48, 0.95)',
                        titleColor: '#9aa0b0',
                        bodyColor: '#e8eaed',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        titleFont: { family: 'Inter', size: 10, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12, weight: '700' },
                        callbacks: {
                            title: (items) => `t = ${items[0].parsed.x.toFixed(3)} s`,
                            label: (item) => `y = ${item.parsed.y.toFixed(4)} m`
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Tiempo (s)',
                            color: '#9aa0b0',
                            font: { family: 'Inter', size: 11, weight: '600' }
                        },
                        min: 0,
                        max: 10,
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawTicks: false },
                        ticks: { color: '#5f6577', font: { family: 'Inter', size: 10 }, padding: 6 },
                        border: { color: 'rgba(255, 255, 255, 0.08)' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Posición Y (m)',
                            color: '#9aa0b0',
                            font: { family: 'Inter', size: 11, weight: '600' }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.04)', drawTicks: false },
                        ticks: { color: '#5f6577', font: { family: 'Inter', size: 10 }, padding: 6 },
                        border: { color: 'rgba(255, 255, 255, 0.08)' }
                    }
                }
            }
        });
    }

    /** Load data for animation but DO NOT show it yet (prevents spoilers) */
    function setFullData(timeArr, yArr) {
        // Store for animation playback
        animationDataset = timeArr.map((t, i) => ({ x: t, y: yArr[i] }));

        // Auto-scale axes based on full data range
        const tMax = timeArr[timeArr.length - 1];
        chart.options.scales.x.max = tMax;

        const yMin = Math.min(...yArr);
        const yMax = Math.max(...yArr);
        const margin = (yMax - yMin) * 0.15 || 1;
        chart.options.scales.y.min = yMin - margin;
        chart.options.scales.y.max = yMax + margin;

        // Start empty
        chart.data.datasets[0].data = [];
        chart.update();
    }

    function clear(stopTime) {
        if (!chart) return;
        chart.data.datasets[0].data = [];
        chart.options.scales.x.max = stopTime || 10;
        chart.update();
    }

    function showUpToTime(elapsed) {
        if (!chart || animationDataset.length === 0) return;

        // Find the index that corresponds to elapsed time (binary search optimization is better for large arrays, but linear is ok for <10k)
        let idx = 0;
        // Optimization: start from last known index if we tracked it, but linear scan is safe/simple
        for (let i = 0; i < animationDataset.length; i++) {
            if (animationDataset[i].x <= elapsed) {
                idx = i;
            } else {
                break;
            }
        }

        // Show data up to this point
        chart.data.datasets[0].data = animationDataset.slice(0, idx + 1);
        chart.update('none'); // 'none' = no animation for performance
    }

    function showAll() {
        if (!chart || animationDataset.length === 0) return;
        chart.data.datasets[0].data = animationDataset;
        chart.update();
    }

    return {
        init,
        setFullData,
        clear,
        showUpToTime,
        showAll
    };
})();
