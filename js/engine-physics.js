/**
 * SI Engine Physics Calculations
 * Core physics engine for PV Diagram Simulation
 * 
 * This module handles all thermodynamic calculations for a
 * four-stroke single-cylinder SI (Spark Ignition) engine.
 */

class EnginePhysics {
    constructor(params = {}) {
        // Engine Geometry (in mm, converted to m for calculations)
        this.bore = params.bore || 80;           // mm
        this.stroke = params.stroke || 110;       // mm
        this.conRodLength = params.conRodLength || 220; // mm
        this.compressionRatio = params.compressionRatio || 8;

        // Operating Conditions
        this.rpm = params.rpm || 1857;
        this.load = params.load || 11.1;         // Nm (torque)
        this.maxLoad = params.maxLoad || 20;     // Nm

        // Ambient Conditions
        this.ambientPressure = params.ambientPressure || 1.013; // bar
        this.ambientTemperature = params.ambientTemperature || 298; // K

        // Thermodynamic Constants
        this.gamma = 1.4;  // Ratio of specific heats for air
        this.R = 287;      // Gas constant for air (J/kg·K)

        // Combustion Parameters
        this.ignitionAdvance = 15;  // degrees before TDC
        this.combustionDuration = 50; // degrees

        // Calculate derived values
        this.calculateDerivedValues();
    }

    /**
     * Calculate derived engine parameters
     */
    calculateDerivedValues() {
        // Convert to meters for calculations
        const B = this.bore / 1000;      // Bore in m
        const S = this.stroke / 1000;    // Stroke in m
        const L = this.conRodLength / 1000; // Con rod length in m

        // Crank radius
        this.crankRadius = S / 2;  // m

        // Displacement volume (swept volume)
        this.displacementVolume = (Math.PI * B * B / 4) * S;  // m³
        this.displacementVolumeCc = this.displacementVolume * 1e6;  // cm³

        // Clearance volume
        this.clearanceVolume = this.displacementVolume / (this.compressionRatio - 1);  // m³
        this.clearanceVolumeCc = this.clearanceVolume * 1e6;  // cm³

        // Total volume (maximum)
        this.totalVolume = this.clearanceVolume + this.displacementVolume;  // m³
        this.totalVolumeCc = this.totalVolume * 1e6;  // cm³

        // Store in mm for internal use
        this.B_mm = this.bore;
        this.S_mm = this.stroke;
        this.L_mm = this.conRodLength;
        this.R_mm = this.stroke / 2;  // Crank radius in mm
    }

    /**
     * Update engine parameters
     */
    updateParams(params) {
        Object.assign(this, params);
        this.calculateDerivedValues();
    }

    /**
     * Calculate instantaneous volume as function of crank angle
     * @param {number} theta - Crank angle in degrees (0 = TDC of compression)
     * @returns {number} Volume in cm³
     */
    getVolume(theta) {
        const thetaRad = theta * Math.PI / 180;

        const R = this.R_mm;  // Crank radius in mm
        const L = this.L_mm;  // Con rod length in mm
        const B = this.B_mm;  // Bore in mm

        // Piston displacement from TDC
        // x = R(1 - cos(θ)) + L(1 - √(1 - (R/L)²sin²(θ)))
        const lambda = R / L;  // Ratio of crank radius to con rod length
        const sinTheta = Math.sin(thetaRad);
        const cosTheta = Math.cos(thetaRad);

        // Displacement of piston from TDC
        const x = R * (1 - cosTheta) + L * (1 - Math.sqrt(1 - lambda * lambda * sinTheta * sinTheta));

        // Volume = Clearance volume + swept volume based on piston position
        const sweptVolume = (Math.PI * B * B / 4) * x;  // mm³
        const V = this.clearanceVolumeCc + sweptVolume / 1000;  // Convert mm³ to cm³

        return V;
    }

