/**
 * Graph Generator for SI Engine PV Diagram
 * Uses Chart.js for interactive graph rendering
 */

class GraphGenerator {
    constructor() {
        this.pvChart = null;
        this.pthetaChart = null;

        // Color palette for multiple loads
        this.loadColors = [
            { border: '#374151', background: 'rgba(55, 65, 81, 0.1)' },    // Gray
            { border: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' },  // Pink
            { border: '#10b981', background: 'rgba(16, 185, 129, 0.1)' },  // Green
            { border: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' },  // Amber
            { border: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }    // Red
        ];

        // Chart.js default options
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            size: 12,
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Inter', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.08)',
                        drawTicks: true
                    },
                    ticks: {
                        font: { size: 11 }
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        font: {
                            size: 14,
                            weight: 'bold',
                            family: "'Inter', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.08)',
                        drawTicks: true
                    },
                    ticks: {
                        font: { size: 11 }
                    },
                    beginAtZero: true
                }
            }
        };
    }

    /**
     * Initialize P-V Diagram Chart
     * @param {string} canvasId - Canvas element ID
     */
    initPVChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element '${canvasId}' not found`);
            return;
        }

        // Destroy existing chart if any
        if (this.pvChart) {
            this.pvChart.destroy();
        }

        const options = JSON.parse(JSON.stringify(this.defaultOptions));
        options.scales.x.title.text = 'Volume (cm³)';
        options.scales.y.title.text = 'Pressure (bar)';
        options.plugins.tooltip.callbacks = {
            label: function (context) {
                return `P: ${context.parsed.y.toFixed(2)} bar, V: ${context.parsed.x.toFixed(1)} cm³`;
            }
        };

        this.pvChart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [] },
            options: options
        });
    }

    /**
     * Initialize P-θ Diagram Chart
     * @param {string} canvasId - Canvas element ID
     */
    initPThetaChart(canvasId) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element '${canvasId}' not found`);
            return;
        }

        // Destroy existing chart if any
        if (this.pthetaChart) {
            this.pthetaChart.destroy();
        }

        const options = JSON.parse(JSON.stringify(this.defaultOptions));
        options.scales.x.title.text = 'Crank Angle (degrees)';
        options.scales.y.title.text = 'Pressure (bar)';
        options.scales.x.min = 0;
        options.scales.x.max = 720;
        options.scales.x.ticks = {
            stepSize: 90,
            callback: function (value) {
                const labels = {
                    0: '0° (TDC)',
                    180: '180° (BDC)',
                    360: '360° (TDC)',
                    540: '540° (BDC)',
                    720: '720° (TDC)'
                };
                return labels[value] || value + '°';
            },
            font: { size: 10 }
        };
        options.plugins.tooltip.callbacks = {
            label: function (context) {
                return `P: ${context.parsed.y.toFixed(2)} bar, θ: ${context.parsed.x.toFixed(0)}°`;
            }
        };

        // Add vertical lines for TDC/BDC
        options.plugins.annotation = {
            annotations: {
                tdc1: { type: 'line', xMin: 0, xMax: 0, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderDash: [5, 5] },
                bdc1: { type: 'line', xMin: 180, xMax: 180, borderColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderDash: [3, 3] },
                tdc2: { type: 'line', xMin: 360, xMax: 360, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderDash: [5, 5] },
                bdc2: { type: 'line', xMin: 540, xMax: 540, borderColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderDash: [3, 3] },
                tdc3: { type: 'line', xMin: 720, xMax: 720, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderDash: [5, 5] }
            }
        };

        this.pthetaChart = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [] },
            options: options
        });
    }

    /**
     * Update P-V Diagram with new data
     * @param {Array} datasets - Array of { label, data, colorIndex } objects
     */
    updatePVChart(datasets) {
        if (!this.pvChart) return;

        const chartDatasets = datasets.map((ds, index) => {
            const colorIdx = ds.colorIndex !== undefined ? ds.colorIndex : index;
            const colors = this.loadColors[colorIdx % this.loadColors.length];

            // Convert data to x-y format for scatter plot
            const points = ds.data.map(d => ({ x: d.volume, y: d.pressure }));

            return {
                label: ds.label,
                data: points,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                showLine: true,
                tension: 0.1,
                fill: false
            };
        });

        this.pvChart.data.datasets = chartDatasets;
        this.pvChart.update('none');
    }

    /**
     * Update P-θ Diagram with new data
     * @param {Array} datasets - Array of { label, data, colorIndex } objects
     */
    updatePThetaChart(datasets) {
        if (!this.pthetaChart) return;

        const chartDatasets = datasets.map((ds, index) => {
            const colorIdx = ds.colorIndex !== undefined ? ds.colorIndex : index;
            const colors = this.loadColors[colorIdx % this.loadColors.length];

            // Convert data to x-y format for scatter plot
            const points = ds.data.map(d => ({ x: d.theta, y: d.pressure }));

            return {
                label: ds.label,
                data: points,
                borderColor: colors.border,
                backgroundColor: colors.background,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                showLine: true,
                tension: 0.1,
                fill: false
            };
        });

        this.pthetaChart.data.datasets = chartDatasets;
        this.pthetaChart.update('none');
    }

    /**
     * Add marker at current position on P-V chart
     * @param {number} volume - Current volume
     * @param {number} pressure - Current pressure
     */
    addPVMarker(volume, pressure) {
        if (!this.pvChart) return;

        // Find or create marker dataset
        let markerDataset = this.pvChart.data.datasets.find(ds => ds.label === 'Current Position');

        if (!markerDataset) {
            markerDataset = {
                label: 'Current Position',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: '#dc2626',
                borderWidth: 0,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            };
            this.pvChart.data.datasets.push(markerDataset);
        }

        markerDataset.data = [{ x: volume, y: pressure }];
        this.pvChart.update('none');
    }

    /**
     * Add marker at current position on P-θ chart
     * @param {number} theta - Current crank angle
     * @param {number} pressure - Current pressure
     */
    addPThetaMarker(theta, pressure) {
        if (!this.pthetaChart) return;

        // Find or create marker dataset
        let markerDataset = this.pthetaChart.data.datasets.find(ds => ds.label === 'Current Position');

        if (!markerDataset) {
            markerDataset = {
                label: 'Current Position',
                data: [],
                borderColor: '#dc2626',
                backgroundColor: '#dc2626',
                borderWidth: 0,
                pointRadius: 8,
                pointHoverRadius: 10,
                showLine: false
            };
            this.pthetaChart.data.datasets.push(markerDataset);
        }

        markerDataset.data = [{ x: theta, y: pressure }];
        this.pthetaChart.update('none');
    }

    /**
     * Remove markers from charts
     */
    removeMarkers() {
        if (this.pvChart) {
            this.pvChart.data.datasets = this.pvChart.data.datasets.filter(ds => ds.label !== 'Current Position');
            this.pvChart.update('none');
        }
        if (this.pthetaChart) {
            this.pthetaChart.data.datasets = this.pthetaChart.data.datasets.filter(ds => ds.label !== 'Current Position');
            this.pthetaChart.update('none');
        }
    }

    /**
     * Export chart as PNG image
     * @param {string} chartType - 'pv' or 'ptheta'
     * @returns {string} Data URL of the image
     */
    exportChartImage(chartType) {
        const chart = chartType === 'pv' ? this.pvChart : this.pthetaChart;
        if (!chart) return null;

        return chart.toBase64Image('image/png', 1);
    }

    /**
     * Get chart dimensions
     * @param {string} chartType - 'pv' or 'ptheta'
     */
    getChartDimensions(chartType) {
        const chart = chartType === 'pv' ? this.pvChart : this.pthetaChart;
        if (!chart) return null;

        return {
            width: chart.width,
            height: chart.height
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.GraphGenerator = GraphGenerator;
}
