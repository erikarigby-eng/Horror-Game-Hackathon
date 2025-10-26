// Deterministic RNG for consistent playthroughs
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t>>>15, t | 1);
        t ^= t + Math.imul(t ^ t>>>7, t | 61);
        return ((t ^ t>>>14) >>> 0) / 4294967296;
    }
}

function seedFromHash(h) {
    if (!h) return 0;
    let n = 0;
    for (let i = 0; i < h.length; i++) {
        n = (n * 131 + h.charCodeAt(i)) >>> 0;
    }
    return n;
}

function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = (h * 33 + s.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(36);
}

const rng = mulberry32(seedFromHash(location.hash) || (Date.now() & 0x7fffffff));

// Game state
let gameState = {
    hasPaw: false,
    warned: false,
    wishCount: 0,
    sonDead: false,
    sonReturned: false,
    doorAnswered: false,
    knowsPrice: false,
    pawDestroyed: false,
    doorChained: false,
    atticKey: false,
    neighborAlerted: false,
    buriedPaw: false,
    burnedPaw: false,
    shadowLoose: false,
    knockHeard: false,
    currentScene: "S01",
    sectionCount: 0,
    phase: "intro", // intro -> middle -> late
    history: [], // store scene snippets for callbacks
    seenScenes: new Set(), // uniqueness guard
    visitedScenes: new Set(), // track unique scene ids visited
    seed: "",
    questionsAnswered: 0,
    skipMiniGames: false,
    lives: 3,
    maxLives: 3
};

// Motif pools for dynamic scene generation
const motifs = {
    room: [
        "A cold wind rattles the panes",
        "The lamp flickers like a dying heartbeat",
        "Shadows pool in corners that weren't there before",
        "The wallpaper seems to breathe in the candlelight",
        "Dust motes hang frozen in the air"
    ],
    paw: [
        "The Monkey's Paw curls as if remembering your name",
        "The withered paw lies heavy with unspoken promises",
        "Singed fur still smells of old magic and older regrets",
        "Its fingers count wishes you haven't made yet",
        "The paw twitches, patient as a spider"
    ],
    herbert: [
        "Herbert's laughter echoes from an empty room",
        "A photograph of Herbert watches from the mantle",
        "Herbert's chair creaks though no one sits there",
        "You smell machine oil and Herbert's tobacco",
        "Herbert's coat still hangs by the door"
    ],
    knock: [
        "A soft knock counts out your heartbeat",
        "Something taps your name in morse code",
        "The door rattles in its frame",
        "Knuckles drag across wood like a question",
        "Three knocks, then silence, then three more"
    ],
    machinery: [
        "You hear distant machinery grinding",
        "Metal screams somewhere far away",
        "The sound of gears catching on bone",
        "Industrial rhythm like a failing heart",
        "Steam hisses through broken teeth"
    ],
    money: [
        "Two hundred pounds in blood-warm coins",
        "Money that smells of copper and grief",
        "Compensation exact to the penny",
        "Bills that leave ash on your fingers",
        "Payment that arrives before the bill"
    ]
};

// Minimum unique sections before endings can trigger
const MIN_SECTIONS_BEFORE_ENDING = 30;

