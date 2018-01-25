/**
 * Created by lundfall on 23/02/2017.
 */
import EventEmitter from 'eventemitter3';

import cloneDeepWith from 'lodash/cloneDeepWith';
import difference from 'lodash/difference';
import each from 'lodash/each';

import Timer from 'famous/utilities/Timer.js';
import {RenderablePrototype} from 'famous/utilities/RenderablePrototype.js';

import {Utils} from './Utils.js';
import {ArrayObserver} from './ArrayObserver.js';
import {
    InputOption, unwrapValue,
    changeValue, storedInputOption
} from './InputOption';
import {ObjectHelper} from '../ObjectHelper';
import {PrioritisedObject} from '../../data/PrioritisedObject';
import {Model} from '../../core/Model';
import {PrioritisedArray} from '../../data/PrioritisedArray';
import {LazyLoadedOptionClone} from './LazyLoadedOptionClone';


/* Symbols are used for many properties in order to allow any arbitrary names of options. The names are
 * repeated for the symbols and variable names in order to make debuggability easier */
let newChanges = Symbol('newChanges'),
    originalValue = Symbol('originalValue'),
    oldValue = Symbol('oldValue'),
    instanceIdentifier = Symbol('instanceIdentifier'),
    isArrayListener = Symbol('isArrayListener'),
    optionRecorder = Symbol('optionRecorder'),
    arrayRecorder = Symbol('arrayRecorder');

/* Some symbols are exported since they are used elsewhere. Note that the triggers symbol is defined directly on
*  the OptionObserver to make it easier to access from outside Arva (not just in internal classes) */
export let onOptionChange = Symbol('onOptionChange'),
    storedArrayObserver = Symbol('storedArrayObserver'),
    notFound = Symbol('notFound'),
    listeners = Symbol('listeners'),
    optionMetaData = Symbol('optionMetaData'),
    shadow = Symbol('shadow');

//TODO fix falsey value checks, should behave differently for undefined and false

//TODO Not sure if the (nested) array listener tree is setup with maximum efficiency. Furthermore, partial array updates isn't supported

//TODO Think how to solve the case when this.options is passed as a whole to a renderable, maybe there should be a way to state explicit dependence if needed. Maybe implementing a getter trigger of the option on the view can be a viable idea

//TODO Properly mark correct methods to be public/private

export class OptionObserver extends EventEmitter {
    /* The structure of what thing in the objects is mapped to the corresponding renderable update */
    _listenerTree = {};
    /* An array of nested objects representing a reverse lookup to the listener tree */
    _reverseListenerTree = {};
    _newReverseListenerTree = {};
    _listenerTreeMetaData = {};
    /* We have to keep track of the models, because they use their own getter/setter hooks and we can't use the builtin ones */
    _modelListeners = {};
    _activeRecordings = {};
    /* This contains the option difference to indicate a value change */
    _newOptionUpdates = {};
    _updatesForNextTick = {};
    _forbiddenUpdatesForNextTick = {};
    _listeningToSetters = true;
    _arrayObservers = [];

    /* The max supported depth in deep-checking iterations */
    static maxSupportedDepth = 10;
    /* Used for trigger function of options, which is a special type of update */
    static triggers = Symbol('triggers');

    /**
     *
     * @param defaultOptions
     * @param options
     * @param {Array<Function>} bindingsTriggerFunctions
     * @param debugName Used for displaying error messages and being able to trace them back more easily
     */
    constructor(defaultOptions, options, bindingsTriggerFunctions, debugName) {
        super();
        this._errorName = debugName;
        this._bindingsTriggerMethods = bindingsTriggerFunctions || [];
        OptionObserver._registerNewInstance(this);
        this.defaultOptions = defaultOptions;
        this.options = options;
        if (!window.optionObservers) {
            window.optionObservers = [];
        }
        window.optionObservers.push(this);
    }

    /**
     * Records the updates that happen in options and models (intended to be called before the construction of that renderable)
     * @param renderableName
     * @param callback
     */
    recordForRenderable(renderableName, callback) {
        this._recordForEntry([renderableName], false);
        callback();
        this._stopRecordingForEntry([renderableName], false);
    }

    /**
     * Returns the options that are being observed
     * @returns {*}
     */
    getOptions() {
        return this.options
    }

    /**
     * Should be called when the renderable isn't relevant anymore
     * @param {String} renderableName
     */
    deleteRecordingForRenderable(renderableName) {
        //todo implement this (is an efficient way)
    }

    getInputOptions() {
        if (this._inputOptions) {
            return this._inputOptions;
        }
        return this._inputOptions = LazyLoadedOptionClone.get(InputOption, this.options, this._listenerTree, [], this);
    }

    /**
     * Executes the trigger function. The trigger function is treated similarly to that of a renderable,
     * but it's identified with the symbol OptionObserver.triggers accompanied by an index, instead of a string
     *
     * Different examples of trigger situations:
     * Scenario 1: Construction
     * A. The trigger function is called
     * B. Getters are detected for the pre-process function
     * C. this.options isn't set, so nothing more happens
     *
     * TODO This description is outdated
     *
     * Scenario 2. Setter trigger of a trigger function
     * A. After flushing, it is concluded to belong to the trigger function (and other renderables)
     * B. The trigger function is triggered immediately and firstly when flushing change events
     * C. The trigger function re-executes the function and getters are triggered again
     * D. this.options is defined, and it setters will be notified.
     * E. An inner flush is forced within the flush, and it there might be new renderables needing update now
     * F. The flush completes and resets the _updatesForNextTick
     * G. The outer flush continues, and has nothing more to do
     * H. Since we made changes within a flush, the static OptionObserver loop _flushAllUpdates, will call the flush function once again, but doing nothing
     *
     * Scenario 3. Recombine options
     * A. After flushing, it is concluded that the option changes belong to one of the trigger functions (and other renderables)
     * B. Continues same as scenario 2.
     *
     * @private
     */
    triggerMethodForIndex(incomingOptions, index) {
        if (!this._bindingsTriggerMethods[index]) {
            return this._throwError(`Internal error in OptionObserver: trigger function with index ${index} doesn't exist`)
        }

        this._recordForTriggerMethod(() =>
            this._bindingsTriggerMethods[index](this), index);
    }

