/**


 @author: Hans van den Akker (mysim1)
 @license NPOSL-3.0
 @copyright Bizboard, 2015

 */

import extend                   from 'lodash/extend.js'
import cloneDeep                from 'lodash/cloneDeep.js'
import FamousView               from 'famous/core/View.js'
import {RenderablePrototype}    from 'famous/utilities/RenderablePrototype.js'
import LayoutController         from 'famous-flex/LayoutController.js'
import {Surface}                from '../surfaces/Surface.js'
import Engine                   from 'famous/core/Engine.js'
import LayoutUtility            from 'famous-flex/LayoutUtility.js';

import {limit}                  from 'arva-js/utils/Limiter.js'

import {layout}                 from '../layout/Decorators.js'
import {ObjectHelper}           from '../utils/ObjectHelper.js'
import {SizeResolver}           from '../utils/view/SizeResolver.js'
import {Utils}                  from '../utils/view/Utils.js'
import {
    DockedLayoutHelper,
    FullSizeLayoutHelper,
    TraditionalLayoutHelper
}
    from '../utils/view/LayoutHelpers.js'
import {RenderableHelper} from '../utils/view/RenderableHelper.js'
import {ReflowingScrollView} from '../components/ReflowingScrollView.js'
import {MappedArray} from '../utils/view/ArrayObserver.js'
import {combineOptions} from '../utils/CombineOptions.js'
import {OptionObserver} from '../utils/view/OptionObserver.js'

/**
 * An Arva View. This is the heart of Arva and responsible for providing state management and animation.
 *
 */
export class View extends FamousView {

    /**
     * @example
     * HomeController extends Controller {
     *      Index() {
     *          let view = new View();
     *          view.add(new Surface({properties: {backgroundColor: 'red'}}));
     *          return view
     *      }
     * }
     * @example
     * class HomeView extends View {
     *      @layout.size(100, 100)
     *      @layout.stick.center()
     *      mySurface = new Surface({properties: {backgroundColor: 'red'}})
     * }
     *
     *
     *
     * @param {Object} options. The options passed to the view will be stored in this.options, but won't change any
     * behaviour of the core functionality of the view. Instead, configuration of the View is done by decorators.
     *
     * @param children
     */
    constructor(options = {}, children) {

        super(options);


        this._copyPrototypeProperties();
        this._initDataStructures();
        this._initOwnDecorations();
        this._initOptions(options);
        this._initUtils();
        this._constructDecoratedRenderables();

        this._createLayoutController();
        this._initTrueSizedBookkeeping();
        this._setupExtraRenderables(children);

    }

    //noinspection JSUnusedGlobalSymbols
    /**
     * Deprecated, it is no longer required to call build() from within your View instances.
     * @deprecated
     * @returns {void}
     */
    build() {
        Utils.warn(`Arva: calling build() from within views is no longer necessary, any existing calls can safely be removed. Called from ${this._name()}`)
    }

    /**
     * Reflows the layout while also informing any subscribing parents that a reflow has to take place
     */
    reflowRecursively() {
        if (!this._initialised) {
            return;
        }
        this._doReflow();
        let reflowData = {[this.getID()]: true};
        this._eventOutput.emit('recursiveReflow', reflowData);
    }

    _doReflow() {
        if (!this.layout) {
            /* Reflowing before construction, no need to bother */
            return
        }
        this.layout.reflowLayout()
    }

    /**
     * Gets the size used when displaying a renderable on the screen the last tick
     * @param {Surface|View|Name} renderableOrName The renderable or the name of the renderable of which you need the size
     */
    getResolvedSize(renderableOrName) {
        let renderable = renderableOrName;
        if (typeof renderableOrName === 'string') {
            renderable = this.renderables[renderableOrName];
        }
        let size = this._sizeResolver.getResolvedSize(renderable);

        /* Backup: If size can't be resolved, then see if there's a size specified on the decorator */
        if (!size && renderable.decorations) {
            let decoratedSize = renderable.decorations.size;
            let isValidSize = (inputSize) => typeof inputSize === 'number' && inputSize > 0;
            if (decoratedSize && decoratedSize.every(isValidSize)) {
                size = decoratedSize
            }
        }

        return size || [undefined, undefined]
    }

    /**
     * Returns true if the view contains uncalculated surfaces
     * @returns {Boolean}
     */
    containsUncalculatedSurfaces() {
        return this._sizeResolver.containsUncalculatedSurfaces()
    }

    /**
     * Adds a renderable to the layout.
     * @param {Surface|FamousView|View} renderable The renderable to be added
     * @param {Array<Function>} decorators
     * @returns {Surface|FamousView|View} The renderable that was assigned
     */
    addRenderable(renderable, ...decorators) {
        let id = Utils.getRenderableID(renderable);
        if (!id) {
            Utils.warn(`Could not add invalid renderable inside ${this._name()} (no ID of renderable found)`)
        }
        this._renderableHelper.applyDecoratorFunctionsToRenderable(renderable, decorators);
        this._assignRenderable(renderable);
        this[id] = renderable;
        this.layout.reflowLayout();
        return renderable
    }

