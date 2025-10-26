export interface StoryNode {
    text: string;
    bg: string;
    sfx?: string;
    choices?: Record<string, string>;
    next?: Record<string, string>;
    ending?: boolean;
}

export const NODES: Record<string, StoryNode> = {
    start: {
        text: "You stand before Halcyon House. The wind tastes like dust.",
        bg: "outside",
        choices: { a: "Step inside.", b: "Circle the house.", c: "Call out." },
        next: { a: "foyer", b: "basement", c: "attic" }
    },
    foyer: {
        text: "The door mutters shut. The air is stale and watching.",
        bg: "foyer",
        choices: { a: "Climb the stairs.", b: "Check the boxes.", c: "Retreat" },
        next: { a: "attic", b: "nursery", c: "start" }
    },
    attic: { 
        text: "A music box ticks once. The melody is wrong - played backwards, or underwater. In the corner, a rocking horse moves without wind.", 
        bg: "attic", 
        sfx: "scare",
        choices: { a: "Touch the music box.", b: "Ride the horse.", c: "Leave quickly." },
        next: { a: "attic_music", b: "attic_horse", c: "foyer" }
    },
    basement: { 
        text: "Pipes moan below. Water drips in a rhythm that sounds like morse code. S-O-S. S-O-S.", 
        bg: "basement",
        sfx: "ambience", 
        choices: { a: "Follow the pipes.", b: "Decode the message.", c: "Go back up." },
        next: { a: "basement_deep", b: "basement_message", c: "foyer" }
    },
    nursery: { 
        text: "A moon lamp glows without power. Shadows of children dance on walls where no children stand.", 
        bg: "nursery",
        sfx: "scare",
        choices: { a: "Join the shadow dance.", b: "Turn off the lamp.", c: "Sing a lullaby." },
        next: { a: "nursery_dance", b: "nursery_dark", c: "nursery_song" }
    },
    
    // Attic branches
    attic_music: {
        text: "The music box opens. Inside: a tooth, a wedding ring, and a key made of bone. The tune grows louder.",
        bg: "attic",
        sfx: "scare",
        choices: { a: "Take the tooth.", b: "Take the ring.", c: "Take the bone key." },
        next: { a: "ending_tooth", b: "ending_ring", c: "ending_key" }
    },
    attic_horse: {
        text: "You mount the horse. It gallops in place, faster, faster. The attic walls dissolve. You're riding through stars.",
        bg: "attic",
        choices: { a: "Let go.", b: "Hold tighter." },
        next: { a: "ending_fall", b: "ending_stars" }
    },
    
    // Basement branches
    basement_deep: {
        text: "The pipes lead to a wall of photographs. Every photo shows you, in this basement, right now. One shows you reading this.",
        bg: "basement",
        sfx: "scare",
        choices: { a: "Tear them down.", b: "Take a selfie.", c: "Run." },
        next: { a: "ending_photos", b: "ending_selfie", c: "basement" }
    },
    basement_message: {
        text: "The drips spell: 'YOU WERE ALWAYS HERE.' The water rises. It's warm. Like tears.",
        bg: "basement",
        choices: { a: "Swim.", b: "Drink.", c: "Drown." },
        next: { a: "ending_swim", b: "ending_thirst", c: "ending_water" }
    },
    
    // Nursery branches
    nursery_dance: {
        text: "You dance with shadows. They have no faces but they know your name. They've been waiting.",
        bg: "nursery",
        sfx: "scare",
        choices: { a: "Ask their names.", b: "Stop dancing.", c: "Dance forever." },
        next: { a: "ending_names", b: "nursery", c: "ending_dance" }
    },
    nursery_dark: {
        text: "Darkness. Complete. Then—a child's hand in yours. 'I've been so lonely,' it says.",
        bg: "nursery",
        sfx: "scare",
        choices: { a: "Hold the hand.", b: "Let go.", c: "Turn on your phone light." },
        next: { a: "ending_together", b: "ending_alone", c: "ending_light" }
    },
    nursery_song: {
        text: "You sing. The shadows stop. A child appears—transparent, old-fashioned clothes. 'That was mother's song,' she says.",
        bg: "nursery",
        choices: { a: "Sing another.", b: "Ask about mother.", c: "Stop singing." },
        next: { a: "ending_songs", b: "ending_mother", c: "ending_silence" }
    },
    
    // Endings
    ending_tooth: {
        text: "The tooth was yours. From when you were seven. You remember now—you've been here before. You never left. Welcome home.",
        bg: "attic",
        ending: true
    },
    ending_ring: {
        text: "The ring fits perfectly. You're married to the house now. Till death do you part. But death already parted you.",
        bg: "attic",
        ending: true
    },
    ending_key: {
        text: "The bone key opens your chest. Inside: cobwebs and dust. You've been empty for so long. The house fills you up.",
        bg: "attic",
        ending: true
    },
    ending_fall: {
        text: "You fall through space, through time. You land in your childhood bed. Mother tucks you in. 'Just a nightmare,' she says. But her face is the house.",
        bg: "outside",
        ending: true
    },
    ending_stars: {
        text: "You ride into the cosmos. The horse was always taking you home. Home was never on Earth.",
        bg: "attic",
        ending: true
    },
    ending_photos: {
        text: "Behind the photos—a mirror. You have no reflection. You never did. The photos were all the house could see of you.",
        bg: "basement",
        ending: true
    },
    ending_selfie: {
        text: "Your phone shows no one in the frame. Just an empty basement. You look at your hands. You can see through them now.",
        bg: "basement",
        ending: true
    },
    ending_swim: {
        text: "You swim through tears of everyone who ever lived here. Their sorrows fill your lungs. You breathe grief now.",
        bg: "basement",
        ending: true
    },
    ending_thirst: {
        text: "The water tastes like memories. You drink your childhood, your death, your burial. You remember everything. You are the house.",
        bg: "basement",
        ending: true
    },
    ending_water: {
        text: "You sink. The water was always waiting. It remembers when you drowned here, forty years ago. Welcome back.",
        bg: "basement",
        ending: true
    },
    ending_names: {
        text: "They whisper: 'Sarah, James, Lucy, Marcus, Emma.' You realize—that last one. Emma. That's your name. You're one of them now.",
        bg: "nursery",
        ending: true
    },
    ending_dance: {
        text: "You dance until your feet wear through the floor, through time. You've been dancing here forever. You will dance here forever.",
        bg: "nursery",
        ending: true
    },
    ending_together: {
        text: "The hand squeezes. 'Now we'll never be alone.' You look down. The hand is yours. You're holding your own hand. You always were.",
        bg: "nursery",
        ending: true
    },
    ending_alone: {
        text: "You let go. The child cries. You cry. You're the same person. You abandoned yourself. The house keeps both of you.",
        bg: "nursery",
        ending: true
    },
    ending_light: {
        text: "The phone light shows you the truth—the nursery is your bedroom. You're in your bed. You never left home. Mother says dinner's ready.",
        bg: "nursery",
        ending: true
    },
    ending_songs: {
        text: "You sing every song you know. The child sings along. You harmonize perfectly. You've been practicing together for decades.",
        bg: "nursery",
        ending: true
    },
    ending_mother: {
        text: "Mother never left. She's in the walls, the floors, the air. She IS the house. And you're home at last.",
        bg: "nursery",
        ending: true
    },
    ending_silence: {
        text: "The silence is complete. Perfect. You realize—you haven't breathed in minutes. Or years. Time doesn't matter when you're dead.",
        bg: "nursery",
        ending: true
    }
};

export class StoryManager {
    private nodes: Record<string, StoryNode>;
    private currentNodeKey: string | null = null;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.nodes = NODES;
    }

    getCurrentNode(): StoryNode | null {
        if (!this.currentNodeKey) return null;
        return this.nodes[this.currentNodeKey];
    }

    getCurrentNodeKey(): string | null {
        return this.currentNodeKey;
    }

    start(): StoryNode {
        this.currentNodeKey = 'start';
        return this.nodes['start'];
    }

    next(choiceId: string): StoryNode | null {
        const currentNode = this.getCurrentNode();
        if (!currentNode || !currentNode.next) return null;

        const nextNodeKey = currentNode.next[choiceId];
        if (!nextNodeKey) return null;

        this.currentNodeKey = nextNodeKey;
        return this.nodes[nextNodeKey];
    }

    getNodeByKey(key: string): StoryNode | null {
        return this.nodes[key] || null;
    }

    reset(): void {
        this.currentNodeKey = null;
    }
}