    preventEntryFromBeingUpdated(entryNames) {
        this._accommodateInsideObject(this._forbiddenUpdatesForNextTick, entryNames, true)
    }


    allowEntryToBeUpdated(entryNames) {
        this._deleteInNestedStructure(this._forbiddenUpdatesForNextTick, entryNames);
    }

    /**
     * @param inObject
     * @param nestedPropertyPath
     * @private
     */
    _deleteInNestedStructure(inObject, nestedPropertyPath) {
        for (let [index, entryName] of nestedPropertyPath.entries()) {
            let inObjectKeys = Object.keys(inObject);
            if (inObjectKeys.length === 1 || index === nestedPropertyPath.length - 1) {
                delete inObject[inObjectKeys[0]];
                break;
            }
            inObject = inObject[entryName];
            if (!inObject) {
                return;
            }
        }
    }



    setup() {
        this._createListenerTree();
        //todo this order changed, we used to do the option merging after trigger function. What is needed? Pass option to adjust behaviour?
        this._updatesForNextTick[OptionObserver.triggers] = new Array(this._bindingsTriggerMethods.length).fill(true);
        this._markAllOptionsAsUpdated();
    }

    /**
     * Used by InputOption to determine which recording is currently active
     * @returns {{}}
     */
    getActiveRecordings() {
        return this._activeRecordings;
    }

    getListenerTree() {
        return this._listenerTree;
    }

    /**
     * TODO Make private
     * Similar to _.get, except that it returns notFound (a symbol) when not found. It also supports tarversing listeners
     * @param object
     * @param path
     * @param traverseListeners
     * @returns {*}
     * @private
     */
    accessObjectPath(object, path, traverseListeners = false) {
        for (let pathString of path) {
            if (!object || !object.hasOwnProperty(pathString)) {
                if (traverseListeners) {
                    if (Array.isArray(object)) {
                        pathString = 0
                    }
                } else {
                    return notFound
                }
            }
            object = object[pathString];
            /* If it's a specially registered array listener, the property to read is called value and is being
             *  used on the listener tree */
            if (object && object[isArrayListener] && traverseListeners) {
                /* Return immediately, ignore remaining properties in path. TODO: Verify that this is what we want*/
                return object.value;
            }
        }
        return object
    }


    /**
     * Gets the entry names that are there for a certain listener tree
     * @param localListenerTree
     * @returns {Array.<*>}
     */
    _getUpdatesEntryNamesForLocalListenerTree(localListenerTree) {
        let forbiddenUpdatesForNextTick = this._forbiddenUpdatesForNextTick;
        let doubleNestedPaths = Object.keys(localListenerTree)
            .concat(localListenerTree[OptionObserver.triggers] ? OptionObserver.triggers : [])
            .map((key) => localListenerTree[key] === true ? [[key]] :
                this._getDeeplyNestedListenerPaths(localListenerTree[key]).map((path) => [key].concat(path)));

        /* Flatten double nested paths */
        let paths = [].concat(...doubleNestedPaths);
        /* Make sure that we are not updating something that is forbidden during this tick */
        let forbiddenUpdatePathsForNextTick = Object.keys(forbiddenUpdatesForNextTick).concat(
            forbiddenUpdatesForNextTick[OptionObserver.triggers] ? OptionObserver.triggers : []);
        if (forbiddenUpdatePathsForNextTick.length) {
            paths = paths.filter((path) => {
                return this.accessObjectPath(this._forbiddenUpdatesForNextTick, path) === notFound
            });
        }
        return paths;

    }

    _recordForTriggerMethod(callback, triggerIndex) {
        this._recordForEntry([OptionObserver.triggers, triggerIndex], true);
        callback();
        this._stopRecordingForEntry([OptionObserver.triggers, triggerIndex], true)
    }

    /**
     * Records for a specific entry
     * @param {Array} entryNames
     * @param {Boolean} allowSetters
     * @private
     */
    _recordForEntry(entryNames, allowSetters) {
        this._accommodateInsideObject(this._activeRecordings, entryNames, {});
        this._beginListenerTreeUpdates(entryNames);
        this._listenForModelUpdates(entryNames);
        if (allowSetters) {
            /* Be sure to avoid infinite loops if there are setters that trigger getters that are matched to this
            * recording */
            this.preventEntryFromBeingUpdated(entryNames);
        }
        let opOptionTrigger = this.accessObjectPath(this._activeRecordings, entryNames)[optionRecorder] = ({type, propertyName, nestedPropertyPath}) => {
            if (type === 'setter' && !allowSetters) {
                this._throwError('Setting an option during instanciation of renderable')
            } else if (type === 'getter') {
                let localListenerTree = this._accessListener(nestedPropertyPath.concat(propertyName));
                this._addToListenerTree(entryNames, localListenerTree)
            }
        };
        this.on('optionTrigger', opOptionTrigger)
    }

    /**
     * Accesses a listener in a certain path
     * @param nestedPropertyPath
     * @returns {*}
     * @private
     */
    _accessListener(nestedPropertyPath) {
        return this.accessObjectPath(this._listenerTree, nestedPropertyPath, true);
    }