    /**
     * Removes the renderable from the view
     */
    removeRenderable(renderable) {
        if (!renderable) {
            return Utils.warn(`${this._name()}: Removing renderable that doesn't exist`);
        }
        let renderableID = Utils.getRenderableID(renderable);
        if (!this.renderables[renderableID]) {
            Utils.warn(`Failed to remove renderable ${renderableID} from ${this._name()} because the renderable doesn't exist in the parent scope`);
            return
        }
        this._renderableHelper.removeRenderable(renderableID);
        /* Delete operator isn't allowed here (probably) because the initializer is non-configurable */
        this[this._IDtoLocalRenderableName[renderableID]] = undefined;
        this.layout.reflowLayout()
    }

    hasRenderable(renderable) {
        return !!this.renderables[Utils.getRenderableID(renderable)]
    }

    _getRenderableName(renderable) {
        return this._IDtoLocalRenderableName[Utils.getRenderableID(renderable)]
    }

    /**
     * Rearranges the order in which docked renderables are parsed for rendering, ensuring that 'renderableName' is processed
     * before 'nextRenderableName'.
     * @param {View|Surface} renderable
     * @param {View|Surface} nextRenderable
     */
    prioritiseDockBefore(renderable, nextRenderable) {
        this.reflowRecursively();
        return this._renderableHelper.prioritiseDockBefore(Utils.getRenderableID(renderable), Utils.getRenderableID(nextRenderable))
    }

    /**
     * @param {View|Surface} renderable
     * @param {View|Surface} prevRenderable
     */
    prioritiseDockAfter(renderable, prevRenderable) {
        this.reflowRecursively();
        return this._renderableHelper.prioritiseDockAfter(Utils.getRenderableID(renderable), Utils.getRenderableID(prevRenderable))
    }

    /**
     * Shows a renderable decorated with layout.animate()
     *
     * @param {View|Surface} renderable
     * @returns {Promise} when the renderable has finished its animation
     */
    showRenderable(renderable) {
        return this.toggleRenderable(renderable, true)
    }

    /**
     *
     * @param {View|Surface} renderable
     * @param {String }show
     * @param {Object} options
     * @returns {Promise}
     */
    async toggleRenderable(renderable, show, options = {}) {
        if (!renderable) {
            Utils.warn(`Trying to show renderable which does not exist! (${this._name()})`);
            return
        }
        if (!renderable.animationController) {
            if (typeof renderable === 'string') {
                Utils.warn(`Renderable visibility function called with string argument '${renderable}'. This has been deprecated. Please refactor to this.showRenderable(this.myView) instead of this.showRenderable('myView')`);
                return;
            }
            Utils.warn(`Trying to show renderable which does not have an animationcontroller. Please use @layout.animate`);
            return;
        }

        if (show === undefined) {
            /* If show is not specified, it will switch the renderable to the opposite of the current state */
            show = !this.isRenderableShowing(renderable)
        }

        let decoratedSize = renderable.decorations.size || (renderable.decorations.dock ? renderable.decorations.dock.size : undefined);
        if (decoratedSize) {
            /* Check if animationController has a true size specified. If so a reflow needs to be performed since there is a
             * new size to take into account. */
            for (let dimension of [0, 1]) {
                if (this._sizeResolver.isValueTrueSized(this._sizeResolver.resolveSingleSize(decoratedSize[dimension], [NaN, NaN], dimension))) {
                    this.reflowRecursively();
                    break
                }

            }
        }

        return await new Promise((resolve) => this._renderableHelper.showWithAnimationController(renderable.animationController, renderable, resolve, show, options))
    }

    /**
     * Returns true if animation-controlled renderable is showing
     * @param {View|Surface} renderable
     * @returns {*}
     */
    isRenderableShowing(renderable) {
        if (!renderable.animationController) {
            Utils.warn(`Trying to get visibility of renderable with no @layout.aniamte specified`);
            return true
        }
        return renderable.animationController.get()
    }

    /**
     * Decorates a renderable with other decorators. Using the same decorators as used previously will override the old ones.
     * @example
     * this.decorateRenderable('myRenderable',layout.size(100, 100));
     *
     * @param renderable
     * @param decorators
     */
    decorateRenderable(renderable, ...decorators) {
        if (typeof renderable === 'string') {
            Utils.warn(`decorateRenderable called with string argument. Please use this.decorateRenderable(this[renderableName],...) instead of this.decorateRenderable(renderableName,...)`);
            return;
        }
        if (!decorators.length) {
            Utils.warn('No decorators specified to decorateRenderable(renderable, ...decorators)')
        }
        this._renderableHelper.decorateRenderable(Utils.getRenderableID(renderable), ...decorators);
        this.reflowRecursively()
    }

    /**
     * Sets a renderable flow state as declared in the @flow.stateStep, or @flow.defaultState
     * @param {View|Surface} renderable. The name of the renderable
     * @param {String} stateName. The name of the state as declared in the first argument of the decorator
     * @returns {*}
     */
    setRenderableFlowState(renderable, stateName = '') {
        return this._renderableHelper.setRenderableFlowState(Utils.getRenderableID(renderable), stateName)
    }

