/* =====================================================
   PlayerCarController.js
   Physics-driven kinematic car controller.
   Reads live stats from app.globals.vehicleStats.
   Attaches to: player car entity (spawned in main.js)
   ===================================================== */

var PlayerCarController = pc.createScript('playerCarController');

PlayerCarController.attributes.add('isPlayer', { type: 'boolean', default: true });

PlayerCarController.prototype.initialize = function () {
    this._speed      = 0;
    this._heading    = this.entity.getEulerAngles().y;
    this._steer      = 0;
    this._driftAngle = 0;

    this._nitroActive = false;
    this._nitroTime   = 0;
    this._nitroDur    = 4;
    this._nitroCharge = 1.0;

    this._input = { gas: false, brake: false, left: false, right: false, handbrake: false };
    this._aiInput = null;

    this._lastSafePos     = this.entity.getPosition().clone();
    this._lastSafeHeading = this._heading;
    this._safeTimer       = 0;

    if (this.isPlayer) {
        this._setupInput();
        this.app.globals = this.app.globals || {};
        this.app.globals.playerController = this;
    }
};

PlayerCarController.prototype._setupInput = function () {
    var inp  = this._input;
    var self = this;
    this.app.on('input:gas',       function (on) { inp.gas       = on; });
    this.app.on('input:brake',     function (on) { inp.brake     = on; });
    this.app.on('input:left',      function (on) { inp.left      = on; });
    this.app.on('input:right',     function (on) { inp.right     = on; });
    this.app.on('input:handbrake', function (on) { inp.handbrake = on; });
    this.app.on('input:nitro',     function (on) { if (on) self._tryNitro(); });
    // Backward-compat alias
    this.app.on('input:accel',     function (on) { inp.gas       = on; });
};

PlayerCarController.prototype._tryNitro = function () {
    if (!this._nitroActive && this._nitroCharge >= 0.25) {
        this._nitroActive = true;
        this._nitroTime   = 0;
        this.app.fire('ui:nitroActive', true);
    }
};

PlayerCarController.prototype.update = function (dt) {
    var gm       = this.app.globals && this.app.globals.gameManager;
    var racing   = !gm || gm.state === 'racing';
    var countdown = gm && gm.state === 'countdown';

    var vs    = this.app.globals && this.app.globals.vehicleStats;
    var stats = vs ? vs.getAll() : null;

    if (!stats) {
        stats = { horsepower: 145, topSpeedMph: 118, brakeForce: 0.68, handling: 0.65, grip: 0.72 };
    }

    var topSpeedMs = stats.topSpeedMph * 0.44704;
    var accel      = Math.max(7, Math.min(44, stats.horsepower / 6.2));
    var brakeDecel = stats.brakeForce * 38;
    var turnRate   = stats.handling * 95;
    var friction   = 3.5;

    if (this.isPlayer && this.app.keyboard) {
        var kb = this.app.keyboard;
        this._input.gas       = kb.isPressed(pc.KEY_W) || kb.isPressed(pc.KEY_UP);
        this._input.brake     = kb.isPressed(pc.KEY_S) || kb.isPressed(pc.KEY_DOWN);
        this._input.left      = kb.isPressed(pc.KEY_A) || kb.isPressed(pc.KEY_LEFT);
        this._input.right     = kb.isPressed(pc.KEY_D) || kb.isPressed(pc.KEY_RIGHT);
        this._input.handbrake = kb.isPressed(pc.KEY_SPACE);
        if (kb.wasPressed(pc.KEY_N)) this._tryNitro();
    }

    var inp = this.isPlayer ? this._input : (this._aiInput || this._input);

    var nitroMult = 1.0;
    if (this._nitroActive) {
        this._nitroTime += dt;
        this._nitroCharge = Math.max(0, 1 - this._nitroTime / this._nitroDur);
        if (this._nitroTime >= this._nitroDur) {
            this._nitroActive = false;
            this.app.fire('ui:nitroActive', false);
        }
        nitroMult = 1.45;
    } else {
        this._nitroCharge = Math.min(1, this._nitroCharge + 0.035 * dt);
    }

    var effectiveMax = topSpeedMs * nitroMult;

    if (!racing && !countdown) {
        this._applyFriction(dt, friction);
    } else if (racing) {
        if (inp.gas && !inp.brake) {
            this._speed += accel * dt;
        } else if (inp.brake) {
            if (this._speed > 0) this._speed -= brakeDecel * dt;
            else                 this._speed -= brakeDecel * 0.35 * dt;
        } else {
            this._applyFriction(dt, friction);
        }
    }

    this._speed = Math.max(-topSpeedMs * 0.25, Math.min(this._speed, effectiveMax));

    var speedRatio  = Math.abs(this._speed) / Math.max(topSpeedMs, 1);
    var steerSens   = turnRate * Math.max(0.12, speedRatio);
    var isHandbrake = inp.handbrake && this._speed > 2;
    if (isHandbrake) steerSens *= 1.55;

    var steerTarget = 0;
    if (inp.left)  steerTarget = -1;
    if (inp.right) steerTarget =  1;
    if (this._speed < 0) steerTarget *= -1;

    this._steer = this._lerp(this._steer, steerTarget, isHandbrake ? 5 * dt : 9 * dt);
    this._heading += this._steer * steerSens * dt;

    if (isHandbrake) {
        this._driftAngle += this._steer * (1 - stats.grip) * 52 * dt;
        this._speed *= Math.pow(1 - 0.012, 60 * dt);
    } else {
        this._driftAngle *= Math.pow(1 - stats.grip * 4 * dt, 1);
        if (Math.abs(this._driftAngle) < 0.3) this._driftAngle = 0;
    }
    var driftCap = 42 * (1 - stats.grip * 0.6);
    this._driftAngle = Math.max(-driftCap, Math.min(driftCap, this._driftAngle));

    var rad = (this._heading + this._driftAngle * 0.5) * Math.PI / 180;
    var dx  = Math.sin(rad) * this._speed * dt;
    var dz  = Math.cos(rad) * this._speed * dt;

    var pos = this.entity.getPosition();
    this.entity.setPosition(pos.x + dx, pos.y, pos.z + dz);
    this.entity.setEulerAngles(0, this._heading, this._steer * -9 + this._driftAngle * 0.2);

    this._safeTimer += dt;
    if (this._safeTimer > 0.5 && this._speed > 2) {
        this._safeTimer = 0;
        this._lastSafePos.copy(this.entity.getPosition());
        this._lastSafeHeading = this._heading;
    }

    if (this.isPlayer) {
        var mph = Math.round(Math.abs(this._speed) * 2.237);
        this.app.fire('ui:speed', mph, Math.abs(this._speed) / effectiveMax);
        this.app.fire('ui:nitroCharge', this._nitroCharge);
    }
};

PlayerCarController.prototype._applyFriction = function (dt, rate) {
    if      (this._speed > 0) this._speed = Math.max(0, this._speed - rate * dt);
    else if (this._speed < 0) this._speed = Math.min(0, this._speed + rate * dt);
};

PlayerCarController.prototype._lerp = function (a, b, t) {
    return a + (b - a) * Math.min(t, 1);
};

PlayerCarController.prototype.setAIInput  = function (inp) { this._aiInput = inp; };
PlayerCarController.prototype.getSpeed    = function ()    { return Math.abs(this._speed); };
PlayerCarController.prototype.getHeading  = function ()    { return this._heading; };
PlayerCarController.prototype.resetToSafe = function () {
    this.entity.setPosition(this._lastSafePos);
    this._heading    = this._lastSafeHeading + 180;
    this._speed      = 3;
    this._driftAngle = 0;
};