    /**
     *
     * @param {Array} entryNames
     * @param {Object} localListenerTree
     * @private
     */
    _addToListenerTree(entryNames, localListenerTree) {

        let listenerStructure = localListenerTree[listeners];

        /* Renderable already added to listener tree, so no need to do that again */
        let {listenersCanChange, listenersChanged, matchingListenerIndex} = this.accessObjectPath(this._listenerTreeMetaData, entryNames);

        this.accessObjectPath(this._newReverseListenerTree, entryNames).push(listenerStructure);

        if (listenersCanChange && !listenersChanged) {
            /* We optimize the most common use case, which is that no listeners change.
             *  In that case, the order of listeners will be the same, otherwise we need to accommodate*/

            let reverseListenerTree = this.accessObjectPath(this._reverseListenerTree, entryNames);
            let listenerTreeMetaData = this.accessObjectPath(this._listenerTreeMetaData, entryNames);

            if (reverseListenerTree[matchingListenerIndex] !== listenerStructure) {
                listenerTreeMetaData.listenersChanged = true
            }

            listenerTreeMetaData.matchingListenerIndex++
        }

        this._accommodateInsideObject(listenerStructure, entryNames, true)

    }

    /**
     * Performs all available bindings triggering functions
     * @param incomingOptions
     * @private
     */
    _doAllTriggerMethods(incomingOptions) {
        for (let [index] of this._bindingsTriggerMethods.entries()) {
            this.triggerMethodForIndex(incomingOptions, index)
        }
    }

    /**
     *
     * @private
     * @param entryNames
     */
    _endListenerTreeUpdates(entryNames) {
        if (this.accessObjectPath(this._listenerTreeMetaData, entryNames).listenersChanged) {
            let oldListeners = this.accessObjectPath(this._reverseListenerTree, entryNames);
            /* Remove the old listeners and add the new ones again. In this way, we get O(n + m) complexity
             *  instead of O(m*n) */
            for (let listenerTree of oldListeners) {
                this._deleteInNestedStructure(listenerTree, entryNames);
            }
            let newListeners = this.accessObjectPath(this._newReverseListenerTree, entryNames);

            for (let listenerTree of newListeners) {
                this._accommodateInsideObject(listenerTree, entryNames, true);
            }

        }
        this._accommodateInsideObject(this._reverseListenerTree, entryNames, this._newReverseListenerTree);
        this._deleteInNestedStructure(this._newReverseListenerTree, entryNames);
    }

    _beginListenerTreeUpdates(entryNames) {
        /* The listener meta data sets a counter in order to match the new listeners in comparison to the old listeners*/
        let numberOfExistingListenerPaths = this.accessObjectPath(this._reverseListenerTree, entryNames.concat('length'));
        if (numberOfExistingListenerPaths === notFound) {
            numberOfExistingListenerPaths = 0
        }
        this._accommodateInsideObject(this._listenerTreeMetaData, entryNames, {
            matchingListenerIndex: 0,
            listenersCanChange: !!numberOfExistingListenerPaths,
            listenersChanged: false
        });
        this._accommodateInsideObject(this._newReverseListenerTree, entryNames, [])

    }

    /**
     * Called when a renderable shouldn't be recorded anymore
     * @param entryNames
     * @param {Boolean} didAllowSetters
     */
    _stopRecordingForEntry(entryNames, didAllowSetters = false) {
        this._endListenerTreeUpdates(entryNames);
        if (didAllowSetters) {
            this.allowEntryToBeUpdated(entryNames);
        }
        PrioritisedObject.removePropertyGetterSpy();
        this.removeListener('optionTrigger', this.accessObjectPath(this._activeRecordings, entryNames.concat(optionRecorder)));
        // Todo when we start listening for mapcalled, use this code (if that is what we'll do)
        //this.removeListener('mapCalled', this._activeRecordings[entryName][arrayRecorder]);
        this._deleteInNestedStructure(this._activeRecordings, entryNames);
    }

    /**
     * Updates the options from an external reason
     * @param newOptions
     */
    recombineOptions(newOptions = {}) {
        let newOptionsAreAlsoOptions = !!newOptions[optionMetaData];
        if (newOptionsAreAlsoOptions) {
            if (newOptions === this.options) {
                return
            }
            this.options = newOptions;
            this._markAllOptionsAsUpdated();
            return
        }
        this._deepTraverse(this.options, (nestedPropertyPath, optionObject, existingOptionValue, key, [newOptionObject, defaultOption]) => {
            let newOptionValue = newOptionObject[key];
            if (newOptionValue === undefined && optionObject[key] !== null) {     //todo confirm whether this check is appropriate (I don't think it is)
                let defaultOptionValue = defaultOption[key];
                if (defaultOptionValue !== newOptionValue && (defaultOptionValue !== existingOptionValue &&
                        /* If new value is undefined, and the previous one was already the default, then don't update (will go false)*/
                        !Utils.isPlainObject(existingOptionValue) && existingOptionValue[optionMetaData] && existingOptionValue[optionMetaData].isDefault)
                ) {
                    this._markPropertyAsUpdated(nestedPropertyPath, key, newOptionObject[key], existingOptionValue)
                }
                /* Cancel traversion in this direction */
                return true
            } else if (!(newOptionValue && Utils.isPlainObject(newOptionValue)) && existingOptionValue !== newOptionValue) {
                /* Triggers the appriopriate events */
                this._markPropertyAsUpdated(nestedPropertyPath, key, newOptionObject[key], existingOptionValue)
            }
        }, [newOptions, this.defaultOptions]);

        /* Flush the updates in order to trigger the updates immediately */
        this.flushUpdates()
    }


    _markAllOptionsAsUpdated() {
        let rootProperties = Object.keys(this.defaultOptions);
        this._updateOptionsStructure(rootProperties, this.options, [], rootProperties.map((rootProperty) => undefined));
        this.flushUpdates()
    }