    /**
     * Sets a view flow state as declared in the @flow.viewState
     * @param {String} stateName. The name of the state as declared in the first argument of the decorator
     * @returns {Promise}
     */
    setViewFlowState(stateName = '') {
        this._eventOutput.emit('viewFlowStateChanged', stateName);
        if (!this.decorations.viewFlow.viewStates[stateName]) {
            Utils.warn(`Trying to to set flow state ${this._name()}:${stateName}, which doesn't exist!`);
            return Promise.resolve()
        }
        return this._renderableHelper.setViewFlowState(stateName, this.decorations.viewFlow)
    }

    /**
     * Gets the name of a flow state of a renderable.
     *
     * @returns {String} stateName the name of the state that the renderable is in
     * @param renderable
     */
    getRenderableFlowState(renderable) {
        return this._renderableHelper.getRenderableFlowState(Utils.getRenderableID(renderable))
    }

    /**
     * Gets the name of the flow state of a view.
     *
     * @returns {String} stateName the name of the state that this view is in.
     */
    getViewFlowState() {
        return this._renderableHelper.getViewFlowState(this.decorations.viewFlow)
    }

    /**
     * Replaces an existing decorated renderable with a new renderable, preserving all necessary state and decorations
     * @param {View|Surface} oldRenderable. The name of the renderable
     * @param {Surface|FamousView|View} newRenderable Renderable to replace the old renderable with
     */
    replaceRenderable(oldRenderable, newRenderable) {
        let oldRenderableID = Utils.getRenderableID(oldRenderable),
            newRenderableID = Utils.getRenderableID(newRenderable);
        this._renderableHelper.replaceRenderable(oldRenderableID, newRenderable, Utils.getRenderableID(newRenderable));
        let localRenderableName = this._IDtoLocalRenderableName[newRenderableID] = this._IDtoLocalRenderableName[oldRenderableID];
        this.reflowRecursively();
        this[localRenderableName] = newRenderable;
        delete this._IDtoLocalRenderableName[oldRenderableID];
    }

    /**
     * Gets the scroll view that was set if @layout.scrollable was used on the view
     * @returns {ReflowingScrollView}
     */
    getScrollView() {
        return this._scrollView;
    }

    /**
     * Binds the options passed to the specific view class
     * @param options
     * @returns {RenderablePrototype}
     */
    static with(options, children) {
        return new RenderablePrototype(this, options, children);
    }

    /**
     * getSize() is called by this view and by layoutControllers. For lazy people that don't want to specifiy their own getSize() function,
     * we provide a fallback. This function can be performance expensive when using non-docked renderables, but for docked renderables it
     * is efficient and convenient]
     * @returns {*[]}
     */
    getSize() {
        return this._getLayoutSize()
    }

    /**
     * Hides a renderable that has been declared with @layout.animate
     * @returns {Promise} when the renderable has finished its animation
     * @param renderable
     * @param [options]
     */
    hideRenderable(renderable, options = {}) {
        return this.toggleRenderable(renderable, false, options)
    }

    /**
     * Gets the "actual" renderable as being outputted, based on the renderable passed. This can be
     * same as the assigned renderable in many cases, but different in some cases, such as with the
     * animation controller or draggable
     *
     * @param renderable
     * @returns {*}
     */
    getActualRenderable(renderable) {
        return this.renderables[Utils.getRenderableID(renderable)]
    }


    /**
     * Returns true if size is fully settled
     * @returns {boolean}
     */
    isSizeSettled() {
        if (this._sizeResolver.containsUncalculatedSurfaces()) {
            return false
        }
        for (let renderableName in this.renderables) {
            let renderable = this.renderables[renderableName];
            if (!this._sizeResolver.isSizeFinal(renderable)) {
                return false
            }
        }
        return true
    }

    /**
     * Repeat a certain flowState indefinitely
     * @param renderable
     * @param stateName
     * @param {Boolean} persistent. If true, then it will keep on repeating until explicitly cancelled by cancelRepeatFlowState.
     * If false, it will be interrupted automatically by any interrput to another state. Defaults to true
     * @returns {Promise} resolves to false if the flow state can't be repeated due to an existing running repeat
     */
    async repeatFlowState(renderable, stateName = '', persistent = true) {
        let renderableID = Utils.getRenderableID(renderable);
        if (!this._runningRepeatingFlowStates[renderableID]) {
            this._runningRepeatingFlowStates[renderableID] = {persistent};
            while (this._runningRepeatingFlowStates[renderableID] && (await this.setRenderableFlowState(renderable, stateName) || persistent)) {
            }
            delete this._runningRepeatingFlowStates[renderableID];
            return true
        } else {
            return false
        }
    }

    /**
     * Cancel a repeating renderable. This will cancel the animation for next flow-cycle, it won't interject the current animation cycle.
     * @param renderable
     */
    cancelRepeatFlowState(renderable) {
        if (this._runningRepeatingFlowStates) {
            delete this._runningRepeatingFlowStates[Utils.getRenderableID(renderable)];
        }
    }

    /**
     * Initiate a renderable to a default flow state.
     * @param renderable
     * @param stateName
     */
    setDefaultState(renderable, stateName) {
        for (let step of this[this._getRenderableName(renderable)].decorations.flow.states[stateName].steps) {
            this.decorateRenderable(renderable, ...step.transformations);
        }
    }

    /**
     * Returns true if the view is currently displaying
     * @returns {boolean}
     */
    isDisplaying() {
        return this.layout.isDisplaying();
    }

