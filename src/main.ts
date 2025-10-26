import Phaser from 'phaser';
import { StoryScene } from './scenes/StoryScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    backgroundColor: '#0b0e12',
    parent: 'game-container',
    scene: [StoryScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false
    }
};

const game = new Phaser.Game(config);

// Log game info
console.log('The House on Halcyon Hill - Interactive Horror Story');
console.log('A choose-your-own-adventure game');
console.log('Press [1-3] to make choices, [M] to mute, [F] for fullscreen');