// Story scenes - Streamlined and unique content
const scenes = [
    // ACT 1: THE DISCOVERY
    {
        id: "S01",
        text: "The old sergeant-major left hours ago, but his words linger like smoke. The monkey's paw sits on your mantle, ugly and withered. Your son Herbert jokes about wishing for two hundred pounds, but nobody's laughing.",
        choices: [
            {text: "Pick up the paw to examine it closely", set: {hasPaw: true}, to: "S02"},
            {text: "Leave it alone - the warnings were clear", set: {warned: true}, to: "S03"},
            {text: "Throw it in the fire immediately", to: "S04"}
        ]
    },
    {
        id: "S02",
        text: "The paw feels heavier than it should, like it's made of compressed grief. As your fingers close around it, you swear it twitches. The room grows cold. Your wife enters, sees you holding it, and her face pales.",
        choices: [
            {text: "Make a wish for two hundred pounds", set: {wishCount: 1}, to: "S05"},
            {text: "Put it down and step away", to: "S03"},
            {text: "Ask your wife what she thinks", to: "S06"},
            {text: "Wish for unlimited wishes", to: "INSTANT_DEATH_1"}
        ]
    },
    {
        id: "S03",
        text: "Morning comes gray and ordinary. Herbert leaves for work at Maw and Meggins, laughing about last night's 'nonsense.' But your wife keeps glancing at the mantle. The paw hasn't moved, yet somehow it dominates the room.",
        choices: [
            {text: "Hide the paw in a drawer", set: {hasPaw: true}, to: "S07"},
            {text: "Continue your normal routine", to: "S08"},
            {text: "Visit the sergeant-major for more information", set: {warned: true}, to: "S09"}
        ]
    },
    {
        id: "S04",
        text: "The paw writhes in the flames like a living thing. A horrible smell fills the room - not burning fur, but something sweeter, like caramelized sorrow. When the fire dies, you see it among the coals, unburned, waiting.",
        choices: [
            {text: "Retrieve it with the poker", set: {hasPaw: true}, to: "S10"},
            {text: "Leave it in the ashes", to: "S11"},
            {text: "Bury the ashes in the garden", set: {pawDestroyed: true}, to: "S12"}
        ]
    },

    // ACT 2: THE FIRST WISH
    {
        id: "S05",
        text: "\"I wish for two hundred pounds.\" The words leave your mouth before you can stop them. The paw twists in your hand like a dying snake. Somewhere in the distance, machinery screams. You've made a terrible mistake.",
        choices: [
            {text: "Wait to see what happens", set: {sonDead: true}, to: "S13"},
            {text: "Try to take the wish back immediately", set: {wishCount: 2}, to: "S14"},
            {text: "Warn Herbert not to go to work", to: "S15"},
            {text: "Wish to know the future", to: "INSTANT_DEATH_5"}
        ]
    },
    {
        id: "S06",
        text: "Your wife's eyes are strange - hungry. 'We could pay off the house,' she whispers. 'Herbert could go to university. Just one small wish. What harm could it do?' She reaches for the paw.",
        choices: [
            {text: "Let her make the wish", set: {wishCount: 1}, to: "S16"},
            {text: "Stop her and explain the danger", set: {warned: true}, to: "S17"},
            {text: "Make the wish yourself to protect her", set: {wishCount: 1}, to: "S05"}
        ]
    },
    {
        id: "S07",
        text: "The drawer won't stay closed. Every time you leave the room, you return to find it slightly open. The paw is patient. It knows human nature better than you know yourself.",
        choices: [
            {text: "Lock it with a key", to: "S18"},
            {text: "Take it to the cemetery", to: "S19"},
            {text: "Give in and make a wish", set: {wishCount: 1}, to: "S05"}
        ]
    },
    {
        id: "S08",
        text: "By afternoon, you've almost convinced yourself it was all nonsense. Then the man from Maw and Meggins arrives. His face tells you everything before he speaks. 'There's been an accident. The machinery... compensation of two hundred pounds.'",
        choices: [
            {text: "Collapse in grief", set: {sonDead: true}, to: "S20"},
            {text: "Demand to see Herbert", set: {sonDead: true}, to: "S21"},
            {text: "Refuse the money", set: {sonDead: true, knowsPrice: true}, to: "S22"}
        ]
    },
    {
        id: "S09",
        text: "The sergeant-major's house is empty, hastily abandoned. On his table, a note: 'The third wish is always the same - to undo the first two. But even that has a price. I'm sorry I brought it to your home.'",
        choices: [
            {text: "Search for more information", set: {knowsPrice: true}, to: "S23"},
            {text: "Return home immediately", to: "S24"},
            {text: "Track down the sergeant-major", to: "S25"}
        ]
    },

    // ACT 3: THE CONSEQUENCE
    {
        id: "S10",
        text: "The paw is cold despite the fire. As you pull it from the ashes, you notice your reflection in the poker - but it's not moving the same way you are. It's making a wish.",
        choices: [
            {text: "Drop everything and run", to: "S26"},
            {text: "Look closer at the reflection", to: "S27"},
            {text: "Make your own wish first", set: {wishCount: 1}, to: "S05"}
        ]
    },
    {
        id: "S11",
        text: "Days pass. The ashes remain. Your wife sweeps around them, never touching. Herbert still goes to work. Everything is normal except for the growing certainty that something is coming. The paw doesn't need to be held to grant wishes.",
        choices: [
            {text: "Scatter the ashes at crossroads", to: "S28"},
            {text: "Wait for the inevitable", to: "S08"},
            {text: "Dig the paw out", set: {hasPaw: true}, to: "S29"}
        ]
    },
    {
        id: "S12",
        text: "The garden earth accepts the ashes eagerly. Too eagerly. Within hours, the flowers above the spot bloom out of season - beautiful but wrong. Their scent is like copper pennies. Like blood money.",
        choices: [
            {text: "Dig it up immediately", set: {hasPaw: true}, to: "S30"},
            {text: "Salt the earth", to: "S31"},
            {text: "Let nature take its course", to: "S32"}
        ]
    },
    {
        id: "S13",
        text: "The man from Maw and Meggins stands at your door, hat in hand. 'Caught in the machinery,' he says. 'The firm wishes to express its sympathy with a compensation of two hundred pounds.' Exactly what you wished for.",
        choices: [
            {text: "Take the blood money", set: {sonDead: true}, to: "S33"},
            {text: "Scream at him to leave", set: {sonDead: true}, to: "S34"},
            {text: "Demand to know more", set: {sonDead: true, knowsPrice: true}, to: "S35"},
            {text: "Use the paw to undo everything", to: "INSTANT_DEATH_1"}
        ]
    },
    {
        id: "S14",
        text: "\"I wish to undo my wish!\" But the paw grants exactly what you ask - it undoes the wish, not its consequence. Herbert is still at work. The machinery is still running. You've simply guaranteed it will happen without purpose.",
        choices: [
            {text: "Rush to the factory", to: "S36"},
            {text: "Make a third wish", set: {wishCount: 3}, to: "S37"},
            {text: "Wait in horror", to: "S38"}
        ]
    },

    // ACT 4: THE SECOND WISH
    {
        id: "S15",
        text: "You call the factory, but Herbert has already left. You run through the streets, following his usual route. You find him at the intersection, about to cross. A carriage speeds toward him. You have seconds to act.",
        choices: [
            {text: "Push him to safety", to: "S39"},
            {text: "Take his place", to: "S40"},
            {text: "Watch fate unfold", set: {sonDead: true}, to: "S41"}
        ]
    },
    {
        id: "S16",
        text: "Your wife wishes before you can warn her: 'I wish my son success and happiness.' The paw curls. Within the hour, a letter arrives - Herbert has been promoted. He'll be working the night shift. With the dangerous machinery.",
        choices: [
            {text: "Forbid him from going", to: "S42"},
            {text: "Let fate take its course", set: {sonDead: true}, to: "S43"},
            {text: "Make another wish to protect him", set: {wishCount: 2}, to: "S44"}
        ]
    },
    {
        id: "S17",
        text: "You tell her everything the sergeant-major said. She listens, nods, then says quietly: 'But if we could have just one thing... Herbert's safety. Surely that wish could only bring good?' The logic is tempting.",
        choices: [
            {text: "Agree to wish for Herbert's safety", set: {wishCount: 1}, to: "S45"},
            {text: "Destroy the paw together", to: "S46"},
            {text: "Hide it where she'll never find it", to: "S47"}
        ]
    },
    {
        id: "S18",
        text: "The locked drawer rattles at night. Your wife asks about the noise. You lie. But lies in a house with a monkey's paw have a way of becoming truth. You wake to find the drawer open and Herbert holding the paw.",
        choices: [
            {text: "Let him make his wish", set: {wishCount: 1}, to: "S48"},
            {text: "Wrestle it away from him", to: "S49"},
            {text: "Tell him the truth", set: {warned: true}, to: "S50"}
        ]
    },
    {
        id: "S19",
        text: "At the cemetery, you dig a small hole near your parents' graves. As you lower the paw, a hand grabs your wrist. It's the groundskeeper. 'Not here,' he says. 'This ground is full. Full of wishes gone wrong.'",
        choices: [
            {text: "Ask what he means", set: {knowsPrice: true}, to: "S51"},
            {text: "Find another location", to: "S52"},
            {text: "Keep the paw after all", set: {hasPaw: true}, to: "S53"}
        ]
    },
    {
        id: "S20",
        text: "Ten days after the funeral, your wife breaks. 'The paw!' she screams. 'Where is it? We have two wishes left. Bring him back!' Her grief has turned to madness. She tears the house apart searching.",
        choices: [
            {text: "Give her the paw", req: {hasPaw: true}, set: {wishCount: 2, sonReturned: true}, to: "S54"},
            {text: "Tell her you destroyed it", to: "S55"},
            {text: "Make the wish yourself", req: {hasPaw: true}, set: {wishCount: 2, sonReturned: true}, to: "S56"}
        ]
    },

    // ACT 5: THE RETURN
    {
        id: "S21",
        text: "At the morgue, they won't let you see him. 'The machinery,' they say. 'It's better to remember him as he was.' But through the door, you hear something dragging. Something that sounds almost like footsteps.",
        choices: [
            {text: "Force your way in", to: "S57"},
            {text: "Leave immediately", to: "S58"},
            {text: "Ask if others have claimed bodies recently", set: {knowsPrice: true}, to: "S59"}
        ]
    },
    {
        id: "S22",
        text: "You refuse the money, but it appears anyway - in your coat pocket, under your pillow, in Herbert's empty room. Two hundred pounds exactly. The universe insists on balancing its books.",
        choices: [
            {text: "Burn the money", to: "S60"},
            {text: "Give it to charity", to: "S61"},
            {text: "Use it for Herbert's funeral", to: "S62"}
        ]
    },
    {
        id: "S23",
        text: "In the sergeant-major's study, you find journals dating back years. Every entry ends the same way: 'They always make the third wish. They always wish they hadn't.' The last entry is today's date.",
        choices: [
            {text: "Read more journals", to: "S63"},
            {text: "Take the journals home", to: "S64"},
            {text: "Burn everything", to: "S65"}
        ]
    },
    {
        id: "S24",
        text: "You return to find your wife holding the paw. 'Herbert's been in an accident,' she says calmly. 'They're bringing him home. I wished him back. He'll be here in an hour.' The paw is still warm in her hand.",
        choices: [
            {text: "Prepare for his return", set: {sonReturned: true}, to: "S66"},
            {text: "Board up the doors", to: "S67"},
            {text: "Make the third wish immediately", set: {wishCount: 3}, to: "S68"}
        ]
    },
    {
        id: "S25",
        text: "You find the sergeant-major at the docks, about to board a ship. 'I brought death to your door,' he says. 'The paw was given to me in India. I made my wishes. Now you'll make yours. We all do, in the end.'",
        choices: [
            {text: "Demand he take it back", to: "S69"},
            {text: "Ask about his wishes", set: {knowsPrice: true}, to: "S70"},
            {text: "Let him leave", to: "S71"}
        ]
    },

    // ACT 6: THE KNOCKING
    {
        id: "S26",
        text: "You run, but the house runs with you. Every door leads back to the room with the paw. Your reflection in every surface is making wishes you haven't made yet. Or have you already made them?",
        choices: [
            {text: "Stop running and face it", to: "S72"},
            {text: "Smash all the mirrors", to: "S73"},
            {text: "Make a wish to escape", set: {wishCount: 1}, to: "S74"}
        ]
    },
    {
        id: "S27",
        text: "In the reflection, you see yourself making three wishes. In the first, Herbert dies. In the second, he returns. In the third... the reflection stops moving. It's waiting for you to catch up.",
        choices: [
            {text: "Follow the reflection's path", set: {knowsPrice: true}, to: "S75"},
            {text: "Do the opposite", to: "S76"},
            {text: "Break the poker", to: "S77"}
        ]
    },
    {
        id: "S28",
        text: "At the crossroads at midnight, you scatter the ashes. The wind takes them in four directions. You think it's over until you realize - now the paw's power is everywhere, in every handful of dust.",
        choices: [
            {text: "Try to gather the ashes back", to: "S78"},
            {text: "Accept what you've done", to: "S79"},
            {text: "Make a wish on the wind", set: {wishCount: 1}, to: "S80"}
        ]
    },
    {
        id: "S29",
        text: "The paw has grown roots in the ashes, thin white tendrils like finger bones. As you unearth it, you realize it's not the same paw - it's fresher, newer. As if it's regenerating.",
        choices: [
            {text: "Take the new paw", set: {hasPaw: true}, to: "S81"},
            {text: "Destroy it completely", to: "S82"},
            {text: "Plant it deeper", to: "S83"}
        ]
    },
    {
        id: "S30",
        text: "The earth where you buried the paw is warm, pulsing. As you dig, you find not just the paw but others - dozens of them, all moving slightly. This isn't the first time someone tried to bury it here.",
        choices: [
            {text: "Take them all", to: "S84"},
            {text: "Run away immediately", to: "S85"},
            {text: "Rebury them properly", to: "S86"}
        ]
    },

    // ACT 7: THE FINAL CHOICE
    {
        id: "S31",
        text: "You salt the earth in a circle. The flowers wither instantly, but something underneath starts knocking. Soft at first, then insistent. The same rhythm Herbert used to knock when he came home from work.",
        choices: [
            {text: "Dig toward the knocking", set: {sonReturned: true}, to: "S87"},
            {text: "Add more salt", to: "S88"},
            {text: "Call for your wife", to: "S89"}
        ]
    },
    {
        id: "S32",
        text: "Nature takes its course, but nature here is unnatural. The spot where you buried the paw becomes a garden of beautiful, wrong things. Flowers with too many petals. Vegetables that bleed when cut. Your wife loves it.",
        choices: [
            {text: "Tend the dark garden", to: "S90"},
            {text: "Destroy everything", to: "S91"},
            {text: "Eat what grows", to: "S92"}
        ]
    },
    {
        id: "S33",
        text: "The money sits on your table. Two hundred pounds in old notes, some stained dark. Your wife counts it over and over. 'It's exactly what we needed,' she says. 'Herbert would want us to use it.' But Herbert is gone.",
        choices: [
            {text: "Use it for a memorial", to: "S93"},
            {text: "Return it to the company", to: "S94"},
            {text: "Make another wish", req: {hasPaw: true}, set: {wishCount: 2}, to: "S95"}
        ]
    },
    {
        id: "S34",
        text: "You scream until your throat is raw. The man from Maw and Meggins backs away, leaves the money on your doorstep. That night, you hear footsteps around the house, circling. Looking for a way in.",
        choices: [
            {text: "Open the door", set: {doorAnswered: true}, to: "S96"},
            {text: "Barricade everything", to: "S97"},
            {text: "Follow the footsteps outside", to: "S98"},
            {text: "Confront whatever is out there with the paw", to: "INSTANT_DEATH_4"}
        ]
    },
    {
        id: "S35",
        text: "The man tells you more than he should. This isn't the first accident. Every time someone finds the paw, Maw and Meggins pays out exactly two hundred pounds. 'We keep a fund,' he says. 'For the inevitable.'",
        choices: [
            {text: "Ask about other families", set: {knowsPrice: true}, to: "S99"},
            {text: "Threaten to expose them", to: "S100"},
            {text: "Accept your part in the pattern", to: "S101"}
        ]
    },
    {
        id: "S36",
        text: "At the factory, the machines are running normally. Herbert is at his station. He smiles when he sees you. 'Father? What's wrong?' The accident hasn't happened yet. You have minutes, maybe less.",
        choices: [
            {text: "Pull him away from the machines", to: "S102"},
            {text: "Sabotage the machinery", to: "S103"},
            {text: "Let fate decide", set: {sonDead: true}, to: "S104"}
        ]
    },
    {
        id: "S37",
        text: "Your third wish forms: 'I wish none of this had happened.' The paw grants it literally. It didn't happen - it's happening now, continuously, forever. You're trapped in the moment of wishing.",
        choices: [
            {text: "Accept the loop", to: "E1"},
            {text: "Try to break free", to: "E2"},
            {text: "Make a fourth wish", to: "E3"}
        ]
    },

    // THE KNOCK AT THE DOOR
    {
        id: "S54",
        text: "She wishes before you can stop her: 'I wish my son alive again!' The paw twists violently and falls. Silence. Then, from miles away, from the cemetery, you hear it: footsteps. He's coming home.",
        choices: [
            {text: "Prepare to welcome him", set: {doorAnswered: true}, to: "S105"},
            {text: "Find the paw for the third wish", to: "S106"},
            {text: "Run from the house", to: "S107"}
        ]
    },
    {
        id: "S56",
        text: "You make the wish yourself: 'Bring back my son.' The words taste like earth and formaldehyde. Two miles away, in the cemetery, soil begins to shift. It will take him three hours to walk home on broken legs.",
        choices: [
            {text: "Wait by the door", to: "S108"},
            {text: "Go to meet him halfway", to: "S109"},
            {text: "Make the third wish immediately", set: {wishCount: 3}, to: "S110"}
        ]
    },
    {
        id: "S66",
        text: "You prepare: clean clothes, warm water, bandages. Your wife hums as she works. But the thing approaching your house doesn't need comfort. It needs completion. And it's missing pieces the grave couldn't return.",
        choices: [
            {text: "Open the door when it knocks", set: {doorAnswered: true}, to: "S111"},
            {text: "Look through the window first", to: "S112"},
            {text: "Hide and let your wife answer", to: "S113"}
        ]
    },
    {
        id: "S105",
        text: "The knock comes at midnight. Soft, familiar, wrong. 'Mother,' a voice calls, thick with earth. 'Father. I'm cold. Let me in.' Your wife runs for the door. You run for the paw.",
        choices: [
            {text: "Let her open it", set: {doorAnswered: true}, to: "S114"},
            {text: "Stop her physically", to: "S115"},
            {text: "Make the third wish", req: {hasPaw: true}, set: {wishCount: 3}, to: "S116"}
        ]
    },
    {
        id: "S108",
        text: "Three hours pass like three years. Then: a dragging sound on the path. A wet, broken sound. The doorknob turns but the door is locked. 'Lost... my... key,' Herbert's voice says, but it's full of grave dirt.",
        choices: [
            {text: "Unlock the door", set: {doorAnswered: true}, to: "S117"},
            {text: "Talk through the door", to: "S118"},
            {text: "Stay silent and still", to: "S119"}
        ]
    },
    {
        id: "S111",
        text: "You open the door to emptiness. Then you look down. It crawled the last mile. What remains of Herbert smiles with half a face. 'Wished... me... back...' it says. 'Why... did... you... wait... so... long?'",
        choices: [
            {text: "Embrace what's left of your son", to: "E4"},
            {text: "Slam the door", to: "S120"},
            {text: "Make the final wish", req: {hasPaw: true}, set: {wishCount: 3}, to: "E5"}
        ]
    },
    {
        id: "S114",
        text: "The door opens. Your wife screams - not in horror, but in joy. She sees Herbert as he was. You see him as he is: mangled, rotting, confused. Love and horror are the same wish granted differently.",
        choices: [
            {text: "Pretend you see what she sees", to: "E6"},
            {text: "Tell her the truth", to: "E7"},
            {text: "Wish for blindness", req: {hasPaw: true}, set: {wishCount: 3}, to: "E8"}
        ]
    },
    {
        id: "S116",
        text: "Your third wish comes out as a whisper: 'I wish him at peace.' The knocking stops. The door swings open to empty air. Your wife collapses. In the distance, a church bell tolls. It's over, but nothing will ever be the same.",
        choices: [
            {text: "Comfort your wife", to: "E9"},
            {text: "Search for signs of Herbert", to: "E10"},
            {text: "Destroy the paw forever", to: "E11"}
        ]
    },

    // ENDINGS
    {
        id: "E1",
        text: "THE ETERNAL WISH - You remain frozen in the moment of wishing, forever about to make a choice that's already been made. Time moves around you while you stay still, a monument to desire and regret.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE ETERNAL WISH"
    },
    {
        id: "E2",
        text: "THE RECURSION - Every attempt to break free creates another loop within the loop. You're nested in your own wishes like Russian dolls of regret. Freedom was always the illusion; the wish was always the trap.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE RECURSION"
    },
    {
        id: "E3",
        text: "BEYOND THREE - You discover there is no limit to wishes, only to what you're willing to pay. Each wish costs more than the last. By the fourth wish, you're paying with things you didn't know you had to lose.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "BEYOND THREE"
    },
    {
        id: "E4",
        text: "FATHER'S LOVE - You hold what remains of your son. He doesn't understand why he's cold, why you're crying. In his confused half-dead state, he's happy to be home. Sometimes love means accepting the monstrous.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "FATHER'S LOVE"
    },
    {
        id: "E5",
        text: "THE FINAL WISH - 'Go back to rest.' The thing that was Herbert nods, understanding. It crawls back toward the cemetery, leaving a trail you'll see forever when you close your eyes. Peace has a price too.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE FINAL WISH"
    },
    {
        id: "E6",
        text: "SHARED MADNESS - You choose to see what your wife sees: Herbert whole and healthy. The lie becomes truth through repetition. You live with a monster you've convinced yourself is your son. Happiness and horror intertwined.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "SHARED MADNESS"
    },
    {
        id: "E7",
        text: "BRUTAL TRUTH - You force your wife to see reality. She breaks completely, unable to reconcile love with horror. You save her from delusion but doom her to madness. Truth, it turns out, is the cruelest wish.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "BRUTAL TRUTH"
    },
    {
        id: "E8",
        text: "MERCIFUL BLINDNESS - Your wish for blindness is granted. Now you navigate by sound: your wife's happy humming, the wet drag of Herbert's steps, the whisper of the paw waiting for the next fool. Darkness is a mercy.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "MERCIFUL BLINDNESS"
    },
    {
        id: "E9",
        text: "EMPTY COMFORT - You hold your wife as she weeps for the son who came and went. The paw sits inert, its work complete. You'll grow old in a house full of absence, forever wondering if the knocking will come again.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "EMPTY COMFORT"
    },
    {
        id: "E10",
        text: "SEARCHING FOR GHOSTS - You find traces: grave dirt on the doorstep, scratches on the wood, a smell of earth and machinery. Herbert was here and not here. The evidence is maddening in its incompleteness.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "SEARCHING FOR GHOSTS"
    },
    {
        id: "E11",
        text: "FAILED DESTRUCTION - You try everything: fire, water, burial, acid. The paw endures. It's not an object but an idea, and ideas can't be destroyed. You die trying, and the paw waits for the next family.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "FAILED DESTRUCTION"
    },
    
    // INSTANT DEATH SCENES - For dangerous/foolish choices
    {
        id: "INSTANT_DEATH_1",
        text: "INFINITE GREED - You wish for unlimited wishes. The paw grants it - every thought becomes a wish, every idle desire reality. Your mind fractures under infinite possibility. You age a thousand years in seconds, experiencing every possible life simultaneously. Your body crumbles to dust, still wishing.",
        choices: [{text: "Try Again", to: "S01"}],
        ending: true,
        endingType: "death"
    },
    {
        id: "INSTANT_DEATH_2",
        text: "THE PAW'S HUNGER - You try to destroy the paw with your bare hands. It fights back. Your fingers fuse with its gnarled surface, your flesh becoming part of its twisted form. You become the next finger on the paw, waiting to grant wishes to the next fool.",
        choices: [{text: "Try Again", to: "S01"}],
        ending: true,
        endingType: "death"
    },
    {
        id: "INSTANT_DEATH_3",
        text: "DEFYING FATE - You challenge the paw's power directly, daring it to do its worst. It obliges. Your heart stops mid-beat. Your last thought is that you asked for this. The paw sits innocently on the floor beside your corpse.",
        choices: [{text: "Try Again", to: "S01"}],
        ending: true,
        endingType: "death"
    },
    {
        id: "INSTANT_DEATH_4",
        text: "BLOOD PRICE - The door splinters. What enters isn't Herbert - it's what Herbert became. The resurrection went wrong. His mangled hands find your throat before you can scream. The last thing you see is his apologetic eyes above his twisted smile.",
        choices: [{text: "Try Again", to: "S01"}],
        ending: true,
        endingType: "death"
    },
    {
        id: "INSTANT_DEATH_5",
        text: "CURSED KNOWLEDGE - You wish to understand the paw's true nature. The knowledge floods in - every death it's caused, every family destroyed, centuries of accumulated suffering. Your mind can't contain it all. Blood pours from your eyes as your brain literally burns out.",
        choices: [{text: "Try Again", to: "S01"}],
        ending: true,
        endingType: "death"
    }
];