    /**
     * Set a maximum width of the view
     * @param {Number} width
     */
    setMaxContentWidth(width) {
        if (this.decorations.dynamicDockPadding) {
            this.onNewSize((size) => {
                this.decorations.viewMargins = this.decorations.dynamicDockPadding(size, width);
                this.reflowRecursively();
            });
            const sizeCache = this.layout._contextSizeCache;
            const alteredSizeCache = [
                sizeCache[0] + 1,
                sizeCache[1] + 1
            ];
            this.layout._eventOutput.emit('sizeChanged', {
                oldSize: sizeCache,
                size: alteredSizeCache
            });
        } else {
            let defaultPadding = [0, 16, 0, 16];
            let normalisedPadding = LayoutUtility.normalizeMargins(defaultPadding);
            this.decorations.dynamicDockPadding = function (size, newWidth = width) {
                let sideWidth = size[0] > newWidth + 32 ? (size[0] - newWidth) / 2 : normalisedPadding[1];
                return [normalisedPadding[0], sideWidth, normalisedPadding[2], sideWidth];
            };

            this.setMaxContentWidth(width);
        }
    }

    /**
     * Inits the utils that are used as helper classes for the view
     * @private
     */
    _initUtils() {
        this._sizeResolver = new SizeResolver();
        this._sizeResolver.on('layoutControllerReflow', this._requestLayoutControllerReflow.bind(this));
        this._sizeResolver.on('reflow', () => this.layout.reflowLayout());
        this._sizeResolver.on('reflowRecursively', this.reflowRecursively.bind(this));
        this._dockedRenderablesHelper = new DockedLayoutHelper(this._sizeResolver);
        this._fullSizeLayoutHelper = new FullSizeLayoutHelper(this._sizeResolver);
        this._traditionalLayoutHelper = new TraditionalLayoutHelper(this._sizeResolver);
        this._renderableHelper = new RenderableHelper(
            this._bindToSelf.bind(this),
            this._setPipeToSelf.bind(this),
            this._getIDFromLocalName.bind(this),
            this.renderables,
            this._sizeResolver);
    }


    /** Requests for a parent LayoutController trying to resolve the size of this view
     * @private
     */
    _requestLayoutControllerReflow() {
        this._nodes = {_trueSizeRequested: true};
        //TODO: Do we really need to emit this?
        this._eventOutput.emit('layoutControllerReflow')
    }

    /**
     * Construct all the renderables that have been decorated in the class.
     * @private
     */
    _constructDecoratedRenderables() {

        let classConstructorList = [];

        /* Reverse the class list because it makes more sense to make the renderables of the parent before the renderables
         * of this view
         */
        for (let currentClass = this; currentClass.__proto__.constructor !== View; currentClass = Object.getPrototypeOf(currentClass)) {
            classConstructorList.push(currentClass.__proto__.constructor)
        }
        classConstructorList.reverse();

        /*
         * Loop through the constructors to do the initial setup of the renderables
         */
        for (let currentClassConstructor of classConstructorList) {
            let renderableConstructors = this.renderableConstructors.get(currentClassConstructor);
            for (let localRenderableName in renderableConstructors) {
                let renderableConstructor = renderableConstructors[localRenderableName];

                /* Assign to the 'flat' structure renderableConstructors */
                this._renderableConstructors[localRenderableName] = renderableConstructor;
                let {decorations} = renderableConstructor;
                renderableConstructor.localName = localRenderableName;
                this._setupRenderable(renderableConstructor, decorations);
            }
        }
    }

    /**
     * Assigns a renderable to this view, without setting this[renderableName]
     * @param {Surface|FamousView|View} renderable the renderable that is going to be added
     * @private
     */
    _assignRenderable(renderable) {
        this._renderableHelper.assignRenderable(renderable, Utils.getRenderableID(renderable));
        if (Utils.renderableIsSurface(renderable)) {
            let sizeSpecification =
                (renderable.decorations.dock && renderable.decorations.dock.size) ||
                renderable.decorations.size;
            if (sizeSpecification && (sizeSpecification[0] === true || sizeSpecification[1] === true)) {
                this._sizeResolver.configureTrueSizedSurface(
                    renderable,
                    sizeSpecification
                )
            }
        }
    }

    /**
     *
     * @param context
     * @private
     */
    _layoutDecoratedRenderables(context) {
        let groupedRenderables = this._renderableHelper;
        let nativeScrollableOptions = this.decorations.nativeScrollable;
        if (nativeScrollableOptions) {
            let thisSize = this.getSize();
            context.size = context.size.map((size, index) =>
                (nativeScrollableOptions[`scroll${index === 0 ? 'X' : 'Y'}`] && Math.max(thisSize[index], size)) || size)
        }
        this._renderableHelper.flushTransitions(context);
        this._dockedRenderablesHelper.layout(groupedRenderables.getRenderableGroup('docked'), groupedRenderables.getRenderableGroup('filled'), context, this.decorations);
        this._fullSizeLayoutHelper.layout(groupedRenderables.getRenderableGroup('fullSize'), context, this.decorations);
        this._traditionalLayoutHelper.layout(groupedRenderables.getRenderableGroup('traditional'), context, this.decorations)
    }

