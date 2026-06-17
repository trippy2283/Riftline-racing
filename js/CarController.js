/* =====================================================
   CarController.js
   Arcade car physics — pure kinematic transform control.
   Responsive and fast-feeling without Ammo.js dependency.
   Features: acceleration, braking, steering, drift,
             nitro boost, shield, repair power-ups.

   Attributes are exposed so they can be tuned per car:
     maxSpeed, acceleration, turnSpeed, brakeForce, nitroPower
   ===================================================== */

var CarController = pc.createScript('carController');

// --- Exposed attributes (tunable per car in editor / via main.js) ---
CarController.attributes.add('maxSpeed',     { type: 'number', default: 50 });
CarController.attributes.add('acceleration', { type: 'number', default: 24 });
CarController.attributes.add('turnSpeed',    { type: 'number', default: 90  });
CarController.attributes.add('brakeForce',   { type: 'number', default: 40  });
CarController.attributes.add('nitroPower',   { type: 'number', default: 1.5 });
CarController.attributes.add('friction',     { type: 'number', default: 1.8 });
CarController.attributes.add('driftFactor',  { type: 'number', default: 0.92 });
CarController.attributes.add('isPlayer',     { type: 'boolean', default: true });

CarController.prototype.initialize = function () {
    this._speed     = 0;
    this._steer     = 0;     // current steering angle (degrees/s)
    this._heading   = 0;     // Y rotation in degrees
    this._pos       = this.entity.getPosition().clone();

    // Power-up state
    this._nitroActive   = false;
    this._nitroTime     = 0;
    this._nitroDuration = 4;  // seconds
    this._nitroCharge   = 1;  // 0-1
    this._shieldActive  = false;
    this._shieldTime    = 0;
    this._shieldDuration = 6;

    // Touch / keyboard input state (player only)
    this._input = { accel: false, brake: false, left: false, right: false, nitro: false };

    // Init heading from entity rotation
    var angles = this.entity.getEulerAngles();
    this._heading = angles.y;

    if (this.isPlayer) {
        this._setupInput();
        // Expose to UI
        this.app.globals = this.app.globals || {};
        this.app.globals.playerController = this;
    }

    // Particle trail entity (created in main.js, referenced here)
    this._trailEntity = null;

    // Wall bounce restitution (set by track generator)
    this._lastSafePos   = this._pos.clone();
    this._lastSafeHeading = this._heading;
    this._offTrackTime  = 0;
};

// ---- Input Setup ---------------------------------------------------
CarController.prototype._setupInput = function () {
    var input = this._input;
    var kb    = this.app.keyboard;

    // Touch button references (set by UIManager after DOM ready)
    var self = this;
    this.app.on('input:left',   function (on) { input.left   = on; });
    this.app.on('input:right',  function (on) { input.right  = on; });
    this.app.on('input:accel',  function (on) { input.accel  = on; });
    this.app.on('input:brake',  function (on) { input.brake  = on; });
    this.app.on('input:nitro',  function (on) { input.nitro  = on; self._tryNitro(); });
};

CarController.prototype._tryNitro = function () {
    if (this._nitroCharge >= 0.25 && !this._nitroActive) {
        this._nitroActive = true;
        this._nitroTime   = 0;
        this.app.fire('ui:nitroActive', true);
    }
};

// ---- Power-up Activation ------------------------------------------
CarController.prototype.activatePowerup = function (type) {
    if (type === 'nitro') {
        this._nitroCharge = Math.min(this._nitroCharge + 0.5, 1);
        this.app.fire('ui:powerupFlash', 'NITRO');
    } else if (type === 'shield') {
        this._shieldActive = true;
        this._shieldTime   = 0;
        this.app.fire('ui:powerupFlash', 'SHIELD');
    } else if (type === 'repair') {
        this._speed = Math.max(this._speed, 5);
        this.app.fire('ui:powerupFlash', 'REPAIR');
    }
};