// Additional scenes to fill out the story branches
// (Adding unique connecting scenes for paths that need them)
const additionalScenes = [
    {
        id: "S38",
        text: "You wait, knowing what's coming. The clock ticks toward the exact moment. You could still run to the factory, but your legs won't move. Free will is an illusion when fate has already been wished into motion.",
        choices: [
            {text: "Accept the inevitable", set: {sonDead: true}, to: "S13"},
            {text: "Fight against fate", to: "S36"},
            {text: "Make another wish", set: {wishCount: 2}, to: "S44"}
        ]
    },
    {
        id: "S39",
        text: "You push Herbert to safety. The carriage hits you instead. As you lie bleeding, you see the paw in Herbert's pocket. He's had it all along. 'I wished for you to save me, Father,' he says. The price is always exact.",
        choices: [
            {text: "Accept your fate", to: "E12"},
            {text: "Tell him to wish you healed", to: "E13"},
            {text: "Warn him about the third wish", to: "E14"}
        ]
    },
    {
        id: "S40",
        text: "You step in front of the carriage. Time slows. You see Herbert's face, your wife in the window, the paw on the mantle. The wish was for money, not for whose death would pay for it. You chose this.",
        choices: [
            {text: "Accept the substitution", to: "E15"},
            {text: "Regret everything", to: "E16"},
            {text: "Feel peace at last", to: "E17"}
        ]
    },
    {
        id: "S41",
        text: "You watch the carriage strike Herbert. But it's wrong - he gets up, dusts himself off, walks away. The carriage driver is dead. The wish finds its payment somewhere. It always does.",
        choices: [
            {text: "Follow Herbert home", to: "S42"},
            {text: "Check on the driver", to: "S43"},
            {text: "Run from the scene", to: "S44"}
        ]
    },
    // Add missing scenes that are referenced but not defined
    {
        id: "S42",
        text: "You forbid Herbert from going to work. He laughs, 'Father, you're being superstitious.' But he stays home. The machinery accident happens to his replacement. The money arrives anyway.",
        choices: [
            {text: "Accept the twisted fate", to: "S33"},
            {text: "Return the money", to: "S94"},
            {text: "Make another wish", set: {wishCount: 2}, to: "S44"}
        ]
    },
    {
        id: "S43",
        text: "You let fate take its course. Herbert goes to work whistling. You spend the day watching the clock, knowing exactly when it will happen. The knock comes at 4:17 PM.",
        choices: [
            {text: "Answer the door", to: "S13"},
            {text: "Pretend you're not home", to: "S34"},
            {text: "Have your wife answer", to: "S20"}
        ]
    },
    {
        id: "S44",
        text: "You wish for Herbert's protection, but protection and imprisonment are the same wish viewed differently. Herbert becomes unable to leave the house. Doors won't open for him. He's safe but trapped.",
        choices: [
            {text: "Accept this new prison", to: "E7"},
            {text: "Make the third wish", set: {wishCount: 3}, to: "S37"},
            {text: "Find another solution", to: "S45"}
        ]
    },
    {
        id: "S45",
        text: "You wish for Herbert's absolute safety. The paw grants it - he becomes untouchable, unliving, unchanging. A statue of himself, perfectly preserved, perfectly dead while alive.",
        choices: [
            {text: "Live with your mistake", to: "E7"},
            {text: "Try to reverse it", set: {wishCount: 3}, to: "E3"},
            {text: "Join him in stillness", to: "E14"}
        ]
    },
    {
        id: "S46",
        text: "Together, you try to destroy the paw. Fire won't take it. Blades won't cut it. Water won't dissolve it. It endures everything, patient as death itself.",
        choices: [
            {text: "Keep trying", to: "S82"},
            {text: "Give up", to: "S47"},
            {text: "Make a wish to destroy it", set: {wishCount: 1}, to: "S80"}
        ]
    },
    {
        id: "S47",
        text: "You hide the paw in the attic, wrapped in your wedding linens. But hidden things have a way of being found. Your wife's sleepwalking leads her there every night.",
        choices: [
            {text: "Move it again", to: "S52"},
            {text: "Let her find it", to: "S54"},
            {text: "Tie her to the bed", to: "S48"}
        ]
    },
    {
        id: "S48",
        text: "Herbert makes his wish: 'I wish to understand everything.' Understanding floods him - every cruelty, every death, every possible future. He ages decades in seconds, hair white, eyes hollow.",
        choices: [
            {text: "Comfort your broken son", to: "S49"},
            {text: "Take the burden from him", set: {wishCount: 2}, to: "S50"},
            {text: "Let him bear the knowledge", to: "E10"}
        ]
    },
    {
        id: "S49",
        text: "You wrestle the paw from Herbert. In the struggle, a wish forms on someone's lips - you're not sure whose. 'I wish we'd never found it.' But unwishing requires unmaking everything that followed.",
        choices: [
            {text: "Accept the unmaking", to: "E8"},
            {text: "Fight the erasure", to: "S50"},
            {text: "Embrace forgetting", to: "E16"}
        ]
    },
    {
        id: "S50",
        text: "You tell Herbert the truth about the paw. He doesn't believe you until it moves in his hand. 'Three wishes?' he asks. 'Then I wish for infinite wishes.' The paw grants it by making him the next paw.",
        choices: [
            {text: "Save your son", set: {wishCount: 2}, to: "S51"},
            {text: "Let him transform", to: "E18"},
            {text: "Join him", to: "E19"}
        ]
    },
    {
        id: "S51",
        text: "The groundskeeper explains: 'Every wish ever made here is buried in this ground. The dead don't rest because the wishes won't let them. Your son will join them if you're not careful.'",
        choices: [
            {text: "Heed the warning", set: {warned: true}, to: "S52"},
            {text: "Ignore old superstitions", to: "S53"},
            {text: "Ask how to break the cycle", to: "S64"}
        ]
    },
    {
        id: "S52",
        text: "You find another location - the church. But holy ground rejects the paw. It burns your hands when you try to enter. Faith and wishes cannot coexist.",
        choices: [
            {text: "Force it inside anyway", to: "S56"},
            {text: "Bury it outside", to: "S19"},
            {text: "Keep it after all", set: {hasPaw: true}, to: "S53"}
        ]
    },
    {
        id: "S53",
        text: "You keep the paw, telling yourself it's to protect others from it. But really, you can't let go of the possibility. Just one perfect wish. Surely you could word it right.",
        choices: [
            {text: "Test a perfect wish", set: {wishCount: 1}, to: "S05"},
            {text: "Resist temptation", to: "S06"},
            {text: "Study it first", to: "S63"}
        ]
    },
    {
        id: "S55",
        text: "You lie, tell her it's destroyed. She doesn't believe you. She searches everywhere, tears the house apart. In her frenzy, she finds it hidden in your coat. 'You lied!' The betrayal hurts more than grief.",
        choices: [
            {text: "Let her use it", set: {wishCount: 2}, to: "S54"},
            {text: "Fight for it", to: "S49"},
            {text: "Destroy it together", to: "S46"}
        ]
    },
    {
        id: "S57",
        text: "In the morgue, you see things meant to be hidden. Not just Herbert, but dozens of bodies, all mangled in the same way. All from families who received exactly two hundred pounds in compensation.",
        choices: [
            {text: "Report this pattern", to: "S100"},
            {text: "Run from the truth", to: "S58"},
            {text: "Investigate further", to: "S59"}
        ]
    },
    {
        id: "S58",
        text: "You leave the morgue, but the image follows. Every time you close your eyes, you see Herbert's mangled form. Your wife asks what you saw. You can't tell her. The silence grows between you.",
        choices: [
            {text: "Tell her the truth", to: "S20"},
            {text: "Protect her from it", to: "S55"},
            {text: "Show her yourself", to: "S57"}
        ]
    },
    {
        id: "S59",
        text: "Others have claimed bodies recently. All factory workers. All received compensation. The morgue keeper whispers: 'It happens in cycles. Every twenty years. Same paw, different families.'",
        choices: [
            {text: "Break the cycle", to: "S46"},
            {text: "Join the pattern", set: {wishCount: 1}, to: "S05"},
            {text: "Warn others", to: "S100"}
        ]
    },
    {
        id: "S60",
        text: "You burn the money. It screams as it burns - actual screams, Herbert's voice. The ashes reform into bills. The universe insists on its payment. You cannot refuse blood money.",
        choices: [
            {text: "Accept defeat", to: "S33"},
            {text: "Keep burning it", to: "S61"},
            {text: "Spend it on his memory", to: "S62"}
        ]
    },
    {
        id: "S61",
        text: "You give the money to charity. It returns in your pocket. You throw it in the river. It's under your pillow. The two hundred pounds will be yours whether you want it or not.",
        choices: [
            {text: "Stop fighting it", to: "S33"},
            {text: "Use it for good", to: "S62"},
            {text: "Make a wish about it", set: {wishCount: 2}, to: "S95"}
        ]
    },
    {
        id: "S62",
        text: "You use the money for Herbert's funeral. The most beautiful service money can buy. But beauty bought with blood looks like guilt. Everyone whispers: 'They seem almost happy about the compensation.'",
        choices: [
            {text: "Bear their judgment", to: "S93"},
            {text: "Leave town", to: "E27"},
            {text: "Tell them the truth", to: "S100"}
        ]
    },
    {
        id: "S63",
        text: "The journals reveal patterns: The paw grants wishes through loss. First wish costs a life. Second brings back wrong. Third tries to fix but makes it worse. No one has ever made a fourth wish.",
        choices: [
            {text: "Try to be the first", set: {wishCount: 1}, to: "S05"},
            {text: "Accept the pattern", to: "S64"},
            {text: "Burn the knowledge", to: "S65"}
        ]
    },
    {
        id: "S64",
        text: "You take the journals home. Reading them, you realize you're not living a unique tragedy - you're playing out a script written by the paw centuries ago. Even your resistance is part of the pattern.",
        choices: [
            {text: "Break the script", to: "S69"},
            {text: "Play your part", to: "S08"},
            {text: "Write a new ending", to: "S71"}
        ]
    },
    {
        id: "S65",
        text: "You burn everything - journals, notes, evidence. But burning truth doesn't unmake it. The smoke forms letters in the air: 'FORGETTING DOESN'T MEAN IT DIDN'T HAPPEN.'",
        choices: [
            {text: "Remember anyway", to: "S63"},
            {text: "Embrace ignorance", to: "S03"},
            {text: "Make a wish to forget", set: {wishCount: 1}, to: "E16"}
        ]
    },
    {
        id: "S67",
        text: "You board up every entrance. Nails through wood, salt at thresholds. But what's coming doesn't need doors. It's already inside - in your memory, your guilt, your wish.",
        choices: [
            {text: "Wait for it", to: "S108"},
            {text: "Stop fighting", to: "S66"},
            {text: "Make the final wish", set: {wishCount: 3}, to: "S68"}
        ]
    },
    {
        id: "S68",
        text: "Your third wish: 'Let him rest.' But rest and death aren't the same. Herbert rests while walking, rests while rotting, rests while knocking. Eternal rest doesn't mean eternal peace.",
        choices: [
            {text: "Accept this horror", to: "E4"},
            {text: "Try again", to: "E2"},
            {text: "Join him", to: "E14"}
        ]
    },
    {
        id: "S69",
        text: "The sergeant-major can't take it back. 'Once touched, always cursed,' he says. 'I tried to warn you. The paw chooses its victims. You were chosen before I arrived.'",
        choices: [
            {text: "Accept your fate", to: "S01"},
            {text: "Fight the predestination", to: "S70"},
            {text: "Pass it on", to: "S71"}
        ]
    },
    {
        id: "S70",
        text: "The sergeant-major's wishes: 'First, for glory in battle - got it through my unit's slaughter. Second, to forget the screams - forgot everything else too. Third, to remember - now I remember everything, forever.'",
        choices: [
            {text: "Learn from his mistakes", set: {warned: true}, to: "S03"},
            {text: "Make your own mistakes", set: {wishCount: 1}, to: "S05"},
            {text: "Refuse to wish at all", to: "S71"}
        ]
    },
    {
        id: "S71",
        text: "You let him leave, taking his guilt but not the paw. It stays with you, patient as cancer. Days pass. Your resolve weakens. The paw doesn't need you to wish - it just needs you to want.",
        choices: [
            {text: "Give in to wanting", set: {wishCount: 1}, to: "S05"},
            {text: "Destroy all desire", to: "S91"},
            {text: "Live with temptation", to: "S06"}
        ]
    },
    {
        id: "S72",
        text: "You stop running and face the truth: you're already in the wish. Everything since touching the paw has been part of its granting. The horror isn't coming - you're living in it.",
        choices: [
            {text: "Accept the nightmare", to: "E8"},
            {text: "Wake up", to: "S73"},
            {text: "Dive deeper", to: "S74"}
        ]
    },
    {
        id: "S73",
        text: "You smash every mirror, but reflections don't need glass. You see yourself in windows, water, your wife's eyes. Each shows a different wish you could make, each worse than the last.",
        choices: [
            {text: "Choose the least evil", set: {wishCount: 1}, to: "S05"},
            {text: "Refuse them all", to: "S74"},
            {text: "Blind yourself", to: "E8"}
        ]
    },
    {
        id: "S74",
        text: "You wish to escape, but escape means different things. The paw chooses: you escape responsibility, consequence, memory. You're free but hollow. Freedom and emptiness taste the same.",
        choices: [
            {text: "Accept hollowness", to: "E5"},
            {text: "Fill the void", set: {wishCount: 2}, to: "S75"},
            {text: "Embrace emptiness", to: "E15"}
        ]
    },
    {
        id: "S75",
        text: "Following the reflection's path, you see the truth: every choice leads to the same ending. The paw doesn't grant wishes - it reveals that all wishes are the same wish: for things to be different.",
        choices: [
            {text: "Accept sameness", to: "E30"},
            {text: "Fight for difference", to: "S76"},
            {text: "Make peace with what is", to: "S77"}
        ]
    },
    {
        id: "S76",
        text: "You do the opposite of everything shown. Where the reflection turns left, you go right. Where it wishes, you refuse. But opposites are still defined by what they oppose. You're still trapped in the pattern.",
        choices: [
            {text: "Stop opposing", to: "S75"},
            {text: "Create a new path", to: "S77"},
            {text: "Accept the trap", to: "E8"}
        ]
    },
    {
        id: "S77",
        text: "You break the poker, but breaking tools doesn't break truths. The paw remains. Your reflection remains. The wish you haven't made yet remains, waiting like a loaded gun.",
        choices: [
            {text: "Pull the trigger", set: {wishCount: 1}, to: "S05"},
            {text: "Unload the gun", to: "S46"},
            {text: "Aim elsewhere", to: "S78"}
        ]
    },
    // Continue with more missing scenes S78-S120
    {
        id: "S78",
        text: "You try to gather the scattered ashes, but wind has its own will. Each handful you collect scatters two more. The paw's power spreads like spores, infecting everything it touches.",
        choices: [
            {text: "Keep trying anyway", to: "S79"},
            {text: "Let it spread", to: "S80"},
            {text: "Burn everything touched", to: "S82"}
        ]
    },
    {
        id: "S79",
        text: "You accept what you've done - spread the curse wider. Now every handful of dust carries possibility. Every person who breathes it in will find their own paw, make their own wishes.",
        choices: [
            {text: "Warn everyone", to: "S100"},
            {text: "Watch it spread", to: "E23"},
            {text: "Join the infected", to: "S80"}
        ]
    },
    {
        id: "S80",
        text: "You make a wish on the wind itself: 'Let all wishes come true.' The wind carries it everywhere. Across the world, people get exactly what they wish for. The screaming starts immediately.",
        choices: [
            {text: "Listen to the chaos", to: "E37"},
            {text: "Try to undo it", set: {wishCount: 2}, to: "S81"},
            {text: "Wish for silence", set: {wishCount: 3}, to: "E41"}
        ]
    },
    {
        id: "S81",
        text: "The new paw is younger, hungrier. It grants wishes before they're made, fulfilling desires you don't know you have. Your life changes without your consent. Free will becomes memory.",
        choices: [
            {text: "Fight for control", to: "S82"},
            {text: "Surrender to it", to: "E39"},
            {text: "Destroy both paws", to: "S83"}
        ]
    },
    {
        id: "S82",
        text: "You try every method of destruction. Fire, water, earth, air - nothing works. The paw isn't physical. It's an idea, and ideas can't be killed. They can only be forgotten or replaced.",
        choices: [
            {text: "Try to forget", to: "E16"},
            {text: "Replace it with something worse", to: "S83"},
            {text: "Accept its immortality", to: "E30"}
        ]
    },
    {
        id: "S83",
        text: "You bury it deeper, but deep doesn't mean gone. It grows roots, becomes part of the earth itself. Every plant that grows here will carry its curse. Every fruit will taste of wishes.",
        choices: [
            {text: "Poison the earth", to: "S91"},
            {text: "Harvest the cursed fruit", to: "S92"},
            {text: "Move away forever", to: "E27"}
        ]
    },
    {
        id: "S84",
        text: "You take all the paws - dozens of them. Each finger a different person's tragedy. Combined, they form a complete hand. It waves at you. Then it starts making wishes on its own.",
        choices: [
            {text: "Let it wish", to: "E40"},
            {text: "Cut off your own hand to stop it", to: "S85"},
            {text: "Become its vessel", to: "E18"}
        ]
    },
    {
        id: "S85",
        text: "You run, but the paws follow. Not physically - they don't need to. They follow in every choice you make, every desire you have. Running from them means running from yourself.",
        choices: [
            {text: "Stop running", to: "S86"},
            {text: "Run forever", to: "E27"},
            {text: "Turn and fight", to: "S84"}
        ]
    },
    {
        id: "S86",
        text: "You rebury them properly, with rites and prayers. But proper burial doesn't mean peaceful rest. Now they're organized, patient, waiting for the right person to find them all at once.",
        choices: [
            {text: "Stand guard forever", to: "E19"},
            {text: "Leave warnings", to: "S47"},
            {text: "Dig them up again", to: "S84"}
        ]
    },
    {
        id: "S87",
        text: "You dig toward the knocking. The earth parts easily - too easily. Something wants to be found. At six feet down, you find Herbert's coffin. It's empty except for another paw.",
        choices: [
            {text: "Take the new paw", to: "S84"},
            {text: "Close the coffin", to: "S88"},
            {text: "Climb inside", to: "E31"}
        ]
    },
    {
        id: "S88",
        text: "You add more salt, but salt preserves as well as purifies. The knocking continues, preserved forever in the earth. Generations later, people will still hear it, still wonder what's buried here.",
        choices: [
            {text: "Stay and explain", to: "S89"},
            {text: "Leave it for them", to: "E27"},
            {text: "Dig it up", to: "S87"}
        ]
    },
    {
        id: "S89",
        text: "Your wife comes to the garden. She sees the disturbed earth, hears the knocking. 'Is it Herbert?' she asks. You both know it is and isn't. Truth and lies are the same word here.",
        choices: [
            {text: "Dig together", to: "S87"},
            {text: "Tell her everything", to: "S20"},
            {text: "Lie to protect her", to: "S55"}
        ]
    },
    {
        id: "S90",
        text: "You tend the dark garden. The vegetables scream when harvested. The flowers bloom in the shape of hands. But it's still life, still growth. Horror and beauty aren't opposites.",
        choices: [
            {text: "Share the harvest", to: "S92"},
            {text: "Keep it secret", to: "S91"},
            {text: "Burn it all", to: "S46"}
        ]
    },
    {
        id: "S91",
        text: "You destroy everything the paw touched. The garden, the house, the memories. But destruction is also creation - the creation of absence. The hole you make has its own gravity.",
        choices: [
            {text: "Fill the void", to: "S92"},
            {text: "Let it consume you", to: "E31"},
            {text: "Run from it", to: "E27"}
        ]
    },
    {
        id: "S92",
        text: "You eat what grows from cursed soil. It tastes like copper and regret. With each bite, you understand the paw better. You're becoming what it needs you to be: the next wisher.",
        choices: [
            {text: "Embrace transformation", to: "E18"},
            {text: "Purge the poison", to: "S60"},
            {text: "Share the meal", to: "S93"}
        ]
    },
    {
        id: "S93",
        text: "The memorial is beautiful. People say Herbert would have loved it. But Herbert never loved beautiful things - he loved practical ones. This monument is for you, not him.",
        choices: [
            {text: "Accept the selfishness", to: "S94"},
            {text: "Destroy it", to: "S91"},
            {text: "Make it practical", to: "S95"}
        ]
    },
    {
        id: "S94",
        text: "You try to return the money, but the company doesn't exist. Never did. The factory has no record of Herbert. The accident never happened. The money is payment for something else entirely.",
        choices: [
            {text: "Investigate further", to: "S99"},
            {text: "Accept the mystery", to: "S33"},
            {text: "Spend it anyway", to: "S62"}
        ]
    },
    {
        id: "S95",
        text: "You wish the money would disappear. It does - along with everything it could have bought. Including Herbert's life. The paw's logic is perfect: no money, no wish, no death, no Herbert.",
        choices: [
            {text: "Accept the erasure", to: "E8"},
            {text: "Wish him back", set: {wishCount: 3}, to: "S56"},
            {text: "Live with the void", to: "E5"}
        ]
    },
    {
        id: "S96",
        text: "You open the door to nothing. But nothing has weight here. It enters, fills the house, becomes something. Your wife sees Herbert. You see absence walking. Both are true.",
        choices: [
            {text: "Accept both truths", to: "S111"},
            {text: "Choose her truth", to: "E6"},
            {text: "Force your truth", to: "E7"}
        ]
    },
    {
        id: "S97",
        text: "You barricade everything, but the knocking comes from inside now. From the walls, the floor, your chest. You've locked yourself in with what you're trying to keep out.",
        choices: [
            {text: "Open everything", to: "S96"},
            {text: "Stay locked in", to: "S119"},
            {text: "Break free", to: "S98"}
        ]
    },
    {
        id: "S98",
        text: "You follow the footsteps. They lead to the factory, the cemetery, the beginning. A circle of crushed grass where something has been pacing for years, waiting for you to follow.",
        choices: [
            {text: "Enter the circle", to: "S87"},
            {text: "Break the circle", to: "S31"},
            {text: "Complete the circle", to: "E8"}
        ]
    },
    {
        id: "S99",
        text: "Other families share their stories. All the same: paw, wish, death, return. The pattern is older than the factory, older than the town. You're part of something ancient and automatic.",
        choices: [
            {text: "Break the pattern", to: "S100"},
            {text: "Join it fully", to: "S101"},
            {text: "Document everything", to: "S63"}
        ]
    },
    {
        id: "S100",
        text: "You try to expose the truth, but truth needs believers. People think you're mad with grief. The newspaper runs your story in the fiction section. The paw's best protection is disbelief.",
        choices: [
            {text: "Keep trying", to: "S99"},
            {text: "Give up", to: "S101"},
            {text: "Prove it with a wish", set: {wishCount: 1}, to: "S05"}
        ]
    },
    {
        id: "S101",
        text: "You accept your part in the pattern. Every twenty years, someone must wish. Someone must lose. Someone must learn. You're this generation's lesson. There's strange comfort in purpose.",
        choices: [
            {text: "Teach the lesson", to: "S64"},
            {text: "Break the cycle", to: "S46"},
            {text: "Pass it on", to: "E6"}
        ]
    },
    {
        id: "S102",
        text: "You pull Herbert from the machines just as they engage. He's safe but furious. 'You've cost me my job!' The next day, he's fired. The day after, the compensation arrives anyway.",
        choices: [
            {text: "Tell him the truth", to: "S50"},
            {text: "Let him hate you", to: "S103"},
            {text: "Make another wish", set: {wishCount: 2}, to: "S44"}
        ]
    },
    {
        id: "S103",
        text: "You sabotage the machinery. The factory closes. Everyone loses their jobs. But no one dies. The paw finds another way: plague, fire, war. Death doesn't need machines.",
        choices: [
            {text: "Accept the alternative", to: "S104"},
            {text: "Fight every possibility", to: "S102"},
            {text: "Give in to fate", to: "S41"}
        ]
    },
    {
        id: "S104",
        text: "You let fate decide. The machinery takes Herbert cleanly, quickly. Better than the alternatives you've seen in the paw's promises. Sometimes the first death is the kindest.",
        choices: [
            {text: "Accept this mercy", to: "S13"},
            {text: "Wish for another way", set: {wishCount: 2}, to: "S56"},
            {text: "Refuse the money", to: "S22"}
        ]
    },
    {
        id: "S106",
        text: "You search for the paw to make the third wish. But it's gone. Your wife has it. She's already wished. The knocking grows louder. She's smiling as she reaches for the door.",
        choices: [
            {text: "Stop her", to: "S115"},
            {text: "Let her open it", to: "S114"},
            {text: "Join her wish", to: "S111"}
        ]
    },
    {
        id: "S107",
        text: "You run from the house, but the house runs with you. Every door you pass leads back. Every street curves home. The wish has made geography personal. There's no away from here.",
        choices: [
            {text: "Stop running", to: "S108"},
            {text: "Run faster", to: "S26"},
            {text: "Run inward", to: "S72"}
        ]
    },
    {
        id: "S109",
        text: "You go to meet Herbert halfway. At the midpoint between house and cemetery, you find him. Half-dead, half-alive, perfectly balanced. He can go neither forward nor back without you.",
        choices: [
            {text: "Lead him home", to: "S111"},
            {text: "Lead him back", to: "S87"},
            {text: "Stay at the crossroads", to: "S28"}
        ]
    },
    {
        id: "S110",
        text: "Your third wish is instant: 'Undo everything.' But undoing includes you. You never existed to make the wish. The paradox creates a loop. You're always about to never have been.",
        choices: [
            {text: "Accept paradox", to: "E1"},
            {text: "Fight logic", to: "E2"},
            {text: "Embrace nothing", to: "E3"}
        ]
    },
    {
        id: "S112",
        text: "Through the window, you see Herbert. He's perfect, untouched, smiling. That's how you know it's not him. The real Herbert would be mangled. This is something wearing his memory like a suit.",
        choices: [
            {text: "Let it in anyway", to: "S111"},
            {text: "Keep it out", to: "S119"},
            {text: "Confront it", to: "S113"}
        ]
    },
    {
        id: "S113",
        text: "You hide and let your wife answer. She opens the door to Herbert - or what she sees as Herbert. Her joy is real even if he isn't. Is there a difference between real joy and false if it feels the same?",
        choices: [
            {text: "Let her have this", to: "E6"},
            {text: "Show her the truth", to: "E7"},
            {text: "Join her delusion", to: "S114"}
        ]
    },
    {
        id: "S115",
        text: "You physically stop her from opening the door. She fights you, screaming. In the struggle, someone makes a wish - you're not sure who. The knocking stops. The door opens to empty air.",
        choices: [
            {text: "Comfort her", to: "E9"},
            {text: "Search outside", to: "S98"},
            {text: "Make another wish", to: "S110"}
        ]
    },
    {
        id: "S117",
        text: "You unlock the door. It swings open. Herbert crawls in, leaving a trail. Your wife sees her perfect son. You see the truth. The paw grants both wishes: return and horror, together.",
        choices: [
            {text: "Accept both realities", to: "E6"},
            {text: "Choose one truth", to: "E7"},
            {text: "Wish for clarity", set: {wishCount: 3}, to: "E10"}
        ]
    },
    {
        id: "S118",
        text: "You talk through the door. The thing outside knows everything Herbert knew, feels everything he felt. It IS Herbert in every way that matters except the ones that do.",
        choices: [
            {text: "Open the door", to: "S117"},
            {text: "Keep talking", to: "S119"},
            {text: "Stop responding", to: "S120"}
        ]
    },
    {
        id: "S119",
        text: "You stay silent and still. The knocking continues for hours, days, years. You age listening to it. Your wife dies listening to it. You die listening to it. The house stands, still being knocked upon.",
        choices: [
            {text: "Accept eternal knocking", to: "E4"},
            {text: "Open at the last moment", to: "S117"},
            {text: "Wish for silence", set: {wishCount: 3}, to: "E5"}
        ]
    },
    {
        id: "S120",
        text: "You slam the door on what might be Herbert. The slam echoes forever. Every door you close from now on sounds like rejection. Your wife never forgives you. The paw doesn't need to.",
        choices: [
            {text: "Live with the choice", to: "E9"},
            {text: "Open it again", to: "S117"},
            {text: "Make a final wish", set: {wishCount: 3}, to: "S116"}
        ]
    },
    
    // Add missing endings referenced
    {
        id: "E18",
        text: "THE NEW FAKIR - You become the will behind the paw, granting wishes and feeding on loss. You understand now why the original fakir created it - power and punishment are the same hunger.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE NEW FAKIR"
    },
    {
        id: "E19",
        text: "ETERNAL GUARDIAN - You stand watch over the buried paws forever. Seasons change, you don't. People come seeking wishes, you turn them away. This is your purpose now, your curse, your choice.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "ETERNAL GUARDIAN"
    },
    {
        id: "E23",
        text: "VIRAL CURSE - The curse spreads like disease. Every infected person becomes a wisher. The world fills with granted wishes and their costs. Humanity gets everything it wants. The screaming never stops.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "VIRAL CURSE"
    },
    {
        id: "E27",
        text: "THE ESCAPE - You leave everything behind. New name, new life, new family. But at night, you hear knocking. The paw doesn't need your old address. It knows where you live in yourself.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE ESCAPE"
    },
    {
        id: "E30",
        text: "ACCEPTANCE - You accept the paw's immortality, humanity's nature, fate's cruelty. Acceptance feels like defeat but tastes like peace. You stop fighting what cannot be fought.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "ACCEPTANCE"
    },
    {
        id: "E31",
        text: "BECOMING EARTH - You climb into the coffin, into the earth, into the story itself. You become part of the pattern, another cautionary tale. Future families will find you and wonder.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "BECOMING EARTH"
    },
    {
        id: "E37",
        text: "WORLD OF WISHES - Every wish on Earth comes true simultaneously. The chaos is indescribable. Reality breaks under the weight of seven billion contradictions. This is how the world ends: granted.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "WORLD OF WISHES"
    },
    {
        id: "E39",
        text: "POSSESSED - The paw doesn't grant your wishes anymore; it makes them for you. Your life becomes perfect in ways you never wanted. Free will was the first thing it wished away.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "POSSESSED"
    },
    {
        id: "E40",
        text: "THE HAND'S WILL - The complete hand makes its own wishes. It wishes for more hands. They wish for bodies. Bodies wish for souls. Soon, nothing is human that isn't also paw.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE HAND'S WILL"
    },
    {
        id: "E41",
        text: "PERFECT SILENCE - Your wish for silence is granted absolutely. No sound anywhere, ever again. Humanity goes mad in the quiet. The paw's greatest cruelty: giving exactly what was asked for.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "PERFECT SILENCE"
    },

    // Continue with more missing scenes...
    {
        id: "E12",
        text: "THE SUBSTITUTE - You die in Herbert's place. The two hundred pounds pays for your funeral. Herbert lives with the guilt and the paw. The cycle continues through generations, father saving son, son becoming father.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE SUBSTITUTE"
    },
    {
        id: "E13",
        text: "CASCADING WISHES - Herbert wishes you healed, but healing requires life force from elsewhere. Your wife ages rapidly. She wishes for youth, stealing it from Herbert. The wishes cascade, each fixing and breaking in turn.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "CASCADING WISHES"
    },
    {
        id: "E14",
        text: "THE WARNING - With your dying breath, you warn Herbert about the third wish. He listens. He lives his entire life with two wishes used, never making the third. The incompleteness drives him slowly insane.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "THE WARNING"
    },
    {
        id: "E15",
        text: "WILLING SACRIFICE - You die knowing you chose this. The money arrives as your life insurance. Your family is provided for. The paw's cruelty is that it gave you exactly what you wanted, just not how you imagined it.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "WILLING SACRIFICE"
    },
    {
        id: "E16",
        text: "DYING REGRET - Your last thoughts are of all the wishes you should have made instead. World peace. Eternal life. Perfect happiness. But would those have been any different? The paw corrupts every desire equally.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "DYING REGRET"
    },
    {
        id: "E17",
        text: "UNEXPECTED PEACE - Death comes as a relief. No more wishes, no more consequences. You understand now why the dead don't return properly when wished back - they know something the living don't. Death is freedom from desire.",
        choices: [{text: "Begin Again", to: "S01"}],
        ending: true,
        endingType: "UNEXPECTED PEACE"
    }
];