    /**
     * Combines all layouts defined in subclasses of the View into a single layout for the LayoutController.
     * @returns {void}
     * @private
     */
    _createLayoutController() {
        let hasFlowyRenderables = this._renderableHelper.hasFlowyRenderables();
        this.layout = new LayoutController({
            flow: !!this.decorations.useFlow || hasFlowyRenderables,
            partialFlow: true,
            nativeScroll: !!this.decorations.nativeScrollable,
            perspective: !!this.decorations.perspective,
            flowOptions: this.decorations.flowOptions || {spring: {period: 200}},
            layout: function (context, options) {

                /* Because views that extend this View class first call super() and then define their renderables,
                 * we wait until the first engine render tick to add our renderables to the layout, when the view will have declared them all.
                 * layout.setDataSource() will automatically pipe events from the renderables to this View. */
                if (!this._initialised) {
                    this.layout.setDataSource(this.renderables);
                    this._renderableHelper.pipeAllRenderables();
                    this._renderableHelper.initializeAnimations();
                    this._initialised = true;
                    this.layout.reflowLayout();

                    /*
                     * When the data source is set, it will not be reflected in the context yet because the layout is already
                     * prepared for the previous (empty) renderable data source. Therefore, it's a waste of resources
                     * and mysterious bugs to continue. We will wait for the next rendering cycle. However, if views
                     * are only having decorated renderables, then we don't have to do this whatsoever
                     */
                    return
                }

                /* Layout all renderables that have decorators (e.g. @someDecorator) */
                this._layoutDecoratedRenderables(context, options);
                if (this.decorations.customLayoutFunction) {
                    this.decorations.customLayoutFunction(context)
                }

                this._doTrueSizedSurfacesBookkeeping();

                /* Legacy context.set() based layout functions */
                if (this.layouts.length) {
                    this._callLegacyLayoutFunctions(context, options)
                }
            }.bind(this)
        });

        this.layout.__hiddenViewName__ = this._name();

        this._eventInput.on('recursiveReflow', (reflowData) => {
            /* Modify the reflow data so that it's clear what things have been reflown */
            reflowData[this.getID()] = true;
            this._doReflow();
        });

        /* Add the layoutController to this View's rendering context. */
        this._prepareLayoutController();

        if ((this.decorations.scrollableOptions || this.decorations.nativeScrollable) && !this._renderableHelper.getRenderableGroup('fullSize')) {
            this.addRenderable(new Surface(), layout.fullSize().translate(0, 0, -10))
        }
    }

    getID() {
        return this.layout.id
    }

    /**
     * Layout all renderables that have explicit context.set() calls in this View's legacy layout array.
     * @returns {void}
     * @private
     */
    _callLegacyLayoutFunctions(context, options) {
        for (let layout of this.layouts) {
            try {
                switch (typeof layout) {
                    case 'function':
                        layout.call(this, context, options);
                        break;
                    default:
                        Utils.warn(`Unrecognized layout specification in view '${this._name()}'.`);
                        break
                }
            } catch (error) {
                Utils.warn(`Exception thrown in ${this._name()}:`);
                console.log(error)
            }
        }
    }

    /**
     * Either adds this.layout (a LayoutController) to the current View, or a FlexScrollView containing this.layout if this view
     * has been decorated with a @scrollable.
     * @returns {void}
     * @private
     */
    _prepareLayoutController() {
        let {scrollableOptions} = this.decorations;
        if (scrollableOptions) {
            this._scrollView = new ReflowingScrollView(scrollableOptions);
            this.layout.getSize = this.getSize.bind(this);
            this._scrollView.push(this.layout);
            this.pipe(this._scrollView);
            this.add(this._scrollView);
        }
        else {
            this.add(this.layout)
        }
    }

    /**
     * Calculates the total height of the View's layout when it's embedded inside a FlexScrollView (i.e. @scrollable is set on the View),
     * by iterating over each renderable inside the View, and finding the minimum and maximum y values at which they are drawn.
     *
     *
     * @returns {*[]}
     * @private
     */
    _getLayoutSize() {
        let dockedRenderables = this._renderableHelper.getRenderableGroup('docked');
        let traditionalRenderables = this._renderableHelper.getRenderableGroup('traditional');
        let filledRenderables = this._renderableHelper.getRenderableGroup('filled');
        if (!traditionalRenderables && !dockedRenderables) {
            return [undefined, undefined]
        }
        let totalSize = [undefined, undefined];
        if (dockedRenderables || filledRenderables) {
            totalSize = this._dockedRenderablesHelper.boundingBoxSize(dockedRenderables, filledRenderables, this.decorations)
        }

        if (traditionalRenderables) {
            let traditionalRenderablesBoundingBox = this._traditionalLayoutHelper.boundingBoxSize(traditionalRenderables);
            for (let [dimension, singleSize] of totalSize.entries()) {
                let traditionalSingleSize = traditionalRenderablesBoundingBox[dimension];
                if (traditionalSingleSize !== undefined && (singleSize === undefined || singleSize < traditionalSingleSize)) {
                    totalSize[dimension] = traditionalSingleSize
                }
            }
        }
        return totalSize

    }

