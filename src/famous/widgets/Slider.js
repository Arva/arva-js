/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Surface from '../core/Surface.js';
import CanvasSurface from '../surfaces/CanvasSurface.js';
import EventHandler from '../core/EventHandler.js';
import Transform from '../core/Transform.js';
import Utilities from '../math/Utilities.js';
import OptionsManager from '../core/OptionsManager.js';

import MouseSync from '../inputs/MouseSync.js';
import TouchSync from '../inputs/TouchSync.js';
import GenericSync from '../inputs/GenericSync.js';


GenericSync.register({
  mouse : MouseSync,
  touch : TouchSync
});

export default class Slider {

    /** @constructor */
    constructor(options) {
        this.options = Object.create(Slider.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.indicator = new CanvasSurface({
            size: this.options.indicatorSize,
            classes : ['slider-back']
        });

        this.label = new Surface({
            size: this.options.labelSize,
            content: this.options.label,
            properties : {pointerEvents : 'none'},
            classes: ['slider-label']
        });

        this.eventOutput = new EventHandler();
        this.eventInput = new EventHandler();
        EventHandler.setInputHandler(this, this.eventInput);
        EventHandler.setOutputHandler(this, this.eventOutput);

        let scale = (this.options.range[1] - this.options.range[0]) / this.options.indicatorSize[0];

        this.sync = new GenericSync(
            ['mouse', 'touch'],
            {
                scale : scale,
                direction : GenericSync.DIRECTION_X
            }
        );

        this.indicator.pipe(this.sync);
        this.sync.pipe(this);

        this.eventInput.on('update', function(data) {
            this.set(data.position);
        }.bind(this));

        this._drawPos = 0;
        this._updateLabel();
    }

    static with() {
      return Surface.with(...arguments);
    }

    static DEFAULT_OPTIONS = {
        size: [200, 60],
        indicatorSize: [200, 30],
        labelSize: [200, 30],
        range: [0, 1],
        precision: 2,
        value: 0,
        label: '',
        fillColor: 'rgba(170, 170, 170, 1)'
    }

    _updateLabel() {
        this.label.setContent(this.options.label + '<span style="float: right">' + this.get().toFixed(this.options.precision) + '</span>');
    }

    setOptions(options) {
        return this.optionsManager.setOptions(options);
    }

    get() {
        return this.options.value;
    }

    set(value) {
        if (value === this.options.value) return;
        this.options.value = Utilities.clamp(value, this.options.range);
        _updateLabel.call(this);
        this.eventOutput.emit('change', {value: value});
    }

    getSize() {
        return this.options.size;
    }

    render() {
        let range = this.options.range;
        let fillSize = Math.floor(((this.get() - range[0]) / (range[1] - range[0])) * this.options.indicatorSize[0]);

        if (fillSize < this._drawPos) {
            this.indicator.getContext('2d').clearRect(fillSize, 0, this._drawPos - fillSize + 1, this.options.indicatorSize[1]);
        }
        else if (fillSize > this._drawPos) {
            let ctx = this.indicator.getContext('2d');
            ctx.fillStyle = this.options.fillColor;
            ctx.fillRect(this._drawPos-1, 0, fillSize - this._drawPos+1, this.options.indicatorSize[1]);
        }
        this._drawPos = fillSize;

        return {
            size: this.options.size,
            target: [
                {
                    origin: [0, 0],
                    target: this.indicator.render()
                },
                {
                    transform: Transform.translate(0, 0, 1),
                    origin: [0, 0],
                    target: this.label.render()
                }
            ]
        };
    }
}
