/* =====================================================
   SaveManager.js
   localStorage persistence — window.SaveManager singleton.
   Call window.SaveManager.init(app) in main.js.
   ===================================================== */

window.SaveManager = (function () {
    var SAVE_KEY = 'riftline_v3';
    var _data    = null;
    var _app     = null;

    function _defaults() {
        return {
            money:      2500,
            ownedCars:  ['mare_gt_t85'],
            activeCar:  'mare_gt_t85',
            upgrades:   {},
            damage:     {},
            bestTimes:  {},
            totalRaces: 0,
            totalWins:  0
        };
    }

    function _load() {
        try {
            var raw = localStorage.getItem(SAVE_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                var def = _defaults();
                for (var k in def) {
                    if (d[k] === undefined) d[k] = def[k];
                }
                return d;
            }
        } catch (e) {}
        return _defaults();
    }

    function _save() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(_data)); } catch (e) {}
    }

    function _fire(ev, data) {
        if (_app) _app.fire(ev, data);
    }

    return {
        init: function (app) {
            _app  = app || null;
            _data = _load();
        },

        getMoney:   function ()  { return _data.money; },
        addMoney:   function (n) { _data.money += n; _save(); _fire('save:moneyChanged', _data.money); },
        spendMoney: function (n) {
            if (_data.money < n) return false;
            _data.money -= n;
            _save();
            _fire('save:moneyChanged', _data.money);
            return true;
        },

        ownsCar:      function (id) { return _data.ownedCars.indexOf(id) !== -1; },
        getOwnedCars: function ()   { return _data.ownedCars.slice(); },
        buyCar: function (id, price) {
            if (!this.spendMoney(price)) return false;
            if (!this.ownsCar(id)) _data.ownedCars.push(id);
            _save();
            _fire('save:carBought', id);
            return true;
        },
        getActiveCar: function ()   { return _data.activeCar; },
        setActiveCar: function (id) {
            _data.activeCar = id;
            _save();
            _fire('save:activeCarChanged', id);
        },

        getUpgrades: function (carId)           { return _data.upgrades[carId] || {}; },
        installUpgrade: function (carId, cat, tier) {
            if (!_data.upgrades[carId]) _data.upgrades[carId] = {};
            _data.upgrades[carId][cat] = tier;
            _save();
            _fire('save:upgradeInstalled', { carId: carId, cat: cat, tier: tier });
        },

        getDamage:  function (carId)      { return _data.damage[carId] || 0; },
        setDamage:  function (carId, val) {
            _data.damage[carId] = Math.max(0, Math.min(100, val));
            _save();
        },
        repairCar: function (carId) {
            _data.damage[carId] = 0;
            _save();
            _fire('save:carRepaired', carId);
        },

        getBestTime: function (trackId) { return _data.bestTimes[trackId] || null; },
        recordTime: function (trackId, secs) {
            var prev = _data.bestTimes[trackId];
            var isBest = !prev || secs < prev;
            if (isBest) { _data.bestTimes[trackId] = secs; _save(); }
            return isBest;
        },
        recordRaceResult: function (won) {
            _data.totalRaces++;
            if (won) _data.totalWins++;
            _save();
        },

        ownerUnlock: function () {
            _data.money = Math.max(_data.money, 999999);
            if (window.CarCatalog) {
                window.CarCatalog.getAll().forEach(function (c) {
                    if (_data.ownedCars.indexOf(c.id) === -1) _data.ownedCars.push(c.id);
                });
            }
            _save();
            _fire('save:ownerUnlocked', null);
        },

        reset: function () {
            _data = _defaults();
            _save();
            _fire('save:reset', null);
        }
    };
})();