    /**
     * Retrieves the class name of the subclass View instance.
     * @returns {string}
     * @private
     */
    _name() {
        return Object.getPrototypeOf(this).constructor.name
    }

    /**
     * Copies prototype properties set by decorators to this
     * @private
     */
    _copyPrototypeProperties() {
        let prototype = Object.getPrototypeOf(this);

        /* Move over all renderable- and decoration information that decorators.js set to the View prototype */
        for (let name of ['decorationsMap', 'renderableConstructors']) {
            this[name] = cloneDeep(prototype[name]) || new Map()
        }
    }

    /**
     * Inits the decorations that is set on a class level
     * @private
     */
    _initOwnDecorations() {

        for (let currentClass = this; currentClass.__proto__.constructor !== View; currentClass = Object.getPrototypeOf(currentClass)) {
            /* The close the decoration is to this constructor in the prototype chain, the higher the priority */
            let decorations = this.decorationsMap.get(currentClass.__proto__.constructor);
            this._extendFromDynamicFunctions(decorations);
            for (let property in decorations) {
                let decoration = decorations[property];
                if (!(property in this.decorations)) {
                    this.decorations[property] = decoration;
                } else if (property === 'defaultOptions' && this.decorations.defaultOptions) {
                    this.decorations.defaultOptions = combineOptions(decoration, this.decorations.defaultOptions);
                } else if (property === 'bindingTriggers') {
                    this.decorations.bindingTriggers.push(...decoration);
                }
            }
        }

        if (this.decorations.dynamicDockPadding) {
            this.onNewSize((size) => this.decorations.viewMargins = this.decorations.dynamicDockPadding(size))
        }

        if (!this.decorations.extraTranslate) {
            this.decorations.extraTranslate = [0, 0, 10]
        }

        this._initBindingsTriggers();
    }

    onNewSize(callback) {
        this.on('newSize', callback, {propagate: false});
    }

    onceNewSize(callback) {
        this.once('newSize', callback);
    }

    setNewOptions(options) {
        this._optionObserver.recombineOptions(options);
        this._setupExtraRenderables();
    }

    setNewChildren(children) {
        this._setupExtraRenderables(children);
    }

    _doTrueSizedSurfacesBookkeeping() {
        this._nodes._trueSizeRequested = false
    }

    _initTrueSizedBookkeeping() {
        this.layout.on('sizeChanged', ({oldSize, size}) => {
            if (size[0] !== oldSize[0] ||
                size[1] !== oldSize[1]) {
                this._sizeResolver.doTrueSizedBookkeeping();
                this._eventOutput.emit('newSize', size);
            }
        });
        /* Hack to make the layoutcontroller reevaluate sizes on resize of the parent */
        this._nodes = {_trueSizedRequested: false}
        /* This needs to be set in order for the LayoutNodeManager to be happy */
    }

    _initOptions(options) {
        if (!Utils.isPlainObject(options)) {
            Utils.warn(`View ${this._name()} initialized with invalid non-object arguments`)
        }
        let {defaultOptions = {}} = this.decorations;

        /**
         * A copy of the options that were passed in the constructor
         *
         * @type {Object}
         */
        this._optionObserver = new OptionObserver(defaultOptions, options, this._bindingTriggers, this._name());
        /* Call setup function after initialize to prevent problems when this._optionObserver is undefined inside setup */
        this._optionObserver.setup();
        this._optionObserver.on('needUpdate', (renderableName) =>
            this._setupRenderable(this._renderableConstructors[renderableName], this._renderableConstructors[renderableName].decorations)
        );
        this.options = this._optionObserver.getOptions()
    }

    _initDataStructures() {
        /**
         * The renderables "outputted" by the view that are passed to the underlying famous-flex layer
         *
         * @type {Object}
         */
        this.renderables = {};
        this._IDtoLocalRenderableName = {};
        if (!this.layouts) {
            /**
             * @deprecated
             *`
             * The old way of setting the spec of the renderables created by adding renderables through
             * `this.renderables.myRenderable = ....
             *
             * @type {Array|Function}
             */
            this.layouts = []
        }

        if (!this.decorations) {
            this.decorations = {}
        }

        this._runningRepeatingFlowStates = {};
        this._renderableConstructors = {};

        this._bindingTriggers = [];

    }

    /**
     * Binds the method to this view. Used by the util DecoratedRenderables
     * @param {Function} method The method that is about to be bound
     * @returns {*}
     * @private
     */
    _bindToSelf(method) {
        return method.bind(this)
    }

    /**
     * Pipes a renderable to this view. Used by the util DecoratedRenderables
     * @param {View|Surface} renderable
     * @param {Boolean} enable set to false to unpipe
     * @returns {Boolean} true if piping was successful, otherwise false
     * @private
     */
    _setPipeToSelf(renderable, enable = true) {
        let methodName = enable ? 'pipe' : 'unpipe';
        /* Auto pipe events from the renderable to the view */
        if (renderable && renderable[methodName]) {
            /*
             * We see it as a bit of a mystery why the piping needs to be done both to this and this._eventOutput,
             * but they both seem to be necessary so I'm gonna leave it for now.
             */
            renderable[methodName](this);
            renderable[methodName](this._eventOutput);
            return true
        }
        return false
    }

