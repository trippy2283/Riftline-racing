/* =====================================================
   PowerUp.js
   Floating collectable orb. Detects proximity to player car
   and fires a pickup event. Respawns after a cooldown.
   ===================================================== */

var PowerUp = pc.createScript('powerUp');

PowerUp.attributes.add('powerType',    { type: 'string', default: 'nitro' }); // nitro | shield | repair
PowerUp.attributes.add('pickupRadius', { type: 'number', default: 3 });
PowerUp.attributes.add('respawnTime',  { type: 'number', default: 12 }); // seconds

PowerUp.prototype.initialize = function () {
    this._active    = true;
    this._timer     = 0;
    this._pos       = new pc.Vec3();
    this._playerPos = new pc.Vec3();
    this._spinAngle = 0;
    this._baseY     = this.entity.getPosition().y;

    // Colour mapping
    var colorMap = {
        nitro:  { r: 1,    g: 0.4,  b: 0  },
        shield: { r: 0.1,  g: 0.5,  b: 1  },
        repair: { r: 0.1,  g: 0.85, b: 0.3 }
    };
    this._color = colorMap[this.powerType] || colorMap.nitro;
};

PowerUp.prototype.update = function (dt) {
    if (!this._active) {
        this._timer -= dt;
        if (this._timer <= 0) {
            this._setVisible(true);
            this._active = true;
        }
        return;
    }

    // Spin + bob animation
    this._spinAngle += 90 * dt;
    this.entity.setEulerAngles(0, this._spinAngle, 0);
    var bob = this._baseY + Math.sin(this._spinAngle * 0.05) * 0.3;
    var curPos = this.entity.getPosition();
    this.entity.setPosition(curPos.x, bob, curPos.z);

    // Check proximity to player
    var gm = this.app.globals && this.app.globals.gameManager;
    if (!gm || !gm.playerCar) return;

    this.entity.getPosition(this._pos);
    gm.playerCar.getPosition(this._playerPos);

    var dx = this._playerPos.x - this._pos.x;
    var dz = this._playerPos.z - this._pos.z;
    if (dx * dx + dz * dz < this.pickupRadius * this.pickupRadius) {
        this._collect();
    }
};

PowerUp.prototype._collect = function () {
    this._active = false;
    this._timer  = this.respawnTime;
    this._setVisible(false);
    this.app.fire('powerup:collected', this.powerType, this.entity);
};

PowerUp.prototype._setVisible = function (visible) {
    this.entity.children.forEach(function (child) {
        child.enabled = visible;
    });
};
