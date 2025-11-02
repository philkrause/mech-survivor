export class CollisionSystem {
    constructor(private scene: Phaser.Scene) {}
  
    setupProjectileEnemyCollision(
      projectileGroup: Phaser.GameObjects.Group | Phaser.Physics.Arcade.Group,
      enemyGroup: Phaser.GameObjects.Group | Phaser.Physics.Arcade.Group,
      onHit: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
    ): void {
      this.scene.physics.add.overlap(
        projectileGroup,
        enemyGroup,
        onHit,
        (projectile, enemy) => {
            (projectile as Phaser.Physics.Arcade.Sprite).active &&
            (enemy as Phaser.Physics.Arcade.Sprite).active
        },
        this
      );
    }
  
    setupEnemyEnemyCollision(
      enemyGroup: Phaser.GameObjects.Group | Phaser.Physics.Arcade.Group,
      filterCallback: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback
    ): void {
      this.scene.physics.add.collider(
        enemyGroup,
        enemyGroup,
        undefined,
        filterCallback,
        this
      );
    }

    setupPlayerEnemyCollision(
      player: Phaser.GameObjects.Sprite,
      enemyGroup: Phaser.GameObjects.Group | Phaser.Physics.Arcade.Group,
    ): void {
      this.scene.physics.add.collider(
        enemyGroup,
        player
      );
    }
  
    // More specialized methods can be added here (e.g., player-wall, enemy-wall, pickups)
  }
  