    _setupOptionLink(object, key, newValue, nestedPropertyPath, listenerTree) {

        if (this._isMyOption(newValue)) {
            /* Shallow clone at this level, which will become a deep clone when we're finished traversing */
            newValue = this._shallowCloneOption(newValue)
        }

        /* Only add the getter/setter hook if there isn't one yet */
        this._addGetterSetterHook(object, key, newValue, nestedPropertyPath, listenerTree);
        //TODO there might be more optimal ways of doing this, the option will be marked 4-5 times on setup
        this._markAsOption(object);
        this._markAsOption(newValue);
        return newValue
    }

    _isMyOption(value) {
        return Utils.isPlainObject(value) && value[optionMetaData] && value[optionMetaData].owners.includes(this)
    }

    _shallowCloneOption(optionToShallowClone) {
        if (!Utils.isPlainObject(optionToShallowClone)) {
            return optionToShallowClone
        }
        let result = {};
        Object.defineProperties(result, Object.getOwnPropertyDescriptors(optionToShallowClone));
        return result
    }

    /**
     * Adds a getter/setter hook to a certain object for a key with a value, where object[key]===value.
     * @param object
     * @param key
     * @param value
     * @param {Array} nestedPropertyPath
     * @param {Object} listenerTree
     * @private
     */
    _addGetterSetterHook(object, key, value, nestedPropertyPath, listenerTree) {
        ObjectHelper.addGetSetPropertyWithShadow(object, key, value, true, true,
            (info) =>
                this._onEventTriggered({
                    ...info,
                    type: 'setter',
                    parentObject: object,
                    nestedPropertyPath,
                    listenerTree
                })
            , (info) =>
                this._onEventTriggered({
                    ...info,
                    type: 'getter',
                    parentObject: object,
                    nestedPropertyPath,
                    listenerTree
                }), false, shadow)
    }

    /**
     * Called when a model is changed
     * @param model
     * @param {Array} changedProperties
     * @param {String} modelKeyInParent The key of the parent object
     * @param {Array} nestedPropertyPath
     * @private
     */
    _onModelChanged(model, changedProperties, modelKeyInParent, nestedPropertyPath) {
        let nestedPropretyPathToModel = nestedPropertyPath.concat(modelKeyInParent);
        /* We need to check for undefined options here, since we can catch unreferenced properties, which we should ignore */
        //TODO Optimize so that the listener doesn't have to be accessed twice when the check doesn't go through
        let localListenerTree = this._accessListener(nestedPropretyPathToModel);
        if (!localListenerTree) {
            return;
        }
        changedProperties = changedProperties.filter((changedProperty) => localListenerTree[changedProperty]);
        if (!changedProperties.length) {
            return;
        }
        this._updateOptionsStructure(changedProperties, model, nestedPropretyPathToModel);
    }

    /**
     * Happens when an event is triggered (getter/setter)
     * @param {Object} info ({ nestedPropertyPath, propertyName, parentObject })
     * @private
     */
    _onEventTriggered(info) {
        if (this._ignoreListeners) {
            return;
        }
        this.emit('optionTrigger', info);

        if (info.type === 'setter' && this._listeningToSetters) {
            /* In order to avoid accidentally triggering getters when reading and manipulating data, set boolean flag */
            this._ignoreListeners = true;
            let {nestedPropertyPath, propertyName, parentObject, oldValue, newValue} = info;
            /* If reassignment to exactly the same thing, then don't do any update */
            if (oldValue !== newValue) {
                this._updateOptionsStructure([propertyName], parentObject, nestedPropertyPath, [oldValue]);
            }
            this._ignoreListeners = false;
        } else if (info.type === 'getter' && info.listenerTree[storedInputOption]) {
            for (let inputOption of info.listenerTree[storedInputOption]) {
                inputOption.updateValueIfNecessary();
            }
        }
    }

    /**
     * Deep updates the options based on parameter
     * @param changedProperties
     * @param parentObject
     * @param nestedPropertyPath
     * @param oldValues
     * @private
     */
    _updateOptionsStructure(changedProperties, parentObject, nestedPropertyPath, oldValues = []) {
        for (let [index, property] of changedProperties.entries()) {
            this._markPropertyAsUpdated(nestedPropertyPath, property, parentObject[property], oldValues[index])
        }
    }

    flushUpdates() {
        this._flushArrayObserverChanges();
        /* Do a traverse only for the leafs of the new updates, to avoid doing extra work */
        this._deepTraverseWithShallowArrays(this._newOptionUpdates, (nestedPropertyPath, updateObjectParent, updateObject, propertyName, [defaultOptionParent, listenerTree, optionObject]) => {
                this._handleNewOptionUpdateLeaf(nestedPropertyPath, updateObject, propertyName, defaultOptionParent, listenerTree, optionObject);
            }, [this.defaultOptions, this._listenerTree, this.options],
            [true, false, false],
            true
        );
        this._newOptionUpdates = {};
        this._handleResultingUpdates();
        this.emit('postFlush');
    }

    /**
     * Marks a certain property as updated
     * @param nestedPropertyPath
     * @param propertyName
     * @param value
     * @param oldValue
     * @private
     */
    _markPropertyAsUpdated(nestedPropertyPath, propertyName, value, oldValue) {

        OptionObserver._markInstanceAsDirty(this);
        /* Mark the object as changes in the most common path */
        let updateObject = this._accommodateObjectPathUnless(this._newOptionUpdates, nestedPropertyPath, (object) =>
            object[newChanges]
        );
        /* We rest upon the assumption that no function can access a nested path (options.nested.myString)
         * without also accessing intermediary properties (options.nested getter is triggered). If this isn't
         * true for some reason, updates will be missed */
        if (updateObject !== notFound) {
            let fullNestedPropertyPath = nestedPropertyPath.concat([propertyName]);
            let localListenerTree = this._accessListener(fullNestedPropertyPath);
            if (!localListenerTree || !(localListenerTree[listeners] || localListenerTree[0])) {
                this._throwError(`Assignment to undefined option ${fullNestedPropertyPath.join('->')}`);
            }
            let localListeners = localListenerTree[listeners] || localListenerTree[0][listeners];
            for (let entryNames of this._getUpdatesEntryNamesForLocalListenerTree(localListeners)) {
                this._accommodateInsideObject(this._updatesForNextTick, entryNames, true)
            }
            updateObject[propertyName] = {
                [newChanges]: value,
                [originalValue]: oldValue
            };
            this.emit('propertyUpdated', {nestedPropertyPath, propertyName, value, oldValue});
        }
    }

