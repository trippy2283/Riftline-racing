/* =====================================================
   UpgradeCatalog.js
   Upgrade categories, tiers, and stat multipliers.
   window.UpgradeCatalog singleton.
   ===================================================== */

window.UpgradeCatalog = (function () {
    var _catalog = {
        tires: {
            label: 'Tires',
            tiers: [
                { tier: 1, name: 'Performance All-Season', price: 800,  statMods: { grip: 1.08, handling: 1.05 } },
                { tier: 2, name: 'Semi-Slick Sport',       price: 1800, statMods: { grip: 1.18, handling: 1.12 } },
                { tier: 3, name: 'Racing Compound',        price: 3500, statMods: { grip: 1.30, handling: 1.22 } }
            ]
        },
        brakes: {
            label: 'Brakes',
            tiers: [
                { tier: 1, name: 'Slotted Rotors',        price: 600,  statMods: { brakeForce: 1.10 } },
                { tier: 2, name: 'Big Brake Kit',          price: 1600, statMods: { brakeForce: 1.22 } },
                { tier: 3, name: 'Carbon Ceramic Brakes', price: 3200, statMods: { brakeForce: 1.38 } }
            ]
        },
        intake: {
            label: 'Intake',
            tiers: [
                { tier: 1, name: 'Cold Air Intake',   price: 450,  statMods: { horsepower: 1.06, torque: 1.04 } },
                { tier: 2, name: 'Short Ram + Tune',  price: 1200, statMods: { horsepower: 1.14, torque: 1.10 } },
                { tier: 3, name: 'Turbo Stage 1',     price: 2800, statMods: { horsepower: 1.28, torque: 1.22, topSpeedMph: 1.08 } }
            ]
        },
        exhaust: {
            label: 'Exhaust',
            tiers: [
                { tier: 1, name: 'Cat-Back Exhaust',    price: 500,  statMods: { horsepower: 1.04, torque: 1.06 } },
                { tier: 2, name: 'Performance Headers', price: 1100, statMods: { horsepower: 1.10, torque: 1.12 } },
                { tier: 3, name: 'Full Race System',    price: 2200, statMods: { horsepower: 1.18, torque: 1.20 } }
            ]
        },
        radiator: {
            label: 'Radiator',
            tiers: [
                { tier: 1, name: 'Aluminum Upgrade',      price: 400,  statMods: { heatResistance: 1.15 } },
                { tier: 2, name: 'Dual-Core Racing Rad',  price: 900,  statMods: { heatResistance: 1.32 } },
                { tier: 3, name: 'Intercooler + Rad Kit', price: 1800, statMods: { heatResistance: 1.50 } }
            ]
        },
        suspension: {
            label: 'Suspension',
            tiers: [
                { tier: 1, name: 'Lowering Springs',  price: 700,  statMods: { handling: 1.08, grip: 1.04 } },
                { tier: 2, name: 'Coilover Kit',       price: 1700, statMods: { handling: 1.18, grip: 1.10 } },
                { tier: 3, name: 'Racing Coilovers',  price: 3000, statMods: { handling: 1.30, grip: 1.18 } }
            ]
        },
        weight_reduction: {
            label: 'Weight Reduction',
            tiers: [
                { tier: 1, name: 'Interior Strip',      price: 600,  statMods: { weight: 0.94, handling: 1.04 } },
                { tier: 2, name: 'Carbon Hood + Doors', price: 1400, statMods: { weight: 0.88, handling: 1.08, topSpeedMph: 1.02 } },
                { tier: 3, name: 'Full Carbon Build',   price: 2800, statMods: { weight: 0.78, handling: 1.15, topSpeedMph: 1.04 } }
            ]
        }
    };

    return {
        getAll:          function ()        { return _catalog; },
        getCategory:     function (cat)     { return _catalog[cat] || null; },
        getCategoryKeys: function ()        { return Object.keys(_catalog); },
        getTier: function (cat, tier) {
            var c = _catalog[cat];
            if (!c) return null;
            for (var i = 0; i < c.tiers.length; i++) {
                if (c.tiers[i].tier === tier) return c.tiers[i];
            }
            return null;
        }
    };
})();