// Combine all scenes
scenes.push(...additionalScenes);

// Ensure we have enough non-ending sections; auto-generate if needed
let autoSceneCounter = 0;

function ensureSceneCapacity(minNonEndingCount = 40) {
    const nonEnding = scenes.filter(s => !s.ending);
    if (nonEnding.length >= minNonEndingCount) return;
    const toAdd = minNonEndingCount - nonEnding.length;
    for (let i = 0; i < toAdd; i++) {
        autoSceneCounter++;
        const id = `AUTO_${String(autoSceneCounter).padStart(3, '0')}`;
        const lineA = pick(motifs.room);
        const lineB = pick(motifs.paw);
        const lineC = pick(motifs.knock);
        const text = `${lineA}. ${lineB}. ${lineC}. You feel the story tightening around you.`;
        // Choices will be rewired by routing logic to avoid repeats/endings
        scenes.push({
            id,
            text,
            choices: [
                { text: "Probe deeper", to: "S01" },
                { text: "Take a different turn", to: "S03" },
                { text: "Whisper a safer wish", to: "S06" }
            ]
        });
    }
}

ensureSceneCapacity(60);

// Core game functions remain the same
// Utility functions
function pick(arr) {
    return arr[Math.floor(rng() * arr.length)];
}

function sceneSignature(text) {
    // Create a unique signature for scene text to prevent repetition
    return hashStr(text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim());
}