    /**
     * Sets up a renderable when it is invalidated to be re-rendered (happens on creation too)
     * @param {Function} renderableInitializer
     * @param decorations
     * @returns {*}
     * @private
     */
    _setupRenderable(renderableInitializer, decorations) {
        /* Re-assign the options to make sure they're up to date */
        this.options = this._optionObserver.options;
        //todo clean up this function, it's too long!!
        if (!decorations) {
            decorations = currentRenderable && currentRenderable.decorations
        }

        let decoratorFunctions = decorations &&
            decorations.dynamicFunctions
            || [];

        let localRenderableName = renderableInitializer.localName;
        let currentRenderable = this[localRenderableName];
        let renderable;
        let dynamicDecorations = [];
        let renderableIsArray = false;
        this._optionObserver.recordForRenderable(localRenderableName, () => {
            /* Make sure we have proper this scoping inside the initializer */
            renderable = renderableInitializer.call(this, this.options);

            /* Call the dynamic decorations, while we're recording */
            dynamicDecorations = decoratorFunctions.map((dynamicDecorator) => dynamicDecorator(this.options));

            /* Allow class property to be a function that returns a renderable */
            if (typeof renderable === 'function') {
                let factoryFunction = renderable;
                renderable = factoryFunction(this.options);
            }

            if (Array.isArray(renderable)) {
                renderableIsArray = true;
                let renderables = renderable instanceof MappedArray ? renderable.getArray() : renderable;
                if (currentRenderable && !Array.isArray(currentRenderable)) {
                    throw new Error('Cannot dynamically reassign renderable to array')
                }
                let currentRenderables = currentRenderable || [];

                let index, totalLength = renderables.length;

                if (!renderables.length) {
                    /* Insert an empty surface in order to preserver order of the sequence of (docked) renderables
                     * TODO: This is dirty but seemingly inevitable, think of other solutions */
                    let placeholderRenderable = Surface.with();
                    renderables = [placeholderRenderable];
                    dynamicDecorations = () =>
                        layout.dock.left(0).size(0)

                }

                let actualRenderables = new Array(totalLength);
                let dockedRenderables = this._renderableHelper.getRenderableGroup('docked');
                for (index = 0; index < renderables.length; index++) {
                    actualRenderables[index] = this._arrangeRenderableAssignment(currentRenderables[index],
                        renderables[index],
                        dynamicDecorations,
                        localRenderableName,
                        decorations,
                        true);
                    if (index) {
                        if (dockedRenderables && dockedRenderables.has(Utils.getRenderableID(actualRenderables[index]))) {
                            /* Make sure that the order is correct */
                            this.prioritiseDockAfter(actualRenderables[index], actualRenderables[index - 1])
                        }
                    }
                }


                for (; index < currentRenderables.length; index++) {
                    this.removeRenderable(currentRenderables[index])
                }

                this._readjustRenderableInitializer(localRenderableName);
                this[localRenderableName] = actualRenderables
            }

            if (!renderableIsArray) {
                this._arrangeRenderableAssignment(currentRenderable, renderable, dynamicDecorations, localRenderableName, decorations)
            }

            return renderable;
        });
        if (dynamicDecorations.length) {
            this._doReflow();
        }


        return renderable;
    }

    /**
     *
     * @param renderable
     * @param {String} [localRenderableName]
     * @param decorations
     * @param {Boolean} isArray If set to true, renderable is array and actions will be taken accordingly
     * @private
     */
    _assignNewRenderable(renderable, localRenderableName, decorations, isArray) {

        let renderableID = Utils.getRenderableID(renderable);

        if (localRenderableName) {
            this._IDtoLocalRenderableName[renderableID] = localRenderableName
        }

        /* Allow decorated class properties to be set to false, null, or undefined, in order to skip rendering */
        if (!renderable) {
            return
        }

        renderable.decorations = decorations;

        if (!isArray) {
            this._readjustRenderableInitializer(localRenderableName);
            this[localRenderableName] = renderable
        }
        this._assignRenderable(renderable)
    }

    _getIDFromLocalName(localName) {
        return Utils.getRenderableID(this[localName])
    }

