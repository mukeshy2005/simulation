/**
 * Main Application Entry Point
 * Initializes all modules and starts the simulation
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize engine physics
    const engine = new EnginePhysics({
        bore: 80,
        stroke: 110,
        conRodLength: 220,
        compressionRatio: 8,
        rpm: 1857,
        load: 11.1,
        maxLoad: 20,
        ambientPressure: 1.013,
        ambientTemperature: 298
    });

    // Initialize graph generator
    const graphGenerator = new GraphGenerator();
    graphGenerator.initPVChart('pvChart');
    graphGenerator.initPThetaChart('pthetaChart');

    // Initialize engine animation
    const animation = new EngineAnimation('engineCanvas', engine);
    animation.draw(); // Draw initial state

    // Initialize UI controls
    const uiControls = new UIControls(engine, graphGenerator, animation);

    // Make objects available globally for debugging
    window.app = {
        engine: engine,
        graphGenerator: graphGenerator,
        animation: animation,
        uiControls: uiControls
    };

    console.log('SI Engine PV Diagram Simulation initialized');
    console.log('Engine displacement:', engine.displacementVolumeCc.toFixed(1), 'cm³');
    console.log('Compression ratio:', engine.compressionRatio);
});