    /**
     * Traverses an object with shallow arrays. Thin wrapper around deepTraverse
     *
     * @param object
     * @param callback with arguments (nestedPropertyPath, object, value, key, {Array} extraObjectsToTraverse)
     * @param {Array} extraObjectsToTraverse A couple of extra objects that are assumed to have the same structure
     * @param {Array} isShallowObjects An array with the same length as extraObjectsToTraverse, with booleans indicating whether
     * the objects are shallow (for example, the default options specified for arrays)
     * @param {Boolean} onlyForLeaves
     * @param {Array} nestedPropertyPath Used to keep track of the current nestedPropertyPath
     * @param {Number} depthCount Internally used depth count to prevent infinite (or too nested) recursion
     * @private
     */
    _deepTraverseWithShallowArrays(object,
                                   callback,
                                   extraObjectsToTraverse = [],
                                   isShallowObjects = [],
                                   onlyForLeaves = false,
                                   nestedPropertyPath = [],
                                   depthCount = 0) {
        return this._deepTraverse(
            object,
            callback,
            extraObjectsToTraverse,
            (suggestedTraversals, key, parents) =>
                Array.isArray(parents[0]) ? isShallowObjects.map((isShallowObject, index) => isShallowObject ? parents[index][0] : suggestedTraversals[index])
                    : suggestedTraversals,
            onlyForLeaves,
            nestedPropertyPath,
            depthCount
        )
    }


    _getDeeplyNestedListenerPaths(localListenerTree, accumulator = []) {
        if (localListenerTree === true) {
            return accumulator;
        }
        let nestedPaths = [];
        for (let key in localListenerTree) {
            let nestedPath = this._getDeeplyNestedListenerPaths(localListenerTree[key], accumulator.concat(key));
            /* If the resulting paths are doubled nested, then they need to be flattened one step */
            if (Array.isArray(nestedPath[0])) {
                nestedPaths.push(...nestedPath);
            } else {
                nestedPaths.push(nestedPath);
            }
        }
        return nestedPaths;
    }

    /**
     * Mark an object as being part of an option
     * @param objectInOptionStructure
     * @private
     */
    _markAsOption(objectInOptionStructure) {
        if (!Utils.isPlainObject(objectInOptionStructure)) {
            return
        }
        //TODO This might be able to be optimized
        let originalOwners = (objectInOptionStructure[optionMetaData] && objectInOptionStructure[optionMetaData].owners) || [];
        if (!originalOwners.includes(this)) {
            objectInOptionStructure[optionMetaData] = {
                owners: originalOwners.concat(this)
            }
        }

    }

    _throwError(message) {
        throw new Error(`${this._errorName}: ${message}`)
    }

    /**
     * Sets up a model that will be synchronized to update the options object whenever something is updated, after startListener() is called
     *
     * @param nestedPropertyPath
     * @param model
     * @param localListenerTree
     * @param property
     * @private
     */
    _setupModel(nestedPropertyPath, model, localListenerTree, property) {

        //TODO This won't work if the id can be set to something else, so verify that this shouldn't be possible
        /* We assume that the constructor name is unique */
        let onModelChanged = (model, changedProperties) =>
            this._onModelChanged(model, changedProperties, property, nestedPropertyPath);
        let isListening = false;
        for (let property of Object.keys(model)) {
            if (!localListenerTree[property]) {
                localListenerTree[property] = {[listeners]: {}};
            }
        }
        return this._accommodateObjectPath(this._modelListeners, [model.constructor.name])[model.id] = {
            startListening: () => {
                if (!isListening) {
                    model.on('changed', onModelChanged);
                    isListening = true
                }
            },
            stopListening: () => {
                if (isListening) {
                    model.removeListener('changed', onModelChanged);
                    isListening = false
                }
            },
            localListenerTree,
            nestedPropertyPath: nestedPropertyPath.concat(property),
            isListening: () => isListening
        }
    }

    /**
     * Deep traverses an object
     * @param object
     * @param callback with arguments (nestedPropertyPath, object, value, key, {Array} extraObjectsToTraverse)
     * @param {Array} extraObjectsToTraverse A couple of extra objects that are assumed to have the same structure
     * @param {Function} extraObjectProcessor Function to do extra work for the extra objects to process
     * @param {Boolean} onlyForLeaves
     * @param {Array} nestedPropertyPath Used to keep track of the current nestedPropertyPath
     * @param {Number} depthCount Internally used depth count to prevent infinite (or too nested) recursion
     * @private
     */