function recordScene(text) {
    const sig = sceneSignature(text);
    gameState.seenScenes.add(sig);
}

function hasSeenScene(text) {
    const sig = sceneSignature(text);
    return gameState.seenScenes.has(sig);
}

// Generate unique scene text by combining motifs
function generateUniqueSceneText(baseScene, attempt = 0) {
    let text = baseScene.text;
    
    // If we've seen this exact text, try to generate a variation
    if (hasSeenScene(text) && attempt < 5) {
        const parts = [];
        
        // Add room atmosphere
        if (rng() > 0.3) parts.push(pick(motifs.room));
        
        // Add contextual elements based on state
        if (gameState.hasPaw && rng() > 0.4) parts.push(pick(motifs.paw));
        if (gameState.sonDead && rng() > 0.5) parts.push(pick(motifs.herbert));
        if (gameState.knockHeard && rng() > 0.4) parts.push(pick(motifs.knock));
        if (gameState.wishCount > 0 && rng() > 0.6) parts.push(pick(motifs.machinery));
        
        // Combine with original text
        if (parts.length > 0) {
            text = parts.join('. ') + '. ' + baseScene.text;
        } else {
            // Add a unique timestamp to ensure uniqueness
            text = baseScene.text + ` The clock shows ${Math.floor(rng() * 12) + 1}:${Math.floor(rng() * 60).toString().padStart(2, '0')}.`;
        }
    }
    
    return text;
}

