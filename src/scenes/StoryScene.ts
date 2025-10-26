import { StoryManager, StoryNode } from '../systems/StoryManager';

export class StoryScene extends Phaser.Scene {
    private storyManager!: StoryManager;
    private backgroundImage!: Phaser.GameObjects.Image;
    private textBox!: Phaser.GameObjects.Rectangle;
    private storyText!: Phaser.GameObjects.Text;
    private choiceButtons: Phaser.GameObjects.Container[] = [];
    private ambientSound?: Phaser.Sound.BaseSound;
    private isMuted: boolean = false;
    private isTransitioning: boolean = false;

    constructor() {
        super({ key: 'StoryScene' });
    }

    preload(): void {
        // Load backgrounds
        this.load.image('outside', 'assets/backgrounds/outside.png');
        this.load.image('foyer', 'assets/backgrounds/foyer.png');
        this.load.image('attic', 'assets/backgrounds/attic.png');
        this.load.image('basement', 'assets/backgrounds/basement.png');
        this.load.image('nursery', 'assets/backgrounds/nursery.png');

        // Load audio
        this.load.audio('ambience', 'assets/audio/ambience.ogg');
        this.load.audio('scare', 'assets/audio/scare.ogg');
    }

    create(): void {
        const width = this.scale.width;
        const height = this.scale.height;

        // Initialize story manager
        this.storyManager = new StoryManager(this);

        // Create background (default)
        this.backgroundImage = this.add.image(width / 2, height / 2, 'outside');
        this.backgroundImage.setDisplaySize(width, height);
        this.backgroundImage.setDepth(0);

        // Create text box background (bottom third of screen)
        const textBoxHeight = height / 3;
        this.textBox = this.add.rectangle(
            width / 2,
            height - textBoxHeight / 2,
            width,
            textBoxHeight,
            0x000000,
            0.85
        );
        this.textBox.setStrokeStyle(2, 0xffa500, 0.8);
        this.textBox.setDepth(10);

        // Create story text
        this.storyText = this.add.text(
            width / 2,
            height - textBoxHeight + 30,
            '',
            {
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: '#ffffff',
                align: 'left',
                wordWrap: { width: width - 80 },
                lineSpacing: 8
            }
        );
        this.storyText.setOrigin(0.5, 0);
        this.storyText.setDepth(11);

        // Set up keyboard controls
        this.setupKeyboardControls();

        // Add UI elements
        this.createUIElements(width, height);

        // Start the story
        this.loadStoryNode(this.storyManager.start());
    }

    private setupKeyboardControls(): void {
        // M for mute toggle
        this.input.keyboard?.on('keydown-M', () => {
            this.toggleMute();
        });

        // F for fullscreen toggle
        this.input.keyboard?.on('keydown-F', () => {
            this.toggleFullscreen();
        });

        // Letter keys for choices
        this.input.keyboard?.on('keydown-A', () => this.selectChoice('a'));
        this.input.keyboard?.on('keydown-B', () => this.selectChoice('b'));
        this.input.keyboard?.on('keydown-C', () => this.selectChoice('c'));
        
        // R for restart (when at ending)
        this.input.keyboard?.on('keydown-R', () => {
            const currentNode = this.storyManager.getCurrentNode();
            if (currentNode?.ending) {
                this.storyManager.reset();
                this.loadStoryNode(this.storyManager.start());
            }
        });
    }

    private createUIElements(width: number, height: number): void {
        // Mute indicator
        const muteText = this.add.text(
            width - 20,
            20,
            '🔊',
            {
                fontFamily: 'monospace',
                fontSize: '24px',
                color: '#ffffff'
            }
        );
        muteText.setOrigin(1, 0);
        muteText.setInteractive({ useHandCursor: true });
        muteText.setDepth(100);
        muteText.on('pointerdown', () => this.toggleMute());

        // Fullscreen button
        const fullscreenText = this.add.text(
            width - 60,
            20,
            '⛶',
            {
                fontFamily: 'monospace',
                fontSize: '24px',
                color: '#ffffff'
            }
        );
        fullscreenText.setOrigin(1, 0);
        fullscreenText.setInteractive({ useHandCursor: true });
        fullscreenText.setDepth(100);
        fullscreenText.on('pointerdown', () => this.toggleFullscreen());

        // Instructions
        const instructions = this.add.text(
            width / 2,
            20,
            'Press [1-3] for choices | [M] Mute | [F] Fullscreen',
            {
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#666666'
            }
        );
        instructions.setOrigin(0.5, 0);
        instructions.setDepth(100);
    }

