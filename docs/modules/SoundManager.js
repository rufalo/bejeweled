'use strict';

/**
 * Central coordinator for all p5.sound usage in the game.
 * This module is intentionally framework-agnostic right now; it only tracks
 * state and exposes the public API that the rest of the game can call into.
 *
 * Actual synth and effect wiring will be added in follow-up iterations.
 */
class SoundManager {
  constructor() {
    /**
     * The p5 instance the game bootstraps with. We avoid touching global state
     * directly so we can unit test the manager with mocks.
     * @type {import('p5')}
     */
    this.p5 = null;

    /**
     * Master gain node that all voices route through.
     * @type {import('p5').Gain|null}
     */
    this.masterGain = null;

    /**
     * Cached master volume setting (0.0 - 1.0).
     * @type {number}
     */
    this.masterVolume = 1.0;

    /**
     * Lazily created synth/noise/effect voices keyed by name.
     * @type {Map<string, { dispose: () => void }>}
     */
    this.voices = new Map();

    /**
     * Musical or rhythmic loops keyed by name.
     * @type {Map<string, import('p5').Part>}
     */
    this.loops = new Map();

    /**
     * Flag to guard one-time audio context unlock sequences.
     * @type {Promise<void>|null}
     */
    this.pendingUnlock = null;
  }

  /**
     * Attach the p5 instance that owns the lifecyle for audio resources.
     * Must be invoked before any other sound operation.
     * @param {import('p5')} p5Instance
     */
  setP5Instance(p5Instance) {
    this.p5 = p5Instance;
  }

  /**
     * Retrieves the p5 instance, throwing if it has not been provided yet.
     * Centralizes the null check to avoid silent failures downstream.
     * @returns {import('p5')}
     */
  getP5Instance() {
    if (!this.p5) {
      throw new Error('SoundManager requires a p5 instance. Call setP5Instance() first.');
    }
    return this.p5;
  }

  /**
     * Ensures the master gain node exists and is connected to the output.
     * Follow-up iterations will connect effects in between as needed.
     */
  ensureMasterGain() {
    if (this.masterGain) {
      return;
    }

    const p5Instance = this.getP5Instance();
    this.masterGain = new p5Instance.Gain();
    this.masterGain.connect(p5Instance.getAudioContext().destination);
    this.masterGain.amp(this.masterVolume);
  }

  /**
     * Requests a user-gesture-based unlock of the audio context (required on
     * mobile browsers). Returns a promise that resolves once the context is
     * resumed or rejects if that fails.
     * Future work: centralize gesture binding in the main UI.
     * @returns {Promise<void>}
     */
  unlockAudioContext() {
    if (this.pendingUnlock) {
      return this.pendingUnlock;
    }

    const p5Instance = this.getP5Instance();
    const audioContext = p5Instance.getAudioContext();

    if (audioContext.state === 'running') {
      return Promise.resolve();
    }

    this.pendingUnlock = audioContext.resume().catch((error) => {
      this.pendingUnlock = null;
      throw error;
    });

    return this.pendingUnlock;
  }

  /**
     * Adjusts the master volume for all future output. Clamps value safely.
     * @param {number} volume A normalized value between 0.0 and 1.0.
     */
  setMasterVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.amp(this.masterVolume, 0.05);
    }
  }

  /**
     * Registers a lazily-created voice. The factory callback returns the
     * concrete synth/effect instance and will only run on first use.
     * @param {string} name
     * @param {() => { output: import('p5').Gain, dispose: () => void }} factory
     */
  registerVoice(name, factory) {
    if (this.voices.has(name)) {
      throw new Error(`SoundManager voice "${name}" already registered.`);
    }
    this.voices.set(name, {
      instance: null,
      factory,
    });
  }

  /**
     * Retrieves a voice by name, creating it if necessary, and ensures it is
     * routed into the master gain.
     * @param {string} name
     * @returns {{ output: import('p5').Gain, dispose: () => void }}
     */
  getVoice(name) {
    if (!this.voices.has(name)) {
      throw new Error(`SoundManager voice "${name}" is not registered.`);
    }

    const voiceEntry = /** @type {{ instance: any, factory: Function }} */ (
      this.voices.get(name)
    );

    if (!voiceEntry.instance) {
      this.ensureMasterGain();
      const createdVoice = voiceEntry.factory();
      createdVoice.output.disconnect();
      createdVoice.output.connect(this.masterGain);
      voiceEntry.instance = createdVoice;
    }

    return voiceEntry.instance;
  }

  /**
     * Registers a musical loop. The factory returns a configured `p5.Part`
     * that the manager will start/stop on demand.
     * @param {string} name
     * @param {() => import('p5').Part} factory
     */
  registerLoop(name, factory) {
    if (this.loops.has(name)) {
      throw new Error(`SoundManager loop "${name}" already registered.`);
    }
    this.loops.set(name, {
      part: null,
      factory,
    });
  }

  /**
     * Starts a loop by name, creating it on first call.
     * @param {string} name
     */
  startLoop(name) {
    const loopEntry = this.loops.get(name);
    if (!loopEntry) {
      throw new Error(`SoundManager loop "${name}" is not registered.`);
    }

    if (!loopEntry.part) {
      loopEntry.part = loopEntry.factory();
    }

    loopEntry.part.start();
  }

  /**
     * Stops a running loop.
     * @param {string} name
     */
  stopLoop(name) {
    const loopEntry = this.loops.get(name);
    if (!loopEntry || !loopEntry.part) {
      return;
    }
    loopEntry.part.stop();
  }

  /**
     * Tears down all registered voices and loops. Useful for restarting the
     * game or cleaning up between scenes.
     */
  dispose() {
    this.voices.forEach((entry, name) => {
      if (entry.instance && typeof entry.instance.dispose === 'function') {
        entry.instance.dispose();
      }
      this.voices.delete(name);
    });

    this.loops.forEach((entry) => {
      if (entry.part) {
        entry.part.stop();
      }
    });
    this.loops.clear();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    this.pendingUnlock = null;
  }
}

const soundManager = new SoundManager();

export { SoundManager, soundManager };