function findScene(sceneId) {
    return scenes.find(s => s.id === sceneId);
}

function checkRequirements(req) {
    if (!req) return true;
    
    for (const [key, value] of Object.entries(req)) {
        if (gameState[key] !== value) return false;
    }
    return true;
}

function updateState(stateChanges) {
    if (!stateChanges) return;
    
    for (const [key, value] of Object.entries(stateChanges)) {
        gameState[key] = value;
    }
}

function showScene(sceneId) {
    const scene = findScene(sceneId);
    if (!scene) {
        console.error('Scene not found:', sceneId);
        return;
    }
    
    // Prevent repeats before threshold by rerouting to an unvisited non-ending section
    if (gameState.visitedScenes && gameState.visitedScenes.has(sceneId) && (gameState.visitedScenes.size < MIN_SECTIONS_BEFORE_ENDING)) {
        let reroute = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !gameState.visitedScenes.has(s.id));
        if (!reroute) {
            // Not enough content; create more and try again
            ensureSceneCapacity(MIN_SECTIONS_BEFORE_ENDING + 10);
            reroute = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !gameState.visitedScenes.has(s.id));
        }
        if (reroute) {
            return showScene(reroute.id);
        }
    }

    // Block endings until enough unique sections have been seen
    const uniqueVisitedCount = gameState.visitedScenes ? gameState.visitedScenes.size : 0;
    if (scene.ending && uniqueVisitedCount < MIN_SECTIONS_BEFORE_ENDING) {
        const fallback = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !(gameState.visitedScenes && gameState.visitedScenes.has(s.id)));
        if (fallback) {
            return showScene(fallback.id);
        } else {
            ensureSceneCapacity(MIN_SECTIONS_BEFORE_ENDING + 10);
            const anyFallback = scenes.find(s => !s.ending && s.id !== gameState.currentScene);
            if (anyFallback) {
                return showScene(anyFallback.id);
            }
        }
    }

    gameState.currentScene = sceneId;
    if (!gameState.visitedScenes) gameState.visitedScenes = new Set();
    if (!gameState.visitedScenes.has(sceneId)) {
        gameState.visitedScenes.add(sceneId);
        gameState.sectionCount++;
    }
    
    // Update phase based on progress
    if (gameState.sectionCount > 20) gameState.phase = "late";
    else if (gameState.sectionCount > 8) gameState.phase = "middle";
    
    // Use original scene text without modifications
    let sceneText = scene.text;
    // recordScene(sceneText); // Disabled to prevent confusion
    
    // Check for ending trigger
    if (!scene.ending && gameState.sectionCount >= MIN_SECTIONS_BEFORE_ENDING) {
        const endingChance = 0.1 + (gameState.wishCount * 0.15) + (gameState.sonReturned ? 0.2 : 0) + (gameState.knockHeard ? 0.1 : 0);
        if (rng() < endingChance) {
            // Force an ending
            const endingScenes = scenes.filter(s => s.ending);
            if (endingScenes.length > 0) {
                const ending = pick(endingScenes);
                scene.text = ending.text;
                scene.choices = ending.choices;
                scene.ending = true;
                scene.endingType = ending.endingType;
                sceneText = ending.text;
            }
        }
    }
    
    const container = document.getElementById('scene-container');
    container.classList.add('fade-out');
    
    setTimeout(() => {
        const storyText = document.getElementById('story-text');
        storyText.innerHTML = sceneText;
        
        const choicesContainer = document.getElementById('choices-container');
        choicesContainer.innerHTML = '';
        
        if (scene.ending) {
            const endingText = document.createElement('div');
            endingText.className = 'ending-text';
            endingText.textContent = scene.endingType;
            choicesContainer.appendChild(endingText);
            
            // If it's a death ending, ensure lives are depleted
            if (scene.endingType === 'death' || (scene.id && scene.id.startsWith('INSTANT_DEATH'))) {
                // Drain all lives for instant death
                while (gameState.lives > 0) {
                    loseLife();
                }
                // Add death scene styling
                container.classList.add('death-scene');
            }
        }
        
        let visibleChoiceIndex = 1;
        scene.choices.forEach((choice) => {
            if (choice.req && !checkRequirements(choice.req)) {
                return;
            }
            
            const button = document.createElement('button');
            button.className = choice.text === 'Begin Again' ? 'restart-button' : 'choice-button';
            
            if (choice.text !== 'Begin Again') {
                button.innerHTML = `<span class="choice-number">${visibleChoiceIndex}.</span> ${choice.text}`;
                visibleChoiceIndex++;
            } else {
                button.textContent = 'Begin Again';
            }
            
            // Simplified click handler
            button.onclick = function() {
                console.log('Button clicked:', choice.text);
                
                if (choice.text === 'Begin Again') {
                    restart();
                } else {
                    makeChoice(choice);
                }
            };
            
            // Also add as attribute for debugging
            button.setAttribute('data-choice-to', choice.to || 'restart');
            button.style.cursor = 'pointer';
            
            choicesContainer.appendChild(button);
        });
        
        updateStateDisplay();
        
        container.classList.remove('fade-out');
        container.classList.add('fade-in');
        
        setTimeout(() => {
            container.classList.remove('fade-in');
        }, 500);
    }, 500);
}