    /*TODO Refactor this function to use name parameters instead of order-based parameters */
    _deepTraverse(object,
                  callback,
                  extraObjectsToTraverse = [],
                  extraObjectProcessor = (item) => item,
                  onlyForLeaves = false,
                  nestedPropertyPath = [],
                  depthCount = 0) {
        if (!Utils.isPlainObject(object) && !Array.isArray(object)) {
            return
        }
        if (depthCount > OptionObserver.maxSupportedDepth) {
            this._throwError(`Encountered circular structure or an exceeded maximum depth of ${OptionObserver.maxSupportedDepth} exceeded`)
        }
        each(object, (value, key) => {

            let valueIsPlainObject = value && typeof value === 'object' && value.constructor.name === 'Object';
            let valueIsLeaf = valueIsPlainObject && Object.keys(value).length === 0;
            if (!onlyForLeaves || valueIsLeaf) {
                /* If the callback returns true, then cancel traversion */
                if (callback(nestedPropertyPath, object, value, key, extraObjectsToTraverse)) {
                    return //canceled traverse
                }
            }
            if (valueIsPlainObject) {
                this._deepTraverse(
                    value,
                    callback,
                    extraObjectProcessor(extraObjectsToTraverse.map(
                        (extraObjectToTraverse) => extraObjectToTraverse[key] || {}
                    ), key, extraObjectsToTraverse),
                    extraObjectProcessor,
                    onlyForLeaves,
                    nestedPropertyPath.concat(key),
                    depthCount + 1
                )
            }
        })
    }

    /**
     * When properties are removed from options, they are reset to the value specified
     * @private
     * @param newValue
     * @param oldValue
     * @param defaultOptionValue
     */
    _resetRemovedPropertiesIfNeeded(newValue, oldValue, defaultOptionValue) {
        if (!oldValue || !Utils.isPlainObject(oldValue) || !defaultOptionValue) {
            return
        }
        let properties = Object.keys(newValue);
        let oldProperties = Object.keys(oldValue);

        let removedProperties = difference(oldProperties, properties);

        for (let property of removedProperties) {
            newValue[property] = defaultOptionValue[property]
        }
    }

    /**
     * Compares something to see if it's predictibly equal
     * @param firstThing
     * @param secondThing
     * @returns {boolean}
     * @private
     */
    _isPredictablyEqual(firstThing, secondThing) {
        /* Object comparison is not reliable */
        if (Utils.isPlainObject(firstThing)) {
            return false
        }
        return firstThing === secondThing
    }

    /**
     * Stops when any path is found with certain criteria
     * @param object
     * @param path
     * @param criteriaCallback
     * @returns {*}
     * @private
     */
    _accommodateObjectPathUnless(object, path, criteriaCallback) {
        for (let property of path) {
            if (object[property] && criteriaCallback(object[property])) {
                return notFound
            }
            object[property] = {};
            object = object[property]
        }
        return object
    }

    /**
     * Accommodates a path in an object
     * @param object
     * @param {Array<String>} path
     * @returns {*}
     * @private
     */
    _accommodateObjectPath(object, path) {
        for (let property of path) {
            if (!object[property]) {
                object[property] = {}
            }
            object = object[property]
        }
        if (!object) {
            object = {}
        }
        return object
    }

    /**
     * Accommodates a path and puts the third argument at the end of that path
     * @param {Object} object
     * @param {Array<String>} path
     * @param stuffToInsert
     * @private
     */
    _accommodateInsideObject(object, path, stuffToInsert) {
        this._accommodateObjectPath(object, path.slice(0, -1))[path[path.length - 1]] = stuffToInsert
    }


    _iterateInObjectPath(object, path, callback) {
        for (let pathString of path) {
            let objectToPassToCallback = notFound;
            if (object.hasOwnProperty(pathString)) {
                object = object[pathString];
                objectToPassToCallback = object
            }
            callback(objectToPassToCallback)
        }
        return object
    }

    /**
     * Deep traverses the entire options structure
     * @param callback
     * @returns {*}
     * @private
     */
    _deepTraverseOptions(callback) {
        return this._deepTraverse(this.options, callback)
    }

    whenSettled() {
        if (Object.keys(this._updatesForNextTick).length || Object.keys(this._newOptionUpdates).length) {
            return new Promise((resolve) => this.once('settled', resolve));
        }
        return Promise.resolve();
    }

    _handleResultingUpdates() {
        let triggerIndices = this._updatesForNextTick[OptionObserver.triggers];
        if (triggerIndices && Object.keys(triggerIndices).length) {
            for (let index in triggerIndices) {
                this.triggerMethodForIndex(this.options, index);
                delete triggerIndices[index];
            }
            /* Reflush to take the changes made by the trigger methods into account */
            this.flushUpdates();
            delete this._updatesForNextTick[OptionObserver.triggers];
        }

        /* Currently, all renderables are "one dimensional", they only have one name. That is why this is just a simple
         * over the first shallow level of this object
        */
        for (let renderableName in this._updatesForNextTick) {
            this.emit('needUpdate', renderableName)
        }
        this._updatesForNextTick = {};
        this.emit('settled');
        this._forbiddenUpdatesForNextTick = {};
    }


    /**
     *
     * @param newValue
     * @param oldValue
     * @param defaultOptionValue
     * @private
     */
    _processImmediateOptionReassignment({newValue, oldValue, defaultOptionValue}) {
        //This is kept a stub if there's more stuff needed to be added here. TODO Refactor function if not
        this._resetRemovedPropertiesIfNeeded(newValue, oldValue, defaultOptionValue)
    }