// ---- Main Update ---------------------------------------------------
CarController.prototype.update = function (dt) {
    var gm = this.app.globals && this.app.globals.gameManager;
    if (!gm) return;

    var racing   = (gm.state === 'racing');
    var countdown = (gm.state === 'countdown');

    if (countdown) {
        // Allow engine rev but no movement
        this._applyFriction(dt);
        return;
    }

    if (!racing) {
        this._applyFriction(dt);
        return;
    }

    var input = this.isPlayer ? this._input : this._aiInput || this._input;

    // Keyboard override for desktop testing
    if (this.isPlayer && this.app.keyboard) {
        var kb = this.app.keyboard;
        if (kb.isPressed(pc.KEY_W) || kb.isPressed(pc.KEY_UP))    input.accel = true;
        if (kb.isPressed(pc.KEY_S) || kb.isPressed(pc.KEY_DOWN))  input.brake = true;
        if (kb.isPressed(pc.KEY_A) || kb.isPressed(pc.KEY_LEFT))  input.left  = true;
        if (kb.isPressed(pc.KEY_D) || kb.isPressed(pc.KEY_RIGHT)) input.right = true;
        if (kb.isPressed(pc.KEY_SPACE))                            input.nitro = true;

        if (!kb.isPressed(pc.KEY_W) && !kb.isPressed(pc.KEY_UP))    input.accel = false;
        if (!kb.isPressed(pc.KEY_S) && !kb.isPressed(pc.KEY_DOWN))  input.brake = false;
        if (!kb.isPressed(pc.KEY_A) && !kb.isPressed(pc.KEY_LEFT))  input.left  = false;
        if (!kb.isPressed(pc.KEY_D) && !kb.isPressed(pc.KEY_RIGHT)) input.right = false;
    }

    // ---- Nitro Update ----
    this._updateNitro(dt, input);

    var effectiveMax = this.maxSpeed * (this._nitroActive ? this.nitroPower : 1.0);

    // ---- Speed Update ----
    if (input.accel) {
        this._speed += this.acceleration * dt;
    } else if (input.brake) {
        if (this._speed > 0) {
            this._speed -= this.brakeForce * dt;
        } else {
            this._speed -= (this.brakeForce * 0.4) * dt; // reverse slower
        }
    } else {
        this._applyFriction(dt);
    }

    this._speed = Math.max(-this.maxSpeed * 0.3, Math.min(this._speed, effectiveMax));

    // ---- Steering ----
    var speedRatio    = Math.abs(this._speed) / this.maxSpeed;
    var steerSensitivity = this.turnSpeed * Math.min(speedRatio + 0.15, 1.0);
    var isDrifting    = input.brake && this._speed > 10;
    if (isDrifting) steerSensitivity *= 1.4;

    var steerTarget = 0;
    if (input.left)  steerTarget = -1;
    if (input.right) steerTarget =  1;
    if (this._speed < 0) steerTarget *= -1; // flip steering in reverse

    this._steer = this._lerp(this._steer, steerTarget, isDrifting ? 6 * dt : 8 * dt);
    this._heading += this._steer * steerSensitivity * dt;

    // ---- Drift lateral bleed ----
    if (isDrifting) {
        this._speed *= (1 - 0.04 * (1 - this.driftFactor) * 60 * dt);
    }

    // ---- Move in heading direction ----
    var rad = this._heading * Math.PI / 180;
    var dx = Math.sin(rad) * this._speed * dt;
    var dz = Math.cos(rad) * this._speed * dt;

    this._pos = this.entity.getPosition();
    var newX = this._pos.x + dx;
    var newZ = this._pos.z + dz;

    this.entity.setPosition(newX, this._pos.y, newZ);
    this.entity.setEulerAngles(0, this._heading, this._steer * -8); // body lean

    // ---- Wheel Tilt (visual) ----
    // Apply visual Y offset based on speed (road hugging feel)

    // ---- Shield Update ----
    if (this._shieldActive) {
        this._shieldTime += dt;
        if (this._shieldTime >= this._shieldDuration) {
            this._shieldActive = false;
            this.app.fire('ui:powerupFlash', null);
        }
    }

    // ---- Save safe position every 0.5s (for reset if stuck) ----
    this._safeTimer = (this._safeTimer || 0) + dt;
    if (this._safeTimer > 0.5 && this._speed > 3) {
        this._safeTimer = 0;
        this._lastSafePos.copy(this.entity.getPosition());
        this._lastSafeHeading = this._heading;
    }

    // ---- Emit HUD data ----
    if (this.isPlayer) {
        var mph = Math.round(Math.abs(this._speed) * 1.5);
        this.app.fire('ui:speed', mph, Math.abs(this._speed) / effectiveMax);
        this.app.fire('ui:nitroCharge', this._nitroCharge);
    }
};

CarController.prototype._updateNitro = function (dt, input) {
    if (this._nitroActive) {
        this._nitroTime += dt;
        this._nitroCharge = Math.max(0, 1 - this._nitroTime / this._nitroDuration);
        if (this._nitroTime >= this._nitroDuration || this._nitroCharge <= 0) {
            this._nitroActive = false;
            this.app.fire('ui:nitroActive', false);
        }
    } else {
        // Passive recharge
        this._nitroCharge = Math.min(this._nitroCharge + 0.04 * dt, 1);
    }

    // Player pressing nitro button
    if (this.isPlayer && input.nitro && !this._nitroActive && this._nitroCharge >= 0.25) {
        this._tryNitro();
    }
};

CarController.prototype._applyFriction = function (dt) {
    if (this._speed > 0) {
        this._speed = Math.max(0, this._speed - this.friction * dt * 8);
    } else if (this._speed < 0) {
        this._speed = Math.min(0, this._speed + this.friction * dt * 8);
    }
};

CarController.prototype._lerp = function (a, b, t) {
    return a + (b - a) * Math.min(t, 1);
};

// Called by AIController to feed input
CarController.prototype.setAIInput = function (inputObj) {
    this._aiInput = inputObj;
};

// Reset car to last safe position (called by main when stuck)
CarController.prototype.resetToSafe = function () {
    this.entity.setPosition(this._lastSafePos);
    this._heading = this._lastSafeHeading + 180; // face forward again
    this._speed   = 5;
};

CarController.prototype.getSpeed  = function () { return Math.abs(this._speed); };
CarController.prototype.getHeading = function () { return this._heading; };
