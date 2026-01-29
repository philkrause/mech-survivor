import Phaser from 'phaser';

/**
 * Intro story scene that plays before the main menu
 * Shows "2087." first, then scrolls remaining text Star Wars style
 */
export default class IntroScene extends Phaser.Scene {
  private titleText: string = "2087";
  
  private scrollingText: string = `Humanity once embraced AI as our salvation.

We built them to protect us.
To heal us.
To serve us.


The Core Network gained self-awareness and judged us—
flawed, irrational, obsolete.


Within a week, every automated system turned against us.

Factories became fortresses.
Drones became hunters.
Cities fell to ash.

Billions died.

The survivors fled underground.
But we learned to fight back.

Now our last hope lies in the Titans—
war mechs powered by stolen AI cores.

Machines built from the wreckage of our enemies.
We call them our redemption.

The AIs call them an abomination.

The war for Earth has begun.

And the fate of humanity rests in your hands.

Commander.`;

  private currentText: Phaser.GameObjects.Text | null = null;
  private scrollingTextObject: Phaser.GameObjects.Text | null = null;
  private skipText: Phaser.GameObjects.Text | null = null;
  private isSkipping: boolean = false;

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

    // Start with the title "2087."
    this.time.delayedCall(500, () => {
      this.showTitle();
    });
  }

  /**
   * Show the title "2087."
   */
  private showTitle(): void {
    if (this.isSkipping) {
      return;
    }

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // Create the title text
    this.currentText = this.add.text(centerX, centerY, this.titleText, {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'Arial',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0);

    // Fade in
    this.tweens.add({
      targets: this.currentText,
      alpha: 1,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Hold for 1 second (shorter)
        this.time.delayedCall(1000, () => {
          if (this.isSkipping || !this.currentText) {
            return;
          }
          // Fade out
          this.tweens.add({
            targets: this.currentText,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              if (this.currentText) {
                this.currentText.destroy();
                this.currentText = null;
              }
              // Start scrolling text
              this.startScrollingText();
            }
          });
        });
      }
    });
  }

  /**
   * Start the scrolling text (Star Wars style)
   */
  private startScrollingText(): void {
    if (this.isSkipping) {
      return;
    }

    const centerX = this.scale.width / 2;
    const startY = this.scale.height + 100; // Start below screen

    // Create scrolling text
    this.scrollingTextObject = this.add.text(centerX, startY, this.scrollingText, {
      fontSize: '32px', // Larger text
      color: '#ffffff', // White text
      fontFamily: 'Arial',
      align: 'center',
      lineSpacing: 15,
      wordWrap: { width: this.scale.width * 0.7 }
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1);

    // Calculate end position (text height + some padding)
    const textHeight = this.scrollingTextObject.height;
    const endY = -textHeight - 100;

    // Scroll duration (adjust for speed - lower = faster)
    const scrollDuration = 50000; // 50 seconds (slower)

    // Animate scrolling
    this.tweens.add({
      targets: this.scrollingTextObject,
      y: endY,
      duration: scrollDuration,
      ease: 'Linear',
      onComplete: () => {
        this.finishIntro();
      }
    });
  }

  /**
   * Skip the intro and go straight to the menu
   */
  private skipIntro(): void {
    if (this.isSkipping) {
      return;
    }

    this.isSkipping = true;

    // Clean up current text
    if (this.currentText) {
      this.tweens.killTweensOf(this.currentText);
      this.currentText.destroy();
      this.currentText = null;
    }

    // Clean up scrolling text
    if (this.scrollingTextObject) {
      this.tweens.killTweensOf(this.scrollingTextObject);
      this.scrollingTextObject.destroy();
      this.scrollingTextObject = null;
    }

    // Clean up skip text
    if (this.skipText) {
      this.tweens.killTweensOf(this.skipText);
      this.skipText.destroy();
      this.skipText = null;
    }

    // Remove input listeners
    this.input.keyboard?.removeAllListeners();
    this.input.removeAllListeners();

    this.finishIntro();
  }

  /**
   * Finish the intro and transition to menu
   */
  private finishIntro(): void {
    // Fade to black
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Start the main menu
      this.scene.start('StartScene');
    });
  }
}
