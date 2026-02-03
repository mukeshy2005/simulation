/**
 * UI Controls Module
 * Handles user input and parameter updates
 */

class UIControls {
    constructor(engine, graphGenerator, animation) {
        this.engine = engine;
        this.graphGenerator = graphGenerator;
        this.animation = animation;

        this.loadConfigs = [
            { load: 2, label: 'Load 1 (2 Nm)' },
            { load: 5, label: 'Load 2 (5 Nm)' },
            { load: 8, label: 'Load 3 (8 Nm)' },
            { load: 11, label: 'Load 4 (11 Nm)' },
            { load: 15, label: 'Load 5 (15 Nm)' }
        ];

        this.selectedLoads = [3]; // Default: Load 4
        this.cycleType = 'actual';
        this.showGrid = true;

        this.initControls();
        this.updateGraphs();
    }

    initControls() {
        // Engine parameters
        this.bindSlider('bore', 'boreValue', val => {
            this.engine.updateParams({ bore: parseFloat(val) });
            this.updateGraphs();
        });

        this.bindSlider('stroke', 'strokeValue', val => {
            this.engine.updateParams({ stroke: parseFloat(val) });
            this.updateGraphs();
        });

        this.bindSlider('conRodLength', 'conRodLengthValue', val => {
            this.engine.updateParams({ conRodLength: parseFloat(val) });
            this.updateGraphs();
        });

        this.bindSlider('compressionRatio', 'compressionRatioValue', val => {
            this.engine.updateParams({ compressionRatio: parseFloat(val) });
            this.updateGraphs();
        });

        // Operating parameters
        this.bindSlider('rpm', 'rpmValue', val => {
            this.engine.updateParams({ rpm: parseFloat(val) });
            this.updateGraphs();
        });

        this.bindSlider('load', 'loadValue', val => {
            this.engine.updateParams({ load: parseFloat(val) });
            this.updateGraphs();
        });

        // Ambient conditions
        this.bindInput('ambientTemp', val => {
            this.engine.updateParams({ ambientTemperature: parseFloat(val) });
            this.updateGraphs();
        });

        this.bindInput('ambientPressure', val => {
            this.engine.updateParams({ ambientPressure: parseFloat(val) });
            this.updateGraphs();
        });

        // Load checkboxes
        for (let i = 0; i < 5; i++) {
            const checkbox = document.getElementById(`load${i + 1}`);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.handleLoadCheckbox());
            }
        }

        // Cycle type radio buttons
        const radios = document.querySelectorAll('input[name="cycleType"]');
        radios.forEach(radio => {
            radio.addEventListener('change', e => {
                this.cycleType = e.target.value;
                this.updateGraphs();
            });
        });

        // Tab buttons
        const pvTab = document.getElementById('pvTab');
        const pthetaTab = document.getElementById('pthetaTab');
        if (pvTab && pthetaTab) {
            pvTab.addEventListener('click', () => this.switchTab('pv'));
            pthetaTab.addEventListener('click', () => this.switchTab('ptheta'));
        }

        // Action buttons
        this.bindButton('generateBtn', () => this.updateGraphs());
        this.bindButton('resetBtn', () => this.resetToDefaults());
        this.bindButton('exportCsvBtn', () => this.exportCSV());
        this.bindButton('exportPngBtn', () => this.exportPNG());
        this.bindButton('animationBtn', () => this.toggleAnimation());

        // Animation speed
        this.bindSlider('animationSpeed', 'animationSpeedValue', val => {
            if (this.animation) this.animation.setSpeed(parseFloat(val));
        });

        // Listen for engine angle updates
        window.addEventListener('engineAngleUpdate', e => {
            this.updateCurrentState(e.detail.angle);
        });
    }

    bindSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const valueEl = document.getElementById(valueId);
        if (slider) {
            slider.addEventListener('input', e => {
                if (valueEl) valueEl.textContent = e.target.value;
                callback(e.target.value);
            });
        }
    }

    bindInput(inputId, callback) {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', e => callback(e.target.value));
        }
    }

    bindButton(buttonId, callback) {
        const button = document.getElementById(buttonId);
        if (button) button.addEventListener('click', callback);
    }

    handleLoadCheckbox() {
        this.selectedLoads = [];
        for (let i = 0; i < 5; i++) {
            const checkbox = document.getElementById(`load${i + 1}`);
            if (checkbox && checkbox.checked) {
                this.selectedLoads.push(i);
            }
        }
        this.updateGraphs();
    }

    switchTab(tab) {
        const pvTab = document.getElementById('pvTab');
        const pthetaTab = document.getElementById('pthetaTab');
        const pvChart = document.getElementById('pvChartContainer');
        const pthetaChart = document.getElementById('pthetaChartContainer');

        if (tab === 'pv') {
            pvTab.classList.add('active');
            pthetaTab.classList.remove('active');
            pvChart.style.display = 'block';
            pthetaChart.style.display = 'none';
        } else {
            pvTab.classList.remove('active');
            pthetaTab.classList.add('active');
            pvChart.style.display = 'none';
            pthetaChart.style.display = 'block';
        }
    }

    updateGraphs() {
        const datasets = [];

        if (this.selectedLoads.length === 0) {
            // Use current single load value
            const data = this.engine.generateCycleData(this.cycleType, 2);
            datasets.push({
                label: `${this.engine.load.toFixed(1)} Nm (${this.cycleType})`,
                data: data,
                colorIndex: 0
            });
        } else {
            // Multiple loads selected
            this.selectedLoads.forEach(loadIdx => {
                const loadConfig = this.loadConfigs[loadIdx];

                // Temporarily update load
                const originalLoad = this.engine.load;
                this.engine.updateParams({ load: loadConfig.load });

                const data = this.engine.generateCycleData(this.cycleType, 2);
                datasets.push({
                    label: loadConfig.label,
                    data: data,
                    colorIndex: loadIdx
                });

                // Restore original load
                this.engine.updateParams({ load: originalLoad });
            });
        }

        this.graphGenerator.updatePVChart(datasets);
        this.graphGenerator.updatePThetaChart(datasets);

        // Update performance metrics
        this.updateMetrics();

        // Update animation engine reference
        if (this.animation) {
            this.animation.updateEngine(this.engine);
        }
    }

    updateMetrics() {
        const metrics = this.engine.getPerformanceMetrics();

        this.setElementText('metricDisplacement', metrics.displacementVolume + ' cm³');
        this.setElementText('metricCR', metrics.compressionRatio + ':1');
        this.setElementText('metricIMEP', metrics.imep + ' bar');
        this.setElementText('metricPower', metrics.indicatedPower + ' kW');
        this.setElementText('metricEfficiency', metrics.thermalEfficiency + '%');
        this.setElementText('metricPistonSpeed', metrics.meanPistonSpeed + ' m/s');
    }

    updateCurrentState(angle) {
        const volume = this.engine.getVolume(angle);
        const pressure = this.engine.getActualPressure(angle);
        const phase = this.engine.getPhase(angle);
        const valves = this.engine.getValveStates(angle);
        const position = this.engine.getPistonPosition(angle);

        this.setElementText('stateAngle', angle.toFixed(1) + '°');
        this.setElementText('statePhase', phase);
        this.setElementText('stateVolume', volume.toFixed(1) + ' cm³');
        this.setElementText('statePressure', pressure.toFixed(2) + ' bar');
        this.setElementText('statePosition', position.toFixed(1) + ' mm');
        this.setElementText('stateIntake', valves.intake ? 'OPEN' : 'CLOSED');
        this.setElementText('stateExhaust', valves.exhaust ? 'OPEN' : 'CLOSED');

        // Update graph markers
        this.graphGenerator.addPVMarker(volume, pressure);
        this.graphGenerator.addPThetaMarker(angle, pressure);
    }

    setElementText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    toggleAnimation() {
        if (this.animation) {
            const running = this.animation.toggle();
            const btn = document.getElementById('animationBtn');
            if (btn) {
                btn.textContent = running ? '⏸ Stop Animation' : '▶ Start Animation';
                btn.classList.toggle('running', running);
            }

            if (!running) {
                this.graphGenerator.removeMarkers();
            }
        }
    }

    resetToDefaults() {
        this.engine.updateParams({
            bore: 80, stroke: 110, conRodLength: 220,
            compressionRatio: 8, rpm: 1857, load: 11.1,
            ambientPressure: 1.013, ambientTemperature: 298
        });

        // Reset UI elements
        this.setSliderValue('bore', 80);
        this.setSliderValue('stroke', 110);
        this.setSliderValue('conRodLength', 220);
        this.setSliderValue('compressionRatio', 8);
        this.setSliderValue('rpm', 1857);
        this.setSliderValue('load', 11.1);
        this.setInputValue('ambientTemp', 298);
        this.setInputValue('ambientPressure', 1.013);

        this.selectedLoads = [3];
        for (let i = 0; i < 5; i++) {
            const cb = document.getElementById(`load${i + 1}`);
            if (cb) cb.checked = (i === 3);
        }

        this.updateGraphs();
    }

    setSliderValue(id, value) {
        const slider = document.getElementById(id);
        const valueEl = document.getElementById(id + 'Value');
        if (slider) slider.value = value;
        if (valueEl) valueEl.textContent = value;
    }

    setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) input.value = value;
    }

    exportCSV() {
        const data = this.engine.generateCycleData(this.cycleType, 1);

        let csv = 'Crank_Angle,Volume_cm3,Pressure_bar,Phase\n';
        data.forEach(d => {
            csv += `${d.theta},${d.volume.toFixed(2)},${d.pressure.toFixed(3)},${d.phase}\n`;
        });

        // Add metadata
        const meta = `\n# Engine Parameters\n# Bore: ${this.engine.bore} mm\n# Stroke: ${this.engine.stroke} mm\n# Compression Ratio: ${this.engine.compressionRatio}:1\n# RPM: ${this.engine.rpm}\n# Load: ${this.engine.load} Nm\n`;

        const blob = new Blob([csv + meta], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PV_Diagram_${this.engine.rpm}rpm_${this.engine.load}Nm.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportPNG() {
        const activeTab = document.querySelector('.tab-btn.active');
        const chartType = activeTab && activeTab.id === 'pthetaTab' ? 'ptheta' : 'pv';
        const dataUrl = this.graphGenerator.exportChartImage(chartType);

        if (dataUrl) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${chartType === 'pv' ? 'PV' : 'P-Theta'}_Diagram_${this.engine.rpm}rpm.png`;
            a.click();
        }
    }
}

if (typeof window !== 'undefined') window.UIControls = UIControls;