    /**
     *
     * @param oldRenderable
     * @param newRenderable
     * @param dynamicDecorations
     * @param {String} [localRenderableName]
     * @param {Object} decorations
     * @param {Boolean} isArray
     * @returns {View|Surface}
     * @private
     */
    _arrangeRenderableAssignment(oldRenderable, newRenderable, dynamicDecorations, localRenderableName, decorations, isArray = false) {
        if (!newRenderable) {
            if (oldRenderable) {
                this.removeRenderable(oldRenderable);
                /* Removing a renderable is likely to cause a size change, so emit to notify parents */
                this.reflowRecursively()
            }
            return newRenderable
        }
        let renderablePrototype = newRenderable instanceof RenderablePrototype && newRenderable;
        if (renderablePrototype) {
            let {options, type, children} = renderablePrototype;
            if (oldRenderable && oldRenderable.constructor === type && oldRenderable.setNewOptions) {
                oldRenderable.setNewOptions(options);
                if (children) {
                    oldRenderable.setNewChildren(children);
                }
                newRenderable = oldRenderable;
                this._renderableHelper.decorateRenderable(
                    Utils.getRenderableID(newRenderable),
                    ...dynamicDecorations,
                    ...renderablePrototype.getDirectlyAppliedDecoratorFunctions()
                );
                return newRenderable
            }
            /* If there wasn't any function to adjust the options, we have to start over from scratch! */
            newRenderable = new type(options, children);
        }

        decorations = this._cloneDecorationsForRenderable(decorations, newRenderable);

        if (renderablePrototype) {
            this._renderableHelper.applyDirectDecoratorsFromRenderablePrototype(decorations, renderablePrototype);
        }


        this._renderableHelper.applyDecoratorFunctionsToRenderable({decorations}, dynamicDecorations);
        if (oldRenderable) {
            this.replaceRenderable(oldRenderable, newRenderable);
            if (!this._initialised) {
                /* Edge case: If we are replacing a renderable when constructing, that means that a property with the same
                 * name has been redefined for the child class that had a parent class (they both defined a renderable with the same name).
                 * If this happens, we need to call the function for readjustment, in order not to construct the renderable a third
                 * time. TODO: Consider not supporting this and throw an error instead
                 */
                this._readjustRenderableInitializer(localRenderableName);
            }
            /* This is a very inefficient of keeping the current decorators. That's why .with should be used at all times possible */
            this._renderableHelper.applyDecoratorObjectToRenderable(Utils.getRenderableID(newRenderable), decorations);
        } else {
            this._assignNewRenderable(newRenderable, localRenderableName, decorations, isArray)
        }
        return newRenderable
    }

    /**
     * Resets the initializer for a class property
     * @param {String} localRenderableName
     * @private
     */
    _readjustRenderableInitializer(localRenderableName) {
        /* If there is no initializer declared for the renderable, that could mean that the renderable has been
         * passed "from above" through the children argument. No action needed */
        if (!this._renderableConstructors[localRenderableName]) {
            return
        }
        /* Since after constructor() of this View class is called, all decorated renderables will
         * be attempted to be initialized by Babel / the ES7 class properties spec, we'll need to
         * override the descriptor get/initializer to return this specific instance once.
         *
         * If we don't do this, the View will have its renderables overwritten by new renderable instances
         * that don't have constructor.options applied to them correctly. If we always return this specific instance
         * instead of only just once, any instantiation of the same View class somewhere else in the code will refer
         * to the renderables of this instance, which is unwanted.
         */
        let {descriptor} = this._renderableConstructors[localRenderableName].decorations;
        if (descriptor) {
            if (descriptor.initializer) {
                descriptor.initializer = function () {
                    return this[localRenderableName]
                }.bind(this)
            }
        }
    }

    _setupExtraRenderables(extraLayout = {}) {
        if (!extraLayout.renderableConstructors) {
            return;
        }
        let {value: [, extraRenderableInitializers]} = extraLayout.renderableConstructors.entries().next();
        for (let localRenderableName in extraRenderableInitializers) {
            let renderableInitializer = extraRenderableInitializers[localRenderableName];
            this._arrangeRenderableAssignment(this[localRenderableName], renderableInitializer(),
                renderableInitializer.decorations && renderableInitializer.decorations.dynamicFunctions || [],
                localRenderableName, renderableInitializer.decorations)
        }
    }

    /**
     * Clones decorations for renderable, to make sure that shared decorations structures don't affect each other
     *
     * @param decorations
     * @param renderable
     * @returns {*}
     * @private
     */
    _cloneDecorationsForRenderable(decorations, renderable) {
        /* Clone the decorator properties, because otherwise every view of the same type willl share them between
         * the same corresponding renderable. TODO: profiling reveals that cloneDeep affects performance
         */
        return cloneDeep(extend({}, decorations, renderable.decorations || {}));
    }

    /**
     * Initializes the part of the decorations object that contains the binding trigger functions
     * @private
     */
    _initBindingsTriggers() {
        let {bindingTriggers = []} = this.decorations;

        for (let [index, {triggerMethod, name}] of bindingTriggers.entries()) {
            this[name] = () => {
                return this._optionObserver.triggerMethodForIndex(this.options, index);
            };

            /* TODO Think of a more clever solution than receiving the optionObserver as an argument */
            this._bindingTriggers.push((optionObserver) => {
                this.options = optionObserver.getOptions();
                /* TODO: Change this to a getter function or at least figure out a plan how to handle default options */
                triggerMethod.call(this, this.options, optionObserver.defaultOptions);
            });
        }

    }

    /**
     *
     * @param decorations
     * @private
     */
    _extendFromDynamicFunctions(decorations = {}) {
        let {dynamicFunctions} = decorations;
        for (let dynamicFunction of dynamicFunctions || []) {
            dynamicFunction(this.options)({prototype: {decorationsMap: {get: () => decorations}}});
        }
    }

    async whenFlowFinished(renderable) {
        await this._optionObserver.whenSettled();
        /* If the renderable doesn't exist (yet), this means that we shouldn't continue */
        if (!renderable) {
            return;
        }
        await this._renderableHelper.waitForRenderableTransition(Utils.getRenderableID(renderable));
        await this._optionObserver.whenSettled();
    }

    static empty() {
        //TODO Think of a more performant solution
        return Surface.with();
    }

    get inputOptions() {
        return this._optionObserver.getInputOptions();
    }
}