    /**
     * The most important function of the class. It traverses an ontouched level in the hierarchy of options
     * and acts accordingly
     *
     * @param nestedPropertyPath
     * @param defaultOption
     * @param newValue
     * @param propertyName
     * @param newValueParent
     * @param listenerTree
     * @param defaultOptionParent
     * @returns {*}
     * @private
     */
    _processNewOptionUpdates({nestedPropertyPath, defaultOption, newValue, propertyName, newValueParent, listenerTree, defaultOptionParent}) {

        if(typeof newValueParent !== 'object'){
            this._throwError(`Assigned primitive value ${newValueParent} to compound option ${nestedPropertyPath}`);
        }

        let valueIsModelProperty = newValueParent instanceof Model && typeof defaultOptionParent === 'function';

        let parentIsArray = Array.isArray(defaultOptionParent);
        if (!valueIsModelProperty && !defaultOptionParent.hasOwnProperty(propertyName)) {
            if (parentIsArray) {
                defaultOption = defaultOptionParent[0]
            } else {
                this._throwError(`Assignment to undefined option: ${nestedPropertyPath.concat(propertyName).join('->')}`)
            }
        }

        if (typeof defaultOption === 'function' &&
            ( (defaultOption.prototype instanceof Model || defaultOption === Model) ||
                (defaultOption.prototype instanceof PrioritisedArray || defaultOption === PrioritisedArray)
            )
        ) {
            if (!newValue || !(newValue instanceof defaultOption)) {
                this._throwError(`Failed to specify required: ${nestedPropertyPath.concat(propertyName).join('->')}.
          ${newValue} is not of type ${defaultOption.name}!`)
            }
        }


        let onChangeFunction = listenerTree[onOptionChange];
        let newValueIsInputOption = newValue instanceof InputOption;

        if (onChangeFunction !== undefined && !newValueIsInputOption) {
            onChangeFunction(newValue)
        } else if (newValueIsInputOption) {
            let inputOptionObject = newValue;
            onChangeFunction = (innerValue) => inputOptionObject[changeValue](innerValue);
            listenerTree[onOptionChange] = onChangeFunction;
            newValue = inputOptionObject[unwrapValue](this, nestedPropertyPath.concat(propertyName));
        }

        if (valueIsModelProperty) {
            return
        }

        let valueToLinkTo;

        /* If set to something undefined, then set to the default option. Does not apply for default options */

        /*
         * If the new value is undefined, and the array has been emptied, then we assign this to the default option.
         * TODO: Come up with a more robust solution for default options of arrays */
        if (newValue === undefined && (!parentIsArray || newValueParent.length === 0)) {
            newValue = defaultOption;
            if (onChangeFunction) {
                onChangeFunction(newValue);
            }
            if (Utils.isPlainObject(newValue)) {
                valueToLinkTo = {};
                this._markAsOption(valueToLinkTo);
                valueToLinkTo[optionMetaData].isDefault = true
            }
        }

        if (valueToLinkTo === undefined) {
            valueToLinkTo = newValue
        }

        if (valueToLinkTo !== undefined) {
            this._setupOptionLink(newValueParent, propertyName, valueToLinkTo, nestedPropertyPath, listenerTree);
        }

        //TODO clean up code if needed (why is it even needed?)
        for (let property of Object.keys(defaultOptionParent)
            .filter((property) => Utils.isPlainObject(defaultOptionParent[property]) && newValueParent[property] === undefined)
            ) {
            newValueParent[property] = {}
        }

        if (newValue instanceof Model) {
            this._handleNewModelUpdate(nestedPropertyPath, newValue, listenerTree, propertyName)
        }

        if (Array.isArray(newValue)) {
            this._setupArray(nestedPropertyPath, newValue, listenerTree, propertyName, defaultOption)
        }

        return newValue
    }

    /**
     *
     * @param nestedPropertyPath
     * @param newValue
     * @param listenerTree
     * @param outerPropertyName
     * @param defaultOption
     * @private
     */
    _setupArray(nestedPropertyPath, newValue, listenerTree, outerPropertyName, defaultOption) {
        if (!listenerTree[isArrayListener]) {
            this._throwError(`The parameter ${nestedPropertyPath.concat(outerPropertyName).join('->')} was specified as [${newValue}] but was not registered as an array in bindings.setup().`)
        }

        if (ArrayObserver.isArrayObserved(newValue)) {
            //TODO Confirm that returning early is wished for
            return
        }
        /* Continue traversing down the array and update the rest like normal, using the array observer as a stepping stone*/
        let arrayObserver = new ArrayObserver(newValue, (index, value) => {
            /* copy the listener tree information */
            listenerTree[index] = listenerTree.value;
            //TODO This might be overkill since it's already handled in the flush function (Try removing code below and see if it still works)
            value = this._processNewOptionUpdates({
                defaultOptionParent: defaultOption,
                nestedPropertyPath: nestedPropertyPath.concat(outerPropertyName),
                defaultOption: defaultOption[index],
                newValueParent: newValue,
                newValue: value,
                propertyName: index,
                listenerTree: listenerTree[index]
            });

            this._deepTraverse(defaultOption[0], (innerNestedPropertyPath, defaultOptionParent, defaultOption, propertyName, [newValueParent, listenerTreeParent]) => {

                this._processNewOptionUpdates({
                    nestedPropertyPath: nestedPropertyPath.concat(outerPropertyName, index, innerNestedPropertyPath),
                    newValue: newValueParent[propertyName],
                    propertyName,
                    defaultOption,
                    defaultOptionParent,
                    listenerTree: listenerTreeParent[propertyName],
                    newValueParent
                })
            }, [value, listenerTree.value])
        });

        listenerTree[storedArrayObserver] = arrayObserver;

        //TODO utilize optimizations from partial updates (probably by implementing special events towards the view for this, aside from 'needUpdate')
        arrayObserver.on('mapCalled',
            (originalMapFunction, passedMapper) =>
                //todo this isn't used. DOes it need to be here?
                this.emit('mapCalled', {nestedPropertyPath, listenerTree, originalMapFunction, passedMapper})
        );
        let onArrayChanged = ({index, newValue, oldValue}) => {
            this._markPropertyAsUpdated(nestedPropertyPath.concat(outerPropertyName), index, newValue, oldValue)
        };
        arrayObserver.on('replaced', onArrayChanged);
        arrayObserver.on('added', onArrayChanged);
        arrayObserver.on('removed', onArrayChanged);
        this._arrayObservers.push(arrayObserver)

    }

