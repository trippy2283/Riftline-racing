/* =====================================================
   StoryManager.js
   Manages the Riftline Racing narrative:
   characters, dialogue beats, branching career path
   (Legal vs Underground), story milestones.
   ===================================================== */

window.StoryManager = (function () {

    var CHARACTERS = {
        player: {
            id: 'player', name: 'YOU', role: 'Protagonist',
            bio: '18-year-old fourth-generation mechanic. Grew up under hoods. You want more than oil changes — you want to race.'
        },
        father: {
            id: 'father', name: 'DAD', fullName: 'Ray (Your Father)', role: 'Antagonist/Mentor',
            portrait: '👨‍🔧',
            bio: 'Dreamed of racing but never made it. Poured those dreams into the Mare GT-T85. Sees your ambitions as both a mirror and a wound.',
            relationship: 50
        },
        doyle: {
            id: 'doyle', name: 'DOYLE', fullName: 'Doyle MacAllister', role: 'Mentor',
            portrait: '🧓',
            bio: 'Retired mechanic who never raced professionally. Spent youth on Oklahoma backroads. Teaches you technique, tells you the cost of chasing speed.',
            relationship: 40
        },
        blaze: {
            id: 'blaze', name: 'BLAZE', fullName: 'Blaze (underground champion)', role: 'Rival',
            portrait: '😤',
            bio: 'Street royalty. Never wanted sanctioning bodies or world tours — only rep matters. Pushes competitors toward guardrails. Untouchable… until you.',
            relationship: 10
        },
        enforcer: {
            id: 'enforcer', name: 'THE ENFORCER', fullName: 'Vic Crane (The Enforcer)', role: 'Fixer',
            portrait: '🕶',
            bio: 'Orchestrates illegal races. Businessman. Respects skill, punishes betrayal. Profit over passion.',
            relationship: 30
        },
        grandfather: {
            id: 'grandfather', name: 'GRANDDAD', fullName: 'Pop (Grandfather, deceased)', role: 'Ghost/Inspiration',
            portrait: '👴',
            bio: 'Took you to dirt rallies as a child. Saw racing as art. His death left the biggest void — and your clearest reason to drive.',
            relationship: 100
        }
    };

    var MILESTONES = [
        {
            id: 'first_race', title: 'FIRST RACE', chapter: 1,
            trigger: { event: 'race:playerFinished', cityId: 'tulsa', minPosition: 1 },
            requiredWins: 0,
            scenes: [
                { char: 'player', text: "The Mare GT-T85 smells like Dad's shop — oil and old ambition. Tonight it smells like victory.", mood: 'excited' },
                { char: 'doyle', text: "You didn't just drive it. You felt it. Most kids your age would've spun out in turn two. How long you been wrenching?", mood: 'impressed' },
                { char: 'player', text: "Since I could reach the hood.", mood: 'calm' },
                { char: 'doyle', text: "Then come find me tomorrow. I'll show you something worth knowing.", mood: 'serious' }
            ],
            effect: { doyle_relationship: +20, father_relationship: -10, unlockDialogue: 'doyle_teaches' }
        },
        {
            id: 'car_noticed', title: "DAD NOTICES", chapter: 1,
            trigger: { event: 'career:wins', count: 2 },
            scenes: [
                { char: 'father', text: "Fresh rubber. Exhaust burn on the driveway. You took the GT.", mood: 'cold' },
                { char: 'player', text: "I brought it back. Nothing happened to it.", mood: 'nervous' },
                { char: 'father', text: "I built that car for twenty years. You don't get to just take it. You want to race? Go flip burgers and buy your own.", mood: 'angry' }
            ],
            effect: { father_relationship: -20, unlocksChoice: 'keep_or_return_mare' }
        },
        {
            id: 'doyle_teaches', title: "UNDER THE HOOD WITH DOYLE", chapter: 1,
            trigger: { event: 'career:wins', count: 3 },
            scenes: [
                { char: 'doyle', text: "Weight transfer. That's the whole game. A car doesn't turn — it falls, and you catch it with the throttle. Understand?", mood: 'teaching' },
                { char: 'player', text: "I need to shift weight to the front before the apex.", mood: 'focused' },
                { char: 'doyle', text: "Kid, I spent thirty years figuring that out. You've got a gift. Don't bury it chasing shortcuts.", mood: 'earnest' }
            ],
            effect: { doyle_relationship: +15, physicsBonus: { handling: 0.05 } }
        },
        {
            id: 'blaze_challenge', title: "BLAZE CALLS YOU OUT", chapter: 2,
            trigger: { event: 'career:wins', count: 5 },
            scenes: [
                { char: 'blaze', text: "I heard you've been winning at Tulsa. Cute. Let's see if you've got what it takes when the crowd is watching YOU lose.", mood: 'menacing' },
                { char: 'player', text: "Name the place.", mood: 'cool' },
                { char: 'blaze', text: "Miami. South Beach Circuit. Three laps. No second chances.", mood: 'smug' }
            ],
            effect: { blazeUnlocked: true }
        },
        {
            id: 'car_sold', title: "THE SALE", chapter: 2,
            trigger: { event: 'career:wins', count: 5, path: 'underground' },
            scenes: [
                { char: 'father', text: "I sold the GT this morning. I'm done watching you do what I never could. It hurts, alright? It just hurts.", mood: 'broken' },
                { char: 'player', text: "You sold it? That was my car—", mood: 'shocked' },
                { char: 'father', text: "It was MINE. Every bolt. Every late night. Go build your own dream. I'm done sharing mine.", mood: 'final' }
            ],
            effect: { father_relationship: -30, removeCar: 'mare_gt', unlocksQuest: 'buy_back_mare' }
        },
        {
            id: 'new_years_eve', title: "NEW YEAR'S EVE RUN", chapter: 3,
            trigger: { event: 'career:wins', count: 8, path: 'underground' },
            scenes: [
                { char: 'enforcer', text: "Fog's rolling in off the lake. You've got forty-two minutes to get those parts across town. Police change shift at midnight. Be gone by then.", mood: 'business' },
                { char: 'player', text: "Forty-two minutes through fog. On New Year's Eve.", mood: 'disbelief' },
                { char: 'enforcer', text: "Thirty-nine now. Clock's running.", mood: 'cold' }
            ],
            effect: { unlockMission: 'nye_delivery', enforcer_relationship: +20 }
        },
        {
            id: 'the_fork', title: "THE FORK", chapter: 3,
            trigger: { event: 'career:wins', count: 10 },
            scenes: [
                { char: 'doyle', text: "Regional team called. They want you at tryouts next month, Tulsa Raceway. Legit license. Sponsor money. Your grandfather would've loved this.", mood: 'proud' },
                { char: 'enforcer', text: "The regional team can wait. I've got a score that sets you up for life. One run. Cross me on this and we're done.", mood: 'threat' }
            ],
            unlocksChoice: 'legal_vs_underground',
            effect: {}
        },
        {
            id: 'legal_endgame', title: "FATHER'S RECKONING", chapter: 4,
            trigger: { event: 'career:wins', count: 14, path: 'legal' },
            scenes: [
                { char: 'father', text: "I watched the race on my phone. From the shop. You… you drive just like I always imagined I would.", mood: 'quiet' },
                { char: 'player', text: "Come to the next one. Sit in the pits with me.", mood: 'open' },
                { char: 'father', text: "Yeah. Yeah, maybe I will.", mood: 'hope' }
            ],
            effect: { father_relationship: +40, ending: 'legal_victory' }
        }
    ];

    var PATHS = {
        legal: {
            id: 'legal', name: 'LICENSED RACER',
            description: 'Sanctioned events, sponsors, legitimate glory. Fulfil the dream your father never could.',
            color: '#2288ff',
            benefits: ['Sponsors provide parts discounts','Police treat you as pro','Media attention unlocks fans','Stable income'],
            risks: ['Restricted to legal venues','Must decline Enforcer missions']
        },
        underground: {
            id: 'underground', name: 'UNDERGROUND KING',
            description: 'Higher stakes, higher pay, higher heat. Your name becomes legend in parking lots.',
            color: '#cc0000',
            benefits: ['Chop shops source rare parts','Underground events pay 2x credits','Enforcer inner circle unlocks'],
            risks: ['Police heat increases','Father relationship suffers','Jail risk on failed missions']
        }
    };

    var _app          = null;
    var _career       = null;
    var _currentPath  = 'undecided';
    var _completedMilestones = {};
    var _relationships = { father: 50, doyle: 40, blaze: 10, enforcer: 30 };

    function init(app, career) {
        _app    = app;
        _career = career;

        if (career.save.story) {
            _currentPath         = career.save.story.path || 'undecided';
            _relationships       = career.save.story.relationships || _relationships;
            _completedMilestones = career.save.story.completed || {};
        }

        app.on('career:pathChosen', _onPathChosen);
    }

    function _onPathChosen(pathId) {
        _currentPath = pathId;
        _save();
        _app.fire('story:pathChanged', pathId, PATHS[pathId]);
    }

    function checkTriggers(event, payload) {
        var wins = _career.save.totalWins;
        MILESTONES.forEach(function (ms) {
            if (_completedMilestones[ms.id]) return;
            if (ms.trigger.event !== event) return;
            if (ms.trigger.count && wins < ms.trigger.count) return;
            if (ms.trigger.minPosition && payload && payload.position > ms.trigger.minPosition) return;
            if (ms.trigger.path && ms.trigger.path !== _currentPath && _currentPath !== 'undecided') return;
            if (ms.trigger.cityId && payload && payload.cityId && payload.cityId !== ms.trigger.cityId) return;
            _triggerMilestone(ms);
        });
    }

    function _triggerMilestone(ms) {
        _completedMilestones[ms.id] = true;
        _applyEffect(ms.effect || {});
        _save();
        _app.fire('story:milestone', ms);
        if (ms.scenes && ms.scenes.length) {
            _app.fire('story:showScene', { milestone: ms, scenes: ms.scenes });
        }
        if (ms.unlocksChoice) {
            _app.fire('story:showChoice', ms.unlocksChoice, ms);
        }
    }

    function _applyEffect(effect) {
        if (effect.father_relationship) {
            _relationships.father = Math.max(0, Math.min(100, _relationships.father + effect.father_relationship));
        }
        if (effect.doyle_relationship) {
            _relationships.doyle  = Math.max(0, Math.min(100, _relationships.doyle  + effect.doyle_relationship));
        }
        if (effect.enforcer_relationship) {
            _relationships.enforcer = Math.max(0, Math.min(100, _relationships.enforcer + effect.enforcer_relationship));
        }
        if (effect.removeCar && _career) {
            if (_career.save.unlockedCars.indexOf('mare_gt') !== -1 && effect.removeCar === 'mare_gt') {
                var idx = _career.save.unlockedCars.indexOf('mare_gt');
                _career.save.unlockedCars.splice(idx, 1);
                if (_career.save.selectedCar === 'mare_gt') _career.save.selectedCar = 'vector_x';
                var car = _career.getCar('mare_gt');
                if (car) { car.unlocked = false; car.cost = 800; }
                _career.persist();
            }
        }
    }

    function _save() {
        if (_career) {
            _career.save.story = {
                path:          _currentPath,
                relationships: _relationships,
                completed:     _completedMilestones
            };
            _career.persist();
        }
    }

    function getRelationship(charId) { return _relationships[charId] || 50; }
    function getCurrentPath()        { return _currentPath; }
    function getPaths()              { return PATHS; }
    function getCharacter(id)        { return CHARACTERS[id] || null; }
    function getMilestone(id)        { return MILESTONES.find(function (m) { return m.id === id; }) || null; }

    return {
        init,
        checkTriggers,
        getRelationship,
        getCurrentPath,
        getPaths,
        getCharacter,
        getMilestone,
        CHARACTERS,
        MILESTONES,
        PATHS
    };
})();
