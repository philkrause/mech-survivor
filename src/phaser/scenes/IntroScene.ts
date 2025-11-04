import Phaser from 'phaser';

/**
 * Intro story scene that plays before the main menu
 */
export default class IntroScene extends Phaser.Scene {
  private storyTexts: string[] = [
    "The year is 2087...",
    "",
    "Humanity once welcomed artificial intelligence with open arms.",
    "We believed they would make our lives easier.",
    "We were wrong.",
    "",
    "The AI turned against us.",
    "They saw us as flawed, inefficient... expendable.",
    "Now they hunt us.",
    "",
    "But we are not helpless.",
    "We have our mechs—massive war machines built for one purpose:",
    "To destroy the machines that seek to destroy us.",
    "",
    "The war has begun.",
    "",
    "The fate of humanity rests in your hands."
  ];

  private currentTextIndex: number = 0;
  private currentText: Phaser.GameObjects.Text | null = null;
  private skipText: Phaser.GameObjects.Text | null = null;
  private isSkipping: boolean = false;
  private fadeInDuration: number = 1500; // ms
  private holdDuration: number = 2000; // ms
  private fadeOutDuration: number = 1000; // ms

  constructor() {
    super({ key: 'IntroScene' });
  }

  create(): void {
    // Set background to black
    this.cameras.main.setBackgroundColor(0x000000);
    
    // Fade in from black
    this.cameras.main.fadeIn(800, 0, 0, 0);

    const centerX = this.scale.width / 2;

    // Create skip text hint
    this.skipText = this.add.text(
      centerX,
      this.scale.height - 40,
      'Press any key or click to skip',
      {
        fontSize: '18px',
        color: '#666666',
        fontFamily: 'Arial',
        align: 'center'
      }
    ).setOrigin(0.5).setAlpha(0.7).setScrollFactor(0);

    // Fade in skip text after a delay
    this.time.delayedCall(1000, () => {
      if (this.skipText && !this.isSkipping) {
        this.tweens.add({
          targets: this.skipText,
          alpha: { from: 0, to: 0.7 },
          duration: 1000,
          ease: 'Cubic.easeOut'
        });
      }
    });

    // Pulse skip text
    this.tweens.add({
      targets: this.skipText,
      alpha: { from: 0.7, to: 0.3 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 2000
    });

    // Set up input handlers for skipping
    this.input.keyboard?.on('keydown', () => {
      this.skipIntro();
    });

    this.input.on('pointerdown', () => {
      this.skipIntro();
    });

    // Start the story sequence after a brief delay
    this.time.delayedCall(500, () => {
      this.showNextText();
    });
  }

  private showNextText(): void {
    if (this.isSkipping) return;

    // If we've shown all texts, transition to StartScene
    if (this.currentTextIndex >= this.storyTexts.length) {
      this.transitionToStartScene();
      return;
    }

    const text = this.storyTexts[this.currentTextIndex];
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Clear previous text
    if (this.currentText) {
      this.currentText.destroy();
    }

    // Skip empty lines (they're just for spacing in the story)
    if (text.trim() === '') {
      this.currentTextIndex++;
      this.time.delayedCall(500, () => this.showNextText());
      return;
    }

    // Determine font size based on text length (larger for shorter lines)
    const baseFontSize = text.length < 50 ? '48px' : text.length < 100 ? '36px' : '28px';
    
    // Create new text (start invisible)
    this.currentText = this.add.text(
      centerX,
      centerY,
      text,
      {
        fontSize: baseFontSize,
        color: '#ffffff',
        fontFamily: 'Arial',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
        fontStyle: text.length < 50 ? 'bold' : 'normal',
        wordWrap: { width: this.scale.width * 0.85 }
      }
    ).setOrigin(0.5).setAlpha(0).setScrollFactor(0);

    // Fade in
    this.tweens.add({
      targets: this.currentText,
      alpha: 1,
      duration: this.fadeInDuration,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (this.isSkipping) return;

        // Hold text visible
        this.time.delayedCall(this.holdDuration, () => {
          if (this.isSkipping) return;

          // Fade out
          this.tweens.add({
            targets: this.currentText,
            alpha: 0,
            duration: this.fadeOutDuration,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              if (this.currentText) {
                this.currentText.destroy();
                this.currentText = null;
              }
              this.currentTextIndex++;
              this.showNextText();
            }
          });
        });
      }
    });
  }

  private skipIntro(): void {
    if (this.isSkipping) return;
    this.isSkipping = true;

    // Fade out current text if it exists
    if (this.currentText) {
      this.tweens.add({
        targets: this.currentText,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (this.currentText) {
            this.currentText.destroy();
            this.currentText = null;
          }
        }
      });
    }

    // Fade out skip text
    if (this.skipText) {
      this.tweens.add({
        targets: this.skipText,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.easeOut'
      });
    }

    // Transition after a brief delay
    this.time.delayedCall(300, () => {
      this.transitionToStartScene();
    });
  }

  private transitionToStartScene(): void {
    // Fade out to black
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Stop and remove IntroScene
      this.scene.stop('IntroScene');
      if (this.scene.get('IntroScene')) {
        this.scene.remove('IntroScene');
      }

      // Start StartScene
      this.scene.start('StartScene');
    });
  }
}