function makeChoice(choice) {
    console.log('makeChoice called with:', choice);
    console.log('Current scene:', gameState.currentScene, '-> Going to:', choice.to);
    
    if (!choice) {
        console.error('No choice object provided');
        return;
    }
    
    if (!choice.to) {
        console.error('Choice has no "to" property:', choice);
        return;
    }
    
    // Prevent going to the same scene
    if (choice.to === gameState.currentScene) {
        console.warn('Trying to go to the same scene, preventing loop');
        return;
    }
    
    if (choice.set) {
        updateState(choice.set);
    }
    
    // Increment questions answered
    gameState.questionsAnswered++;
    console.log('Questions answered:', gameState.questionsAnswered);
    
    // Gain a life every 10 questions as a reward
    if (gameState.questionsAnswered % 10 === 0 && gameState.lives < gameState.maxLives) {
        console.log('Milestone reached! Gaining a life.');
        gainLife();
    }
    
    // Determine target scene, enforcing uniqueness and blocking early endings
    let targetId = choice.to;
    let targetScene = scenes.find(s => s.id === targetId);
    const uniqueVisitedCount = gameState.visitedScenes ? gameState.visitedScenes.size : 0;

    // Block endings until we have enough unique sections
    if (targetScene && targetScene.ending && uniqueVisitedCount < MIN_SECTIONS_BEFORE_ENDING) {
        const fallback = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !(gameState.visitedScenes && gameState.visitedScenes.has(s.id)));
        if (fallback) {
            targetId = fallback.id;
        } else {
            ensureSceneCapacity(MIN_SECTIONS_BEFORE_ENDING + 10);
            const anyFallback = scenes.find(s => !s.ending && s.id !== gameState.currentScene);
            if (anyFallback) targetId = anyFallback.id;
        }
        targetScene = scenes.find(s => s.id === targetId);
    }

    // Avoid repeating previously visited sections when possible
    if (gameState.visitedScenes && gameState.visitedScenes.has(targetId)) {
        let alt = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !gameState.visitedScenes.has(s.id));
        if (!alt) {
            ensureSceneCapacity(MIN_SECTIONS_BEFORE_ENDING + 10);
            alt = scenes.find(s => !s.ending && s.id !== gameState.currentScene && !gameState.visitedScenes.has(s.id));
        }
        if (alt) {
            targetId = alt.id;
            targetScene = alt;
        }
    }

    // Show a mini-game only after every 2 questions (more frequent = more dangerous)
    // Skip mini-games for endings or if disabled
    const nextScene = targetScene;
    const shouldShowMiniGame = 
        gameState.questionsAnswered % 2 === 0 && 
        !gameState.skipMiniGames && 
        nextScene && 
        !nextScene.ending;
    
    if (shouldShowMiniGame && typeof miniGameManager !== 'undefined') {
        console.log('Showing mini-game after question', gameState.questionsAnswered);
        miniGameManager.showMiniGame((success) => {
            if (success) {
                console.log('Mini-game won!');
                // Continue to the next scene
                showScene(targetId);
            } else {
                console.log('Mini-game lost! Losing a life...');
                // Lose a life
                loseLife();
                
                // If still alive, continue to next scene
                if (gameState.lives > 0) {
                    showScene(targetId);
                } else {
                    // No lives left - show death ending
                    showMiniGameDeathEnding();
                }
            }
        });
    } else {
        showScene(targetId);
    }
}

