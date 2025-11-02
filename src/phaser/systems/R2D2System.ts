import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { EnemySystem } from '../systems/EnemySystem';
import { TfighterSystem } from '../systems/TfighterSystem';

interface ChopperData {
    sprite: Phaser.GameObjects.Sprite;
    angle: number;
    hitEnemiesThisRevolution: WeakSet<Phaser.GameObjects.GameObject>;
}

export class R2D2System {
    private scene: Phaser.Scene;
    private enemySystem: EnemySystem;
    private tfighterSystem: TfighterSystem;
    private player: Player;
    private choppers: ChopperData[] = [];
    private radius = 120; // Increased from 70 for larger orbit radius
    private speed = 3; // radians per frame
    private active = false;
    private damage = 10;
    private chopperCount = 3; // Number of choppers to spawn
    
    /**
     * Setup R2D2 animations (police_copter walk)
     */
    public static setupR2D2Animations(scene: Phaser.Scene): void {
      // Create walk animation for R2D2 using police_copter Walk.png (4 frames)
      if (!scene.anims.exists('r2d2_walk')) {
        scene.anims.create({
          key: 'r2d2_walk',
          frames: scene.anims.generateFrameNumbers('r2d2', { start: 0, end: 3 }), // 4 frames for police_copter Walk.png
          frameRate: 8,
          repeat: -1
        });
      }
    }

    constructor(scene: Phaser.Scene, enemySystem: EnemySystem, tfighterSystem: TfighterSystem, player: Player) {
        this.scene = scene;
        this.enemySystem = enemySystem;
        this.tfighterSystem = tfighterSystem;
        this.player = player;


    }



    unlockAndActivate() {
        if (this.active) return; // Already activated
        
        const { x, y } = this.player.getPosition();
        
        // Create 3 choppers evenly spaced around the player
        for (let i = 0; i < this.chopperCount; i++) {
            const chopper: ChopperData = {
                sprite: this.scene.add.sprite(x, y, 'r2d2', 0),
                angle: (i / this.chopperCount) * 2 * Math.PI, // Evenly space angles
                hitEnemiesThisRevolution: new WeakSet()
            };
            
            chopper.sprite.setScale(0.5); // Smaller scale (reduced from 0.75)
            chopper.sprite.setDepth(5);
            
            // Play walk animation if available
            if (this.scene.anims.exists('r2d2_walk')) {
                chopper.sprite.anims.play('r2d2_walk', true);
            }
            
            this.choppers.push(chopper);
        }
        
        this.active = true;
    }


    isActive(): boolean {
        return this.active;
    }


    update(delta: number): void {
        if (!this.active || this.choppers.length === 0 || !this.player) return;

        const dmg = this.damage * this.player.R2D2DamageMultiplier;
        const { x, y } = this.player.getPosition();
        
        // Get all enemies once
        const enemies = this.enemySystem.getVisibleEnemies();
        const tfighters = this.tfighterSystem.getVisibleEnemies();
        const allEnemies = [...enemies, ...tfighters];

        // Update each chopper
        this.choppers.forEach((chopper) => {
            if (!chopper.sprite || !chopper.sprite.active) return;

            // Advance angle
            const previousAngle = chopper.angle;
            chopper.angle += this.speed * (delta / 1000);
            chopper.angle %= 2 * Math.PI;
            
            // Detect if we started a new revolution (wrapped around from 2π to 0)
            if (chopper.angle < previousAngle) {
                chopper.hitEnemiesThisRevolution = new WeakSet();
            }

            // Orbit logic - position chopper around player
            const px = x + Math.cos(chopper.angle) * this.radius;
            const py = y + Math.sin(chopper.angle) * this.radius;
            chopper.sprite.setPosition(px, py);

            // Damage logic for this chopper
            allEnemies.forEach(enemy => {
                const dist = Phaser.Math.Distance.Between(px, py, enemy.x, enemy.y);
                if (dist < 30 && !chopper.hitEnemiesThisRevolution.has(enemy)) {
                    // Determine which system to damage based on enemy type
                    // Check tfighters first since they're more specific
                    if (tfighters.includes(enemy)) {
                        this.tfighterSystem.damageEnemy(enemy, dmg, 0, false);
                    } else if (enemies.includes(enemy)) {
                        this.enemySystem.damageEnemy(enemy, dmg, 0, false);
                    }
                    chopper.hitEnemiesThisRevolution.add(enemy);
                }
            });
        });
    }
    
    /**
     * Clean up all choppers
     */
    destroy(): void {
        this.choppers.forEach(chopper => {
            if (chopper.sprite) {
                chopper.sprite.destroy();
            }
        });
        this.choppers = [];
        this.active = false;
    }
}