    _handleNewModelUpdate(nestedPropertyPath, newValue, listenerTree, key) {
        //TODO This implementation is a bit naive, won't work always (or in second thought, won't it?)
        let oldListenerStructureBase = this.accessObjectPath(this._modelListeners, [oldValue.constructor.name]);

        if (oldListenerStructureBase === notFound || !oldListenerStructureBase[oldValue.id]) {
            return this._setupModel(nestedPropertyPath, newValue, listenerTree, key).startListening()
        }

        let oldListenerStructure = oldListenerStructureBase[oldValue.id];

        if (oldListenerStructure.isListening()) {
            oldListenerStructure.stopListening();
            delete oldListenerStructureBase[oldValue.id];
            this._setupModel(nestedPropertyPath, newValue, listenerTree, key).startListening()
        }
    }

    _createListenerTree() {
        this._listenerTree = cloneDeepWith(this.defaultOptions, this._listenerTreeCloner.bind(this)) || {[listeners]: {}}
    }

    /**
     * Creates the listener tree
     * We are interested in a tree that is a copy of the defaultOptions and with a symbol [listeners] set to {} everywhere applicable
     * @param value
     * @param propertyName
     * @returns {*}
     * @private
     */
    _listenerTreeCloner(value, propertyName) {
        if ([listeners, isArrayListener].includes(propertyName)) {
            return value
        }
        let isPlainObject = Utils.isPlainObject(value), isArray = Array.isArray(value);
        /* If the object already has the listeners set*/
        if (typeof value === 'object' && value[listeners] && !Object.keys(value).length) {
            return value
        }
        if (isPlainObject || isArray) {

            let listenersIfExists = value[listeners];
            if (!listenersIfExists) {
                let valueToClone = {...value, [listeners]: {}};
                if (isArray) {
                    valueToClone = {value: value[0] || {}, [listeners]: {}, [isArrayListener]: true}
                }

                return cloneDeepWith(valueToClone, this._listenerTreeCloner.bind(this));
            }
        } else {
            return {[listeners]: {}}
        }
    }


    _flushArrayObserverChanges() {
        for (let arrayObserver of this._arrayObservers) {
            arrayObserver.rebuild()
        }
    }

    _listenForModelUpdates(entryNames) {
        PrioritisedObject.setPropertyGetterSpy((model, propertyName) => {
            /* TODO handle the case where this can be undefined */
            let modelListenerOfType = this._modelListeners[model.constructor.name] || {};
            let modelListener = modelListenerOfType[model.id];
            if (!modelListenerOfType || !modelListener) {
                //TODO, instead of throwing an error, accommodate property in local listener
                return this._throwError(`Model when creating ${entryNames.join('')} not declared as a valid binding`);
            }
            let localListenerTree = modelListener.localListenerTree[propertyName];
            this._addToListenerTree(entryNames, localListenerTree);
            modelListener.startListening();
        })
    }

    _handleNewOptionUpdateLeaf(nestedPropertyPath, updateObject, propertyName, defaultOptionParent, listenerTree, optionObject) {

        let newValue = updateObject[newChanges],
            oldValue = updateObject[originalValue];
        let defaultOption = defaultOptionParent[propertyName];
        let innerListenerTree = listenerTree[propertyName];

        if (Utils.isPlainObject(defaultOptionParent)) {
            this._processImmediateOptionReassignment({
                newValue, oldValue, defaultOption
            });
        }

        this._processNewOptionUpdates({
            defaultOptionParent: defaultOptionParent,
            nestedPropertyPath,
            defaultOption,
            newValueParent: optionObject,
            newValue,
            propertyName,
            listenerTree: innerListenerTree
        });

        /* If the parent is a model or function, then no need to continue */
        if (!Utils.isPlainObject(defaultOption)) {
            return
        }

        let outerNestedPropertyPath = nestedPropertyPath.concat(propertyName);

        this._deepTraverseWithShallowArrays(defaultOption, (innerNestedPropertyPath, defaultOptionParent, defaultOption, propertyName, [listenerTreeParent, newValueParent]) => {
            this._processNewOptionUpdates({
                nestedPropertyPath: outerNestedPropertyPath.concat(innerNestedPropertyPath),
                defaultOption,
                newValueParent,
                newValue: newValueParent[propertyName],
                propertyName,
                defaultOptionParent,
                listenerTree: listenerTreeParent[propertyName]
            })
        }, [innerListenerTree, optionObject[propertyName]], [false, false])
    }


    static _instances = [];
    static _dirtyInstances = {};

    static _tickCount = 0;

    /**
     * Every tick, the changes are flushed in the options object. The _isFlushingUpdates flag gives an indication whether
     * the flushings are in progress or not
     *
     * @private
     */
    static _flushAllUpdates() {
        //TODO Add guards/errors for infinite updates here
        this._isFlushingUpdates = true;
        OptionObserver._tickCount++;
        /* Reset dirty instances, because we are going to traverse all instances anyways */
        OptionObserver._dirtyInstances = {};
        for (let optionObserver of OptionObserver._instances) {
            optionObserver.flushUpdates()
        }
        /* Flush dirty instances until there are no more dirty instances left */
        while (Object.keys(OptionObserver._dirtyInstances).length) {
            let dirtyInstances = {...OptionObserver._dirtyInstances};
            OptionObserver._dirtyInstances = {};
            for (let optionObserverID in dirtyInstances) {
                dirtyInstances[optionObserverID].flushUpdates()
            }
        }
        this._isFlushingUpdates = false;
    }

    static _registerNewInstance(newInstance) {
        this._instances.push(newInstance);
        newInstance[instanceIdentifier] = this._instances.length
    }

    static _markInstanceAsDirty(dirtyInstance) {
        OptionObserver._dirtyInstances[dirtyInstance[instanceIdentifier]] = dirtyInstance
    }
}

/* Flush updates, if they exist, every tick */
Timer.every(OptionObserver._flushAllUpdates);