/* =====================================================
   VehicleStats.js
   Calculates effective vehicle stats from base car +
   installed upgrades + damage penalty.
   Attaches to: VehicleStats entity (created in main.js)
   ===================================================== */

var VehicleStats = pc.createScript('vehicleStats');

VehicleStats.prototype.initialize = function () {
    this.app.globals = this.app.globals || {};
    this.app.globals.vehicleStats = this;
    this._stats = null;
    this._recalc();

    var self = this;
    this.app.on('save:activeCarChanged', function () { self._recalc(); });
    this.app.on('save:upgradeInstalled', function () { self._recalc(); });
    this.app.on('save:carRepaired',      function () { self._recalc(); });
};

VehicleStats.prototype._recalc = function () {
    var sm = window.SaveManager;
    if (!sm) return;

    var carId = sm.getActiveCar();
    var base  = window.CarCatalog ? window.CarCatalog.getCar(carId) : null;
    if (!base) return;

    var stats = {
        horsepower:     base.horsepower,
        torque:         base.torque,
        weight:         base.weight,
        drivetrain:     base.drivetrain,
        grip:           base.grip,
        brakeForce:     base.brakeForce,
        handling:       base.handling,
        heatResistance: base.heatResistance,
        durability:     base.durability,
        topSpeedMph:    base.topSpeedMph
    };

    var upgrades = sm.getUpgrades(carId);
    Object.keys(upgrades).forEach(function (cat) {
        var tier = upgrades[cat];
        var data = window.UpgradeCatalog ? window.UpgradeCatalog.getTier(cat, tier) : null;
        if (!data) return;
        Object.keys(data.statMods).forEach(function (key) {
            if (stats[key] !== undefined) stats[key] *= data.statMods[key];
        });
    });

    var damage     = sm.getDamage(carId);
    var dmgPenalty = 1 - (damage / 100) * 0.28;
    stats.horsepower *= dmgPenalty;
    stats.torque     *= dmgPenalty;
    stats.brakeForce *= dmgPenalty;
    stats.handling   *= dmgPenalty;

    this._stats = stats;
    this.app.fire('vehicle:statsUpdated', stats);
};

VehicleStats.prototype.get    = function (key) { return this._stats ? (this._stats[key] || 0) : 0; };
VehicleStats.prototype.getAll = function ()     { return this._stats; };
VehicleStats.prototype.recalc = function ()     { this._recalc(); };
