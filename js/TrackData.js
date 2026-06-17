/* =====================================================
   TrackData.js
   Waypoint definitions for every city track.
   Waypoints are [x, z] pairs in world units.
   ===================================================== */

window.TrackData = (function () {

    function rotatePoints(pts, deg) {
        var rad = deg * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);
        return pts.map(function (p) {
            return [p[0] * cos - p[1] * sin, p[0] * sin + p[1] * cos];
        });
    }

    function scalePoints(pts, s) {
        return pts.map(function (p) { return [p[0] * s, p[1] * s]; });
    }

    var tracks = {};

    // TULSA — Tulsa Raceway Park
    tracks['tulsa'] = {
        width: 16,
        startIndex: 0,
        waypoints: [
            [0,0],[20,0],[45,0],[75,0],[110,0],[140,0],
            [155,12],[160,30],[155,50],[140,60],[120,62],
            [100,58],[80,50],[65,38],[60,22],[62,8],
            [70,0],[90,-5],[105,-2],[105,12],[100,28],
            [88,38],[72,42],[55,40],[40,32],[30,18],
            [18,8],[0,0]
        ]
    };

    // LOS ANGELES — Hollywood Hills Loop
    tracks['los_angeles'] = {
        width: 14,
        startIndex: 0,
        waypoints: [
            [0,0],[30,-5],[60,-5],[90,0],[110,20],[120,50],
            [115,80],[100,105],[75,120],[50,120],[25,110],
            [10,95],[5,70],[15,50],[35,40],[55,45],[65,60],
            [60,80],[45,85],[30,80],[20,65],[25,50],[45,40],
            [65,25],[75,0],[50,-8],[25,-6],[0,0]
        ]
    };

    // MIAMI — South Beach Circuit
    tracks['miami'] = {
        width: 16,
        startIndex: 0,
        waypoints: [
            [0,0],[40,0],[80,0],[120,5],[150,20],[160,50],
            [155,80],[140,105],[120,120],[100,125],[80,120],
            [65,105],[60,85],[68,65],[85,55],[100,60],[110,75],
            [108,95],[90,108],[65,110],[40,105],[20,90],[5,70],
            [-5,45],[0,20],[0,0]
        ]
    };

    // CHICAGO — Lakeshore Drive Speedway
    tracks['chicago'] = {
        width: 18,
        startIndex: 0,
        waypoints: (function () {
            var pts = [];
            var n = 24;
            for (var i = 0; i < n; i++) {
                var t = (i / n) * Math.PI * 2;
                var rx = 90 + 20 * Math.cos(t * 2);
                var rz = 55;
                pts.push([rx * Math.cos(t), rz * Math.sin(t)]);
            }
            return pts;
        })()
    };

    // NEW YORK — Brooklyn Bridge Sprint
    tracks['new_york'] = {
        width: 13,
        startIndex: 0,
        waypoints: [
            [0,0],[25,0],[50,0],[75,2],[90,15],[90,35],
            [90,55],[75,65],[55,65],[40,60],[30,50],[30,35],
            [35,22],[50,18],[65,20],[75,30],[75,48],[60,58],
            [45,58],[30,52],[20,42],[15,28],[20,12],[0,0]
        ]
    };

    // LAS VEGAS — Neon Strip Grand Prix
    tracks['las_vegas'] = {
        width: 16,
        startIndex: 0,
        waypoints: [
            [0,0],[40,0],[80,0],[130,0],[160,10],[165,40],
            [155,65],[135,75],[110,70],[90,60],[75,45],[80,25],
            [95,15],[115,20],[130,35],[125,60],[105,72],
            [80,75],[55,72],[35,60],[20,45],[15,25],[0,0]
        ]
    };

    // SAN FRANCISCO — Golden Gate Inferno
    tracks['san_francisco'] = {
        width: 13,
        startIndex: 0,
        waypoints: [
            [0,0],[20,-5],[45,-2],[65,10],[75,30],[70,55],
            [55,72],[40,80],[20,82],[5,75],[-5,60],[-8,42],
            [0,28],[15,22],[32,28],[45,42],[48,60],[38,72],
            [22,75],[8,68],[0,55],[2,38],[12,28],[28,22],
            [42,20],[52,10],[45,-5],[20,-8],[0,0]
        ]
    };

    // SEATTLE — Emerald City Speedway
    tracks['seattle'] = {
        width: 14,
        startIndex: 0,
        waypoints: [
            [0,0],[30,0],[60,5],[85,20],[95,45],[90,70],
            [75,90],[55,100],[35,100],[15,92],[2,78],
            [-2,60],[5,45],[20,38],[38,40],[52,50],[58,65],
            [50,80],[33,85],[15,80],[2,68],[0,50],[8,35],
            [22,28],[38,25],[50,15],[42,-5],[20,-8],[0,0]
        ]
    };

    // NEW ORLEANS — French Quarter Grand Circuit
    tracks['new_orleans'] = {
        width: 12,
        startIndex: 0,
        waypoints: [
            [0,0],[18,0],[35,5],[45,18],[45,32],[38,42],
            [25,48],[12,48],[2,40],[0,28],[8,18],[22,14],
            [36,18],[45,30],[45,45],[35,56],[20,62],[5,60],
            [-5,50],[-8,36],[-2,22],[10,15],[25,10],[38,4],
            [35,-8],[18,-10],[0,0]
        ]
    };

    return {
        getTrack: function (cityId) {
            return tracks[cityId] || tracks['los_angeles'];
        },
        allTrackIds: function () {
            return Object.keys(tracks);
        }
    };
})();