    private loadStoryNode(node: StoryNode | null): void {
        if (!node || this.isTransitioning) return;
        
        this.isTransitioning = true;

        // Fade out old content
        this.tweens.add({
            targets: [this.storyText, ...this.choiceButtons],
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Clear old choices
                this.choiceButtons.forEach(button => button.destroy());
                this.choiceButtons = [];

                // Update background
                if (node.bg) {
                    this.changeBackground(node.bg);
                }

                // Play sound if specified
                if (node.sfx) {
                    this.playSound(node.sfx);
                }

                // Update story text
                this.storyText.setText(node.text);

                // Create choice buttons if not an ending
                if (!node.ending) {
                    this.createChoiceButtons(node);
                } else {
                    // Add restart button for endings
                    this.createEndingButton();
                }

                // Fade in new content
                this.tweens.add({
                    targets: [this.storyText, ...this.choiceButtons],
                    alpha: 1,
                    duration: 500,
                    onComplete: () => {
                        this.isTransitioning = false;
                    }
                });
            }
        });
    }

    private createChoiceButtons(node: StoryNode): void {
        if (!node.choices || !node.next) return;

        const width = this.scale.width;
        const height = this.scale.height;
        const buttonY = height - 80;
        
        const choiceKeys = Object.keys(node.choices);
        const buttonSpacing = 250;
        const startX = width / 2 - ((choiceKeys.length - 1) * buttonSpacing) / 2;

        choiceKeys.forEach((key, index) => {
            const choiceText = node.choices![key];
            
            // Create button container
            const buttonContainer = this.add.container(startX + index * buttonSpacing, buttonY);

            // Button background
            const buttonBg = this.add.rectangle(0, 0, 220, 40, 0x1a1a1a, 0.9);
            buttonBg.setStrokeStyle(2, 0xffa500, 0.5);
            buttonBg.setInteractive({ useHandCursor: true });

            // Button text - using letters (a, b, c) or numbers
            const displayKey = key.length === 1 ? key.toUpperCase() : (index + 1).toString();
            const buttonText = this.add.text(0, 0, `[${displayKey}] ${choiceText}`, {
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 200 }
            });
            buttonText.setOrigin(0.5);

            // Add hover effects
            buttonBg.on('pointerover', () => {
                buttonBg.setFillStyle(0x2a2a2a, 0.9);
                buttonBg.setStrokeStyle(2, 0xffa500, 1);
                buttonText.setColor('#ffa500');
            });

            buttonBg.on('pointerout', () => {
                buttonBg.setFillStyle(0x1a1a1a, 0.9);
                buttonBg.setStrokeStyle(2, 0xffa500, 0.5);
                buttonText.setColor('#ffffff');
            });

            buttonBg.on('pointerdown', () => {
                this.selectChoice(key);
            });

            buttonContainer.add([buttonBg, buttonText]);
            buttonContainer.setDepth(12);
            buttonContainer.setAlpha(0);
            this.choiceButtons.push(buttonContainer);
        });
    }

    private createEndingButton(): void {
        const width = this.scale.width;
        const height = this.scale.height;
        const buttonY = height - 80;

        const buttonContainer = this.add.container(width / 2, buttonY);

        const buttonBg = this.add.rectangle(0, 0, 220, 40, 0x8b0000, 0.9);
        buttonBg.setStrokeStyle(2, 0xffa500, 0.8);
        buttonBg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(0, 0, '[R] Restart', {
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            color: '#ffffff',
            align: 'center'
        });
        buttonText.setOrigin(0.5);

        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0xaa0000, 0.9);
            buttonText.setColor('#ffa500');
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x8b0000, 0.9);
            buttonText.setColor('#ffffff');
        });

        buttonBg.on('pointerdown', () => {
            this.storyManager.reset();
            this.loadStoryNode(this.storyManager.start());
        });

        buttonContainer.add([buttonBg, buttonText]);
        buttonContainer.setDepth(12);
        buttonContainer.setAlpha(0);
        this.choiceButtons.push(buttonContainer);
    }

    private selectChoice(choiceId: string): void {
        if (this.isTransitioning) return;

        const nextNode = this.storyManager.next(choiceId);
        if (nextNode) {
            this.loadStoryNode(nextNode);
        }
    }

    private changeBackground(backgroundKey: string): void {
        // Fade transition for background
        this.tweens.add({
            targets: this.backgroundImage,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                if (this.textures.exists(backgroundKey)) {
                    this.backgroundImage.setTexture(backgroundKey);
                }
                this.tweens.add({
                    targets: this.backgroundImage,
                    alpha: 1,
                    duration: 500
                });
            }
        });
    }

    private playSound(soundKey: string): void {
        if (this.isMuted) return;

        // Stop current ambient sound if playing
        if (this.ambientSound) {
            this.ambientSound.stop();
        }

        // Play new sound
        if (this.cache.audio.exists(soundKey)) {
            if (soundKey === 'ambience') {
                this.ambientSound = this.sound.add(soundKey, { loop: true, volume: 0.3 });
                this.ambientSound.play();
            } else {
                // Play one-shot sounds
                this.sound.play(soundKey, { volume: 0.5 });
            }
        }
    }

    private toggleMute(): void {
        this.isMuted = !this.isMuted;
        this.sound.mute = this.isMuted;
        
        // Update mute indicator
        const muteButton = this.children.getChildren().find(
            child => child instanceof Phaser.GameObjects.Text && child.x > this.scale.width - 30
        ) as Phaser.GameObjects.Text;
        
        if (muteButton) {
            muteButton.setText(this.isMuted ? '🔇' : '🔊');
        }
    }

    private toggleFullscreen(): void {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
}
