import FamousSurface from 'famous/core/Surface.js';

/**
 * A class for making html5 audio elements
 *   targets inside an Arva application, containing a renderable audio
 *   fragment. Like an HTML div, it can accept internal markup,
 *   properties, classes, and handle events.
 *
 * @class AudioSurface
 * @constructor
 *
 * @param {Object} [options] default option overrides
 * @param {Array.Number} [options.size] [width, height] in pixels
 * @param {Array.string} [options.classes] CSS classes to set on target div
 * @param {Array} [options.properties] string dictionary of CSS properties to set on target div
 * @param {Array} [options.attributes] string dictionary of HTML attributes to set on target div
 * @param {string} [options.content] inner (HTML) content of surface
 */
export class AudioSurface extends FamousSurface {

    get elementType() {
        return 'audio';
    }

    get elementClass() {
        return 'famous-surface';
    }

    get bufferLength() {
        return this._bufferLength || 0;
    }

    get volume() {
      return this._volume;
    }

    get analyserActive() {
      return this._analyserId!=null;
    }

    constructor(options = { properties: {}}) {
      super();
      this.streamUrl = options.properties.url || '';
      this._value = '';
      this._name = options.name || '';
      this._bufferLength = 0;

      this._handlePlaybackEvents();
    }

    _handlePlaybackEvents() {
      this.on('click', this.focus.bind(this));
      this.on('emptied', () => { if (this.analyserActive) this.stopAnalyser(); });
      this.on('ended', () => { if (this.analyserActive) this.stopAnalyser(); });
      this.on('error', () => { if (this.analyserActive) this.stopAnalyser(); });
      this.on('pause', () => { if (this.analyserActive) this.stopAnalyser(); });
    }

    focus() {
        if (this._currentTarget)
            this._currentTarget.focus();
        return this;
    }

    blur() {
        if (this._currentTarget)
            this._currentTarget.blur();
        return this;
    }

    setName() {
        this._name = str;
        this._contentDirty = true;
        return this;
    }

    getName() {
        return this._name;
    }

    /**
     * Sets audio source from url
     */
    setUrl(url) {
      this._element.setAttribute('src', url);
    }

    /**
     * Starts playing the audio
     */
    play() {
      this._element.play();
    }

    /**
     * Re-loads the audio element
     */
    pause() {
      this._element.pause();
    }

    /**
     * Re-loads the audio element
     */
    load() {
      this._element.load();
    }

    /**
     * Start emitting audio frames to subscribers of this surface
     */
    startAnalyser(options = {}) {
      let audioContext = new (window.AudioContext || window.webkitAudioContext); // this is because it's not been standardised accross browsers yet.
      this._analyser = audioContext.createAnalyser();

      this._analyser.fftSize = options.fftSize || 256;
      this._analyser.smoothingTimeConstant = options.smoothingTimeConstant || 0.8;

      var source = audioContext.createMediaElementSource(this._element); // this is where we hook up the <audio> element
      source.connect(this._analyser);
      this._analyser.connect(audioContext.destination);

      this._bufferLength = this._analyser.frequencyBinCount;
      this._streamData = new Uint8Array(this._bufferLength); // This just means we will have 128 "bins" (always half the analyzer.fftsize value), each containing a number between 0 and 255.

      this._loopAnalyser();
    }

    /**
     * Stop emitting audio frames to subscribers of this surface
     */
    stopAnalyser() {
      cancelAnimationFrame(this._analyserId);
      delete this._analyserId;
    }

    /**
     * Emit audio frames to subscribers of this surface
     * @private
     */
    _loopAnalyser() {
      this._analyser.getByteFrequencyData(this._streamData);
      var total = 0;
      for (var i = 0; i < 80; i++) { // get the volume from the first 80 bins, else it gets too loud with treble
          total += this._streamData[i];
      }
      this._volume = total;

      this.emit('frequencydata', this._streamData);
      this._analyserId = requestAnimationFrame(this._loopAnalyser.bind(this));
    }

    /**
     * Re-loads the audio element
     * @private
     */
    deploy() {
      if (this.streamUrl) {
        this._element.setAttribute('src', this.streamUrl);
      }
      this._element.crossOrigin = 'anonymous';
    }
}
