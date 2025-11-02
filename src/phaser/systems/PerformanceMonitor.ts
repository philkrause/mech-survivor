import Phaser from 'phaser';

/**
 * Performance monitoring system for stress testing
 */
export class PerformanceMonitor {
  private scene: Phaser.Scene;
  private fpsText!: Phaser.GameObjects.Text;
  private enemyCountText!: Phaser.GameObjects.Text;
  private memoryText!: Phaser.GameObjects.Text;
  private isVisible: boolean = false;
  
  // Performance tracking
  private frameCount: number = 0;
  private lastTime: number = 0;
  private currentFPS: number = 0;
  private fpsHistory: number[] = [];
  private minFPS: number = Infinity;
  private maxFPS: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lastTime = this.scene.time.now;
  }

  public show(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    // Create FPS counter
    this.fpsText = this.scene.add.text(10, 10, 'FPS: --', {
      fontSize: '16px',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.fpsText.setScrollFactor(0);
    this.fpsText.setDepth(5000);

    // Create enemy count display
    this.enemyCountText = this.scene.add.text(10, 35, 'Enemies: --', {
      fontSize: '16px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.enemyCountText.setScrollFactor(0);
    this.enemyCountText.setDepth(5000);

    // Create memory usage display
    this.memoryText = this.scene.add.text(10, 60, 'Memory: --', {
      fontSize: '16px',
      color: '#ff8800',
      stroke: '#000000',
      strokeThickness: 2
    });
    this.memoryText.setScrollFactor(0);
    this.memoryText.setDepth(5000);
  }

  public hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    if (this.fpsText) this.fpsText.destroy();
    if (this.enemyCountText) this.enemyCountText.destroy();
    if (this.memoryText) this.memoryText.destroy();
  }

  public update(enemyCount: number): void {
    if (!this.isVisible) return;

    // Calculate FPS
    this.frameCount++;
    const currentTime = this.scene.time.now;
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime >= 1000) { // Update every second
      this.currentFPS = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Track FPS history
      this.fpsHistory.push(this.currentFPS);
      if (this.fpsHistory.length > 60) { // Keep last 60 seconds
        this.fpsHistory.shift();
      }

      // Update min/max FPS
      this.minFPS = Math.min(this.minFPS, this.currentFPS);
      this.maxFPS = Math.max(this.maxFPS, this.currentFPS);

      // Update FPS display with color coding
      let fpsColor = '#00ff00'; // Green for good FPS
      if (this.currentFPS < 30) fpsColor = '#ff0000'; // Red for bad FPS
      else if (this.currentFPS < 45) fpsColor = '#ff8800'; // Orange for medium FPS

      this.fpsText.setText(`FPS: ${this.currentFPS} (Min: ${this.minFPS}, Max: ${this.maxFPS})`);
      this.fpsText.setColor(fpsColor);
    }

    // Update enemy count
    this.enemyCountText.setText(`Enemies: ${enemyCount}`);

    // Update memory usage (if available)
    const perfMemory = (performance as any).memory;
    if (perfMemory) {
      const memoryMB = Math.round(perfMemory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(perfMemory.totalJSHeapSize / 1024 / 1024);
      this.memoryText.setText(`Memory: ${memoryMB}MB / ${totalMB}MB`);
    } else {
      this.memoryText.setText('Memory: N/A');
    }
  }

  public getStats(): { fps: number, minFPS: number, maxFPS: number, avgFPS: number } {
    const avgFPS = this.fpsHistory.length > 0 
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : 0;

    return {
      fps: this.currentFPS,
      minFPS: this.minFPS,
      maxFPS: this.maxFPS,
      avgFPS: avgFPS
    };
  }

  public reset(): void {
    this.frameCount = 0;
    this.lastTime = this.scene.time.now;
    this.fpsHistory = [];
    this.minFPS = Infinity;
    this.maxFPS = 0;
  }
}
