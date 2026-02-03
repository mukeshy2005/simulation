/**
 * Engine Animation Module
 * 2D visualization of SI engine using HTML5 Canvas
 */

class EngineAnimation {
    constructor(canvasId, engine) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.engine = engine;

        this.isRunning = false;
        this.currentAngle = 0;
        this.animationSpeed = 1;
        this.lastFrameTime = 0;
        this.animationId = null;

        this.updateDimensions();
    }

    updateDimensions() {
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.centerX = this.width / 2;
        this.centerY = this.height * 0.75;

        this.bore = this.engine.bore * 0.4;
        this.stroke = this.engine.stroke * 0.32;
        this.crankRadius = this.stroke / 2;
        this.pistonHeight = 18;
        this.pistonWidth = this.bore - 4;
        this.cylinderTop = this.centerY - this.stroke - this.pistonHeight - 25;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    toggle() {
        if (this.isRunning) this.stop();
        else this.start();
        return this.isRunning;
    }

    setSpeed(speed) {
        this.animationSpeed = Math.max(0.1, Math.min(5, speed));
    }

    setAngle(angle) {
        this.currentAngle = ((angle % 720) + 720) % 720;
        this.draw();
    }

    animate() {
        if (!this.isRunning) return;

        const now = performance.now();
        const dt = now - this.lastFrameTime;
        this.lastFrameTime = now;

        const degreesPerSec = (this.engine.rpm * 360 / 60) * this.animationSpeed;
        this.currentAngle = (this.currentAngle + degreesPerSec * dt / 1000) % 720;

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const pistonPos = this.engine.getPistonPosition(this.currentAngle);
        const pistonOffset = pistonPos * 0.5;

        this.drawCylinder();
        this.drawPiston(pistonOffset);
        this.drawConnectingRod(pistonOffset);
        this.drawCrankshaft();
        this.drawValves();
        this.drawSparkPlug();
        this.drawLabels();

        window.dispatchEvent(new CustomEvent('engineAngleUpdate', { detail: { angle: this.currentAngle } }));
    }

    drawCylinder() {
        const ctx = this.ctx;
        const x = this.centerX - this.bore / 2;
        const y = this.cylinderTop + 20;
        const h = this.stroke + this.pistonHeight + 30;

        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;

        ctx.fillRect(x - 10, y, 10, h);
        ctx.strokeRect(x - 10, y, 10, h);
        ctx.fillRect(x + this.bore, y, 10, h);
        ctx.strokeRect(x + this.bore, y, 10, h);
        ctx.fillRect(x - 10, y + h, this.bore + 20, 10);

        // Head
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(x - 8, this.cylinderTop, this.bore + 16, 15, 3);
        ctx.fill();
    }

    drawPiston(offset) {
        const ctx = this.ctx;
        const x = this.centerX - this.pistonWidth / 2;
        const y = this.cylinderTop + 20 + offset;

        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, this.pistonWidth, this.pistonHeight, 3);
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + 4 + i * 5);
            ctx.lineTo(x + this.pistonWidth, y + 4 + i * 5);
            ctx.stroke();
        }
    }

    drawConnectingRod(pistonOffset) {
        const ctx = this.ctx;
        const pinY = this.cylinderTop + 20 + pistonOffset + this.pistonHeight - 5;
        const angleRad = this.currentAngle * Math.PI / 180;
        const crankX = this.centerX + this.crankRadius * Math.sin(angleRad);
        const crankY = this.centerY + this.crankRadius * Math.cos(angleRad);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.centerX, pinY);
        ctx.lineTo(crankX, crankY);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(this.centerX, pinY, 4, 0, Math.PI * 2);
        ctx.arc(crankX, crankY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCrankshaft() {
        const ctx = this.ctx;
        const angleRad = this.currentAngle * Math.PI / 180;
        const crankX = this.centerX + this.crankRadius * Math.sin(angleRad);
        const crankY = this.centerY + this.crankRadius * Math.cos(angleRad);

        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.centerX, this.centerY);
        ctx.lineTo(crankX, crankY);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(crankX, crankY, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    drawValves() {
        const ctx = this.ctx;
        const states = this.engine.getValveStates(this.currentAngle);
        const valveY = this.cylinderTop - 5;

        // Intake
        ctx.fillStyle = states.intake ? '#22c55e' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(this.centerX - 15, valveY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('IN', this.centerX - 15, valveY - 10);

        // Exhaust
        ctx.fillStyle = states.exhaust ? '#ef4444' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(this.centerX + 15, valveY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillText('EX', this.centerX + 15, valveY - 10);
    }

    drawSparkPlug() {
        const ctx = this.ctx;
        const firing = this.engine.isSparkFiring(this.currentAngle);
        const y = this.cylinderTop + 5;

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(this.centerX - 2, y, 4, 10);

        if (firing) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.centerX, y + 15, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(251,146,60,0.6)';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    drawLabels() {
        const ctx = this.ctx;
        const phase = this.engine.getPhase(this.currentAngle);
        const colors = { Suction: '#3b82f6', Compression: '#8b5cf6', Power: '#ef4444', Exhaust: '#6b7280' };

        ctx.fillStyle = colors[phase] || '#1e293b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(phase.toUpperCase(), this.centerX, 18);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText('θ = ' + this.currentAngle.toFixed(0) + '°', this.centerX, 32);
    }

    updateEngine(engine) {
        this.engine = engine;
        this.updateDimensions();
        if (!this.isRunning) this.draw();
    }

    getState() {
        return { angle: this.currentAngle, isRunning: this.isRunning, speed: this.animationSpeed };
    }
}

if (typeof window !== 'undefined') window.EngineAnimation = EngineAnimation;