    /**
     * Calculate theoretical pressure (ideal Otto cycle)
     * @param {number} theta - Crank angle in degrees
     * @returns {number} Pressure in bar
     */
    getTheoreticalPressure(theta) {
        // Normalize theta to 0-720 range
        theta = ((theta % 720) + 720) % 720;

        const V = this.getVolume(theta);
        const Vmax = this.totalVolumeCc;
        const Vmin = this.clearanceVolumeCc;
        const P_atm = this.ambientPressure;
        const gamma = this.gamma;

        // Load factor affects peak pressure
        const loadFactor = 1.5 + 2.0 * (this.load / this.maxLoad);

        let P;

        if (theta >= 0 && theta < 180) {
            // SUCTION STROKE (0-180°): Constant pressure at atmospheric
            P = P_atm;
        }
        else if (theta >= 180 && theta < 360) {
            // COMPRESSION STROKE (180-360°): Adiabatic compression
            // PV^γ = constant
            // P = P_atm * (Vmax/V)^γ
            const V_at_180 = this.getVolume(180);
            P = P_atm * Math.pow(V_at_180 / V, gamma);
        }
        else if (theta >= 360 && theta < 540) {
            // POWER STROKE (360-540°): 
            // First: Constant volume heat addition at TDC (instantaneous)
            // Then: Adiabatic expansion

            // Pressure at end of compression
            const P_compression = P_atm * Math.pow(this.compressionRatio, gamma);

            // Peak pressure after combustion (constant volume heat addition)
            const P_peak = P_compression * loadFactor;

            // Adiabatic expansion from TDC
            const V_at_360 = this.getVolume(360);
            P = P_peak * Math.pow(V_at_360 / V, gamma);
        }
        else {
            // EXHAUST STROKE (540-720°): Constant pressure at atmospheric
            P = P_atm;
        }

        return P;
    }

    /**
     * Calculate actual (realistic) pressure with combustion modeling
     * Produces classic two-loop P-V diagram: power loop + pumping loop
     * Reference: Standard SI engine indicator diagram
     * @param {number} theta - Crank angle in degrees
     * @returns {number} Pressure in bar
     */
    getActualPressure(theta) {
        // Normalize theta to 0-720 range
        theta = ((theta % 720) + 720) % 720;

        const V = this.getVolume(theta);
        const Vmax = this.totalVolumeCc;
        const Vmin = this.clearanceVolumeCc;
        const P_atm = this.ambientPressure;

        // Polytropic index (less than gamma due to heat transfer)
        const n_compression = 1.32;
        const n_expansion = 1.28;

        // Load affects peak pressure
        const loadFraction = this.load / this.maxLoad;

        // RPM affects combustion efficiency and pumping losses
        const rpmNormalized = this.rpm / 2000; // Normalize around 2000 RPM
        const rpmEfficiency = 1.0 - 0.15 * Math.abs(rpmNormalized - 1); // Best efficiency at 2000 RPM

        const peakPressureMultiplier = (2.0 + 1.8 * loadFraction) * (0.85 + 0.15 * rpmEfficiency);

        let P;

        // =====================================================
        // SUCTION STROKE (0° - 180°): BELOW Patm
        // Piston moves from TDC to BDC, intake valve open
        // Creates BOTTOM of pumping loop
        // =====================================================
        if (theta >= 0 && theta < 180) {
            // Suction creates vacuum - pressure below atmospheric
            // Deeper vacuum in middle of stroke, closer to Patm at ends
            // Higher RPM = deeper vacuum (more flow restriction)
            const strokeProgress = theta / 180;

            // Pressure drop profile: max vacuum around 60-100° 
            // RPM effect: vacuum depth increases significantly with RPM
            const vacuumDepth = 0.10 + 0.25 * (this.rpm / 4000);
            const vacuumProfile = Math.sin(Math.PI * strokeProgress);

            P = P_atm * (1 - vacuumDepth * vacuumProfile);
        }
        // =====================================================
        // COMPRESSION STROKE (180° - 360°): Rising pressure
        // Piston moves from BDC to TDC, both valves closed
        // Part of the POWER loop
        // =====================================================
        else if (theta >= 180 && theta < 360) {
            const V_BDC = this.getVolume(180); // Volume at BDC

            // Start from slightly below Patm (end of suction)
            const P_start = P_atm * 0.95;

            // Polytropic compression: P * V^n = constant
            P = P_start * Math.pow(V_BDC / V, n_compression);
        }
        // =====================================================
        // COMBUSTION + EARLY EXPANSION (360° - 400°)
        // Heat addition near TDC, pressure peaks ~10-15° after TDC
        // Top of POWER loop
        // =====================================================
        else if (theta >= 360 && theta < 400) {
            const V_TDC = this.getVolume(360);
            const V_BDC = this.getVolume(180);

            // Pressure at end of compression
            const P_compression = P_atm * 0.95 * Math.pow(V_BDC / V_TDC, n_compression);

            // Peak pressure (combustion)
            const P_peak = P_compression * peakPressureMultiplier;

            // Combustion profile: smooth rise to peak at ~372°, then gradual fall
            const theta_peak = 372;

            if (theta <= theta_peak) {
                // Rising to peak - smooth S-curve
                const progress = (theta - 360) / (theta_peak - 360);
                const smooth = progress * progress * (3 - 2 * progress);
                P = P_compression + smooth * (P_peak - P_compression);
            } else {
                // Past peak - start of expansion
                const progress = (theta - theta_peak) / (400 - theta_peak);
                const V_at_peak = this.getVolume(theta_peak);
                const P_at_400 = P_peak * Math.pow(V_at_peak / this.getVolume(400), n_expansion);
                const smooth = progress * progress * (3 - 2 * progress);
                P = P_peak - smooth * (P_peak - P_at_400);
            }
        }
        // =====================================================
        // EXPANSION/POWER STROKE (400° - 540°)
        // Piston moves from near TDC to BDC
        // Right side of POWER loop (going down)
        // =====================================================
        else if (theta >= 400 && theta < 540) {
            const V_TDC = this.getVolume(360);
            const V_BDC = this.getVolume(180);
            const V_at_400 = this.getVolume(400);
            const V_at_peak = this.getVolume(372);

            // Calculate peak and pressure at 400°
            const P_compression = P_atm * 0.95 * Math.pow(V_BDC / V_TDC, n_compression);
            const P_peak = P_compression * peakPressureMultiplier;
            const P_at_400 = P_peak * Math.pow(V_at_peak / V_at_400, n_expansion);

            // Polytropic expansion from 400°
            P = P_at_400 * Math.pow(V_at_400 / V, n_expansion);

            // Near end of expansion, blend toward exhaust valve opening
            if (theta > 500) {
                const blend = (theta - 500) / 40;
                const P_evo = P_atm * 1.5; // Pressure when exhaust valve opens
                P = P * (1 - blend * 0.3) + P_evo * blend * 0.3;
            }
        }
        // =====================================================
        // EXHAUST BLOWDOWN (540° - 600°)
        // Exhaust valve opens, rapid pressure drop
        // Transition from power loop to pumping loop
        // =====================================================
        else if (theta >= 540 && theta < 600) {
            // Rapid but smooth drop to exhaust pressure
            const progress = (theta - 540) / 60;
            const smoothDrop = 1 - Math.pow(1 - progress, 2.5);

            // Pressure before exhaust valve opens (end of expansion)
            const P_before = P_atm * 2.0;
            // Exhaust back-pressure (above Patm)
            const P_exhaust = P_atm * 1.15;

            P = P_before - smoothDrop * (P_before - P_exhaust);
        }
        // =====================================================
        // EXHAUST STROKE (600° - 720°): ABOVE Patm
        // Piston moves from BDC to TDC, exhaust valve open
        // Creates TOP of pumping loop
        // =====================================================
        else {
            // Exhaust creates back-pressure - pressure above atmospheric
            // Profile similar to suction but inverted and above Patm
            // Higher RPM = higher exhaust back-pressure
            const strokeProgress = (theta - 540) / 180;

            // Exhaust back-pressure profile - RPM has bigger effect
            const exhaustHeight = 0.08 + 0.20 * (this.rpm / 4000);
            const exhaustProfile = Math.sin(Math.PI * strokeProgress);

            P = P_atm * (1 + exhaustHeight * exhaustProfile);
        }

        // Ensure pressure doesn't go negative
        return Math.max(P, 0.1);
    }

    /**
     * Generate complete cycle data
     * @param {string} cycleType - 'theoretical' or 'actual'
     * @param {number} resolution - Degrees per data point
     * @returns {Array} Array of {theta, volume, pressure} objects
     */
    generateCycleData(cycleType = 'actual', resolution = 2) {
        const data = [];

        for (let theta = 0; theta <= 720; theta += resolution) {
            const volume = this.getVolume(theta);
            const pressure = cycleType === 'theoretical'
                ? this.getTheoreticalPressure(theta)
                : this.getActualPressure(theta);

            data.push({
                theta: theta,
                volume: volume,
                pressure: pressure,
                phase: this.getPhase(theta)
            });
        }

        return data;
    }

