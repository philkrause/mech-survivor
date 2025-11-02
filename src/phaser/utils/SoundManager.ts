import Phaser from 'phaser';

/**
 * Centralized sound manager that ensures all sounds respect the global volume setting.
 * All sound effects should be played through this manager to maintain consistent volume behavior.
 */
export class SoundManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play a sound effect with a relative volume (0-1).
   * Phaser automatically multiplies this by the global volume, so we pass it directly.
   * 
   * @param key Sound key to play
   * @param relativeVolume Relative volume (0-1) - this is the desired volume if global volume is at max
   * @param config Optional additional sound configuration
   * @returns The sound instance that was played
   */
  playSound(
    key: string, 
    relativeVolume: number = 1.0,
    config?: Phaser.Types.Sound.SoundConfig
  ): Phaser.Sound.BaseSound | boolean {
    // Get current global volume
    const globalVolume = this.scene.sound.volume;
    
    // Calculate final volume: relative volume * global volume
    // Phaser multiplies config volume by global volume, so we pass the relative volume
    // and then explicitly set it to ensure it's correct
    const finalVolume = Math.max(0, Math.min(1, relativeVolume * globalVolume));
    
    const soundConfig: Phaser.Types.Sound.SoundConfig = {
      ...config,
      volume: finalVolume
    };
    
    const sound = this.scene.sound.play(key, soundConfig);
    
    // If sound is an object (not boolean), ensure volume is set correctly
    if (sound && typeof sound === 'object' && sound !== null) {
      try {
        // Explicitly set volume on the sound instance to ensure it respects global volume
        const webAudioSound = sound as any as Phaser.Sound.WebAudioSound;
        if (webAudioSound && typeof webAudioSound.setVolume === 'function') {
          webAudioSound.setVolume(finalVolume);
        }
      } catch (e) {
        // If setVolume doesn't work, the volume from config should be sufficient
      }
    }
    
    return sound;
  }

  /**
   * Get the current global volume setting
   */
  getGlobalVolume(): number {
    return this.scene.sound.volume;
  }

  /**
   * Set the global volume (this should be called from the scene's volume setting)
   * Note: This should typically be set through the scene's setMusicVolume method
   * to ensure music also gets updated.
   */
  setGlobalVolume(volume: number): void {
    this.scene.sound.volume = Math.max(0, Math.min(1, volume));
  }
}