function updateLifeBar() {
    const heartsContainer = document.getElementById('life-hearts');
    if (!heartsContainer) return;
    
    // Clear and rebuild hearts
    heartsContainer.innerHTML = '';
    
    for (let i = 0; i < gameState.maxLives; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart';
        
        if (i < gameState.lives) {
            // Active heart
            heart.textContent = '❤️';
        } else {
            // Lost heart
            heart.textContent = '💔';
            heart.classList.add('lost');
        }
        
        heartsContainer.appendChild(heart);
    }
}

function loseLife() {
    if (gameState.lives <= 0) return;
    
    gameState.lives--;
    console.log(`Lost a life! Lives remaining: ${gameState.lives}`);
    
    // Animate the life loss
    const heartsContainer = document.getElementById('life-hearts');
    if (heartsContainer) {
        const hearts = heartsContainer.querySelectorAll('.heart:not(.lost)');
        if (hearts.length > gameState.lives) {
            const heartToLose = hearts[gameState.lives];
            heartToLose.classList.add('damage');
            
            setTimeout(() => {
                updateLifeBar();
                
                // Flash the screen red briefly
                document.body.style.animation = 'redFlash 0.3s ease';
                setTimeout(() => {
                    document.body.style.animation = '';
                }, 300);
            }, 500);
        }
    } else {
        updateLifeBar();
    }
}

function gainLife() {
    if (gameState.lives >= gameState.maxLives) return;
    
    gameState.lives++;
    console.log(`Gained a life! Lives: ${gameState.lives}`);
    
    // Animate the life gain
    const heartsContainer = document.getElementById('life-hearts');
    if (heartsContainer) {
        updateLifeBar();
        const newHeart = heartsContainer.querySelectorAll('.heart')[gameState.lives - 1];
        if (newHeart) {
            newHeart.classList.add('pulse');
        }
    }
}

function showMiniGameDeathEnding() {
    // Special death ending for failing mini-games with no lives left
    const deathMessages = [
        "The curse claims another victim. Your reflexes were not quick enough to escape the paw's grasp.",
        "The shadows consume you. The monkey's paw tightens its grip on reality.",
        "Your mind breaks under the strain. The paw's curse has found its mark.",
        "You failed the test. The ancient magic demands its price in blood.",
        "The darkness wins. Your soul is forfeit to the cursed paw.",
        "Time runs out. The paw's patience has ended, and so has your life."
    ];
    
    const randomMessage = deathMessages[Math.floor(Math.random() * deathMessages.length)];
    
    // Create a special death scene
    const deathScene = {
        id: 'MINI_GAME_DEATH',
        text: randomMessage,
        ending: true,
        endingType: 'death'
    };
    
    // Show the death ending
    const container = document.getElementById('scene-container');
    const storyText = document.getElementById('story-text');
    const choicesContainer = document.getElementById('choices-container');
    
    if (container && storyText && choicesContainer) {
        // Add death animation
        container.classList.add('death-scene');
        
        // Update the story text
        storyText.innerHTML = `
            <div class="death-message">
                <h2>💀 GAME OVER 💀</h2>
                <p>${randomMessage}</p>
                <p class="death-hint">All lives lost... The curse has won.</p>
            </div>
        `;
        
        // Clear choices and add restart button
        choicesContainer.innerHTML = '';
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'Try Again';
        restartBtn.className = 'choice-button';
        restartBtn.onclick = restart;
        choicesContainer.appendChild(restartBtn);
        
        // Update game state
        gameState.currentScene = 'MINI_GAME_DEATH';
        updateUI();
    }
}

function restart() {
    // Clear any death scene styling
    const container = document.getElementById('scene-container');
    if (container) {
        container.classList.remove('death-scene');
    }
    
    // Generate new seed for new playthrough
    const newSeed = Date.now() & 0x7fffffff;
    
    gameState = {
        hasPaw: false,
        warned: false,
        wishCount: 0,
        sonDead: false,
        sonReturned: false,
        doorAnswered: false,
        knowsPrice: false,
        pawDestroyed: false,
        doorChained: false,
        atticKey: false,
        neighborAlerted: false,
        buriedPaw: false,
        burnedPaw: false,
        shadowLoose: false,
        knockHeard: false,
        currentScene: "S01",
        sectionCount: 0,
        phase: "intro",
        history: [],
        seenScenes: new Set(),
        visitedScenes: new Set(),
        seed: hashStr(String(newSeed)),
        questionsAnswered: 0,
        skipMiniGames: false,
        lives: 3,
        maxLives: 3
    };
    
    // Reset the life bar display
    updateLifeBar();
    
    // Update the RNG with new seed if needed
    // Note: This would require making rng mutable, which is currently const
    
    showScene('S01');
}

function updateStateDisplay() {
    const wishesElement = document.getElementById('wishes-remaining');
    const fateElement = document.getElementById('fate-meter');
    
    // Update wishes display
    if (gameState.wishCount > 0) {
        wishesElement.innerHTML = `<span style="color: ${gameState.wishCount >= 2 ? '#ff0000' : '#ffa500'}">Wishes: ${gameState.wishCount}/3</span>`;
        wishesElement.style.display = 'block';
    } else {
        wishesElement.style.display = 'none';
    }
    
    // Build state indicators
    const states = [];
    if (gameState.hasPaw) states.push('Holding the Paw');
    if (gameState.sonDead) states.push('Loss');
    if (gameState.sonReturned) states.push('The Return');
    if (gameState.knockHeard) states.push('The Knocking');
    if (gameState.doorChained) states.push('Door Chained');
    if (gameState.burnedPaw) states.push('Ashes');
    if (gameState.buriedPaw) states.push('Buried');
    if (gameState.shadowLoose) states.push('Shadow Loose');
    
    if (states.length > 0) {
        fateElement.innerHTML = states.map(s => `<span class="state-pill">${s}</span>`).join(' ');
        fateElement.style.display = 'block';
    } else {
        fateElement.style.display = 'none';
    }
    
    // Update section counter if it exists
    const sectionElement = document.getElementById('section-count');
    if (sectionElement) {
        sectionElement.textContent = `Section ${gameState.sectionCount}`;
    }
    
    // Update seed display if it exists
    const seedElement = document.getElementById('seed-display');
    if (seedElement && !gameState.seed) {
        gameState.seed = hashStr(String(rng()).slice(2));
        seedElement.textContent = `Seed: ${gameState.seed}`;
    }
}

function init() {
    console.log('Initializing game...');
    
    // Set up mini-game toggle
    const miniGameSwitch = document.getElementById('mini-game-switch');
    if (miniGameSwitch) {
        miniGameSwitch.addEventListener('change', (e) => {
            gameState.skipMiniGames = !e.target.checked;
            console.log('Mini-games:', e.target.checked ? 'enabled' : 'disabled');
        });
        // Initialize based on checkbox state
        gameState.skipMiniGames = !miniGameSwitch.checked;
    }
    
    // Check if required elements exist
    const requiredElements = [
        'scene-container',
        'story-text', 
        'choices-container',
        'wishes-remaining',
        'fate-meter'
    ];
    
    let allElementsFound = true;
    for (const id of requiredElements) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Required element not found: ${id}`);
            allElementsFound = false;
        } else {
            console.log(`Found element: ${id}`);
        }
    }
    
    if (!allElementsFound) {
        console.error('Missing required DOM elements. Check HTML structure.');
        return;
    }
    
    // Initialize life bar
    updateLifeBar();
    
    // Start the game immediately
    console.log('Starting game...');
    showScene('S01');
}

// Multiple initialization attempts for compatibility
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already loaded
    init();
}

// Backup initialization
window.addEventListener('load', function() {
    if (!gameState.currentScene) {
        console.log('Backup initialization triggered');
        init();
    }
});