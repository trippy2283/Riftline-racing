/* =====================================================
   CarCatalog.js
   All buyable cars. window.CarCatalog singleton.
   ===================================================== */

window.CarCatalog = (function () {
    var _cars = [
        {
            id: 'mare_gt_t85',
            name: 'Mare GT-T85',
            class: 'D',
            price: 0,
            ownedByDefault: true,
            drivetrain: 'RWD',
            weight: 3100,
            horsepower: 145,
            torque: 160,
            grip: 0.72,
            brakeForce: 0.68,
            handling: 0.65,
            heatResistance: 0.55,
            durability: 0.75,
            topSpeedMph: 118,
            color: '#c0392b',
            description: 'A worn but spirited rear-driver. Your starting ride — not fast, but it can be built.'
        },
        {
            id: 'foxline_289',
            name: 'Foxline 289',
            class: 'C',
            price: 8500,
            ownedByDefault: false,
            drivetrain: 'RWD',
            weight: 2850,
            horsepower: 210,
            torque: 220,
            grip: 0.78,
            brakeForce: 0.74,
            handling: 0.72,
            heatResistance: 0.62,
            durability: 0.78,
            topSpeedMph: 138,
            color: '#2471a3',
            description: 'Classic pony car with a small-block under the hood. Balanced and predictable.'
        },
        {
            id: 'coyote_302r',
            name: 'Coyote 302R',
            class: 'B',
            price: 18000,
            ownedByDefault: false,
            drivetrain: 'RWD',
            weight: 3250,
            horsepower: 335,
            torque: 370,
            grip: 0.82,
            brakeForce: 0.80,
            handling: 0.75,
            heatResistance: 0.68,
            durability: 0.82,
            topSpeedMph: 158,
            color: '#1a1a1a',
            description: 'Muscle meets refinement. A modern bruiser that respects the driver.'
        },
        {
            id: 'vandal_s13',
            name: 'Vandal S13',
            class: 'C',
            price: 11500,
            ownedByDefault: false,
            drivetrain: 'RWD',
            weight: 2650,
            horsepower: 185,
            torque: 175,
            grip: 0.85,
            brakeForce: 0.78,
            handling: 0.88,
            heatResistance: 0.58,
            durability: 0.70,
            topSpeedMph: 132,
            color: '#1e8449',
            description: 'Lightweight Japanese coupe. Loose, fast, responsive — a drifter\'s weapon.'
        },
        {
            id: 'ironvale_454',
            name: 'Ironvale 454',
            class: 'B',
            price: 22000,
            ownedByDefault: false,
            drivetrain: 'RWD',
            weight: 3800,
            horsepower: 450,
            torque: 510,
            grip: 0.74,
            brakeForce: 0.72,
            handling: 0.62,
            heatResistance: 0.72,
            durability: 0.90,
            topSpeedMph: 162,
            color: '#6c3483',
            description: 'Big-block Oklahoma iron. Pure torque that punishes the track and rewards commitment.'
        },
        {
            id: 'ravenna_rs4',
            name: 'Ravenna RS4',
            class: 'A',
            price: 42000,
            ownedByDefault: false,
            drivetrain: 'AWD',
            weight: 3550,
            horsepower: 444,
            torque: 465,
            grip: 0.92,
            brakeForce: 0.88,
            handling: 0.86,
            heatResistance: 0.80,
            durability: 0.85,
            topSpeedMph: 174,
            color: '#d35400',
            description: 'European performance meets American hunger. All-wheel drive, all business.'
        }
    ];

    var _index = {};
    _cars.forEach(function (c) { _index[c.id] = c; });

    return {
        getAll: function () { return _cars; },
        getCar: function (id) { return _index[id] || null; }
    };
})();