    /**
     * Get stroke phase for given crank angle
     * @param {number} theta - Crank angle in degrees
     * @returns {string} Phase name
     */
    getPhase(theta) {
        theta = ((theta % 720) + 720) % 720;

        if (theta >= 0 && theta < 180) return 'Suction';
        if (theta >= 180 && theta < 360) return 'Compression';
        if (theta >= 360 && theta < 540) return 'Power';
        return 'Exhaust';
    }

    /**
     * Get valve states for given crank angle
     * @param {number} theta - Crank angle in degrees
     * @returns {Object} {intake: boolean, exhaust: boolean}
     */
    getValveStates(theta) {
        theta = ((theta % 720) + 720) % 720;

        // Intake valve opens slightly before TDC (suction) and closes after BDC
        const intakeOpen = (theta >= 350 || theta <= 220);

        // Exhaust valve opens before BDC (power) and closes after TDC
        const exhaustOpen = (theta >= 500 && theta <= 720) || (theta >= 0 && theta <= 20);

        return {
            intake: (theta >= 0 && theta < 180) || theta > 700,
            exhaust: theta >= 540 || theta < 20
        };
    }

    /**
     * Check if spark is firing at given crank angle
     * @param {number} theta - Crank angle in degrees
     * @returns {boolean}
     */
    isSparkFiring(theta) {
        theta = ((theta % 720) + 720) % 720;
        const sparkStart = 360 - this.ignitionAdvance;
        return theta >= sparkStart && theta <= sparkStart + 10;
    }

    /**
     * Calculate piston position from TDC
     * @param {number} theta - Crank angle in degrees
     * @returns {number} Position in mm from TDC
     */
    getPistonPosition(theta) {
        const thetaRad = theta * Math.PI / 180;
        const R = this.R_mm;
        const L = this.L_mm;

        const lambda = R / L;
        const sinTheta = Math.sin(thetaRad);
        const cosTheta = Math.cos(thetaRad);

        // Displacement from TDC
        const x = R * (1 - cosTheta) + L * (1 - Math.sqrt(1 - lambda * lambda * sinTheta * sinTheta));

        return x;
    }

    /**
     * Calculate connecting rod angle
     * @param {number} theta - Crank angle in degrees
     * @returns {number} Angle in degrees
     */
    getConRodAngle(theta) {
        const thetaRad = theta * Math.PI / 180;
        const R = this.R_mm;
        const L = this.L_mm;

        const sinBeta = (R / L) * Math.sin(thetaRad);
        const beta = Math.asin(sinBeta);

        return beta * 180 / Math.PI;
    }

    /**
     * Calculate performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        // Generate cycle data
        const data = this.generateCycleData('actual', 1);

        // Calculate indicated work (area of P-V diagram)
        let work = 0;
        for (let i = 1; i < data.length; i++) {
            // Trapezoidal integration
            const dV = (data[i].volume - data[i - 1].volume) * 1e-6; // m³
            const avgP = (data[i].pressure + data[i - 1].pressure) / 2 * 1e5; // Pa
            work += avgP * dV;
        }

        // Indicated Mean Effective Pressure (IMEP)
        const imep = work / (this.displacementVolume);  // Pa
        const imepBar = imep / 1e5;  // bar

        // Indicated Power
        const cyclesPerSecond = this.rpm / (60 * 2);  // 4-stroke: 1 power stroke per 2 revolutions
        const indicatedPower = Math.abs(work) * cyclesPerSecond;  // Watts

        // Thermal efficiency (theoretical Otto cycle)
        const thermalEfficiency = 1 - Math.pow(1 / this.compressionRatio, this.gamma - 1);

        // Mean piston speed
        const meanPistonSpeed = 2 * (this.stroke / 1000) * this.rpm / 60;  // m/s

        return {
            displacementVolume: this.displacementVolumeCc.toFixed(1),
            compressionRatio: this.compressionRatio.toFixed(1),
            imep: Math.abs(imepBar).toFixed(2),
            indicatedPower: (indicatedPower / 1000).toFixed(2),  // kW
            thermalEfficiency: (thermalEfficiency * 100).toFixed(1),
            meanPistonSpeed: meanPistonSpeed.toFixed(2)
        };
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.EnginePhysics = EnginePhysics;
}
