import {notFound, OptionObserver, listeners} from './OptionObserver';

export let changeValue = Symbol('changeValue'),
    unwrapValue = Symbol('unwrapValue'),
    storedInputOption = Symbol('storedInputOption');

/* Every property has to be represented by Symbols in order to avoid any collisions with option names */
let nestedPropertyPath = Symbol('nestedPropertyPath'),
    optionParentObject = Symbol('optionParentObject'),
    foreignNestedPropertyPath = Symbol('foreignNestedPropertyPath'),
    propertyName = Symbol('propertyName'),
    optionObject = Symbol('optionObject'),
    optionObserver = Symbol('optionObserver'),
    /* This is the option observer that consumes the input option */
    foreignOptionObserver = Symbol('optionObserver'),
    listenerTree = Symbol('listenerTree');

/**
 * Represents an option where data flows upwards
 */

export class InputOption {
    constructor(incomingNestedPropertyPath, incomingOptionObserver, incomingListenerTree) {
        this[nestedPropertyPath] = incomingNestedPropertyPath.slice(0, -1);
        this[optionObserver] = incomingOptionObserver;
        this[propertyName] = incomingNestedPropertyPath[incomingNestedPropertyPath.length - 1];
        this[listenerTree] = incomingListenerTree;
    }


    [changeValue](newValue) {
        let storedOptionsObserver = this[optionObserver];
        if (this._shouldMuteUpdatesWhenChanging) {
            //todo does this work 100% for arrays?
            if (!this._entryNames) {
                throw new Error('Trying to change unwrapped value in InputOption');
            }
            storedOptionsObserver.preventEntryFromBeingUpdated(this._entryNames);
        }
        let optionParentObject = storedOptionsObserver.accessObjectPath(storedOptionsObserver.getOptions(), this[nestedPropertyPath]);
        if (optionParentObject === notFound) {
            throw new Error('Cannot change value of root input option');
        }
        optionParentObject[this[propertyName]] = newValue;
        if (this._shouldMuteUpdatesWhenChanging) {
            storedOptionsObserver.allowEntryToBeUpdated(this._entryNames);
        }
    };

    [unwrapValue] (theForeignOptionObserver, theForeignNestedPropertyPath) {
        // TODO: Throw a helpful error when this[listenerTree] is undefined due to declaring an unkown option
        this[listenerTree][storedInputOption] = this;

        this[foreignNestedPropertyPath] = theForeignNestedPropertyPath;
        let storedOptionsObserver = this[optionObserver];

        //There should be another solution, but not sure how to implement it
        let activeRecordings = storedOptionsObserver.getActiveRecordings();


        this._determineWhetherShouldMuteUpdates(activeRecordings);
        if(theForeignOptionObserver && theForeignOptionObserver !== this[foreignOptionObserver]){
            this._setupForeignOptionObserverListener(theForeignOptionObserver)
        }
        /* We can not possibly invalidate the value, while unwrapping it, because that is likely going to lead to
        *  an infinite loop. Value invalidation is meant to be used when accessing the value normally. Therefore, it
        *  needs to be forced to false while we are accessing the object path*/
        this._valueIsUnwrapping = true;
        let result = storedOptionsObserver.accessObjectPath(this[optionObserver].getOptions(), this[nestedPropertyPath].concat(this[propertyName]));
        this._valueIsUnwrapping = false;
        return result;
    };

    updateValueIfNecessary(){
        if(this._valueShouldBeInvalidated && !this._valueIsUnwrapping){
            this[foreignOptionObserver].flushUpdates();
        }
    }

    _setupForeignOptionObserverListener(theForeignOptionObserver) {
        this[foreignOptionObserver] = theForeignOptionObserver;
        theForeignOptionObserver.on('propertyUpdated', ({nestedPropertyPath: nestedPathOfUpdate, propertyName, value, oldValue})=> {
            /* Check if the updated property is a subset of the own nested property */
            for(let [index, intermediatePropertyName] of nestedPathOfUpdate.concat(propertyName).entries()){
                if(intermediatePropertyName !== this[foreignNestedPropertyPath][index]){
                    return;
                }
            }
            this._valueShouldBeInvalidated = true;
            theForeignOptionObserver.once('postFlush', () =>{
                this._valueShouldBeInvalidated = false;
            });
        })
    }

    _determineWhetherShouldMuteUpdates(activeRecordings) {

        let recordedEntryNames = Object.keys(activeRecordings);
        if (recordedEntryNames.length !== 1) {
            throw new Error(recordedEntryNames[OptionObserver.triggers] ?
                'Input option cannot be unwrapped inside trigger function' :
                recordedEntryNames.length === 0 ?
                    'Cannot unwrap input option outside renderable initializer' :
                    'Trying to unwrap value in InputOption but OptionObserver should have exactly one recording');
        }
        //todo refactor to use symbol for _entryNames and _shouldMuteUpdatesWhenChanging
        /* Determine if there's already listeners for this. If not, we should suppress certain updates from happening */



        let recordedEntryName;
        let listenersInsideListenerTree = this[listenerTree][listeners];
        let listenerForRecordAlreadyDefined = false;

        if(this._shouldMuteUpdatesWhenChanging !== undefined){
            let newEntryNames = [], activeRecording = activeRecordings;
            /* Determine the new entry names by traversing the object */
            while(activeRecording){
                let newKey = Object.keys(activeRecording)[0];
                activeRecording = activeRecording[newKey];
                if(newKey){
                    newEntryNames.push(newKey);
                }
            }
            this._shouldMuteUpdatesWhenChanging = this._entryNames.every((entryName, index) => entryName === newEntryNames[index]);
            return;
        }

        this._entryNames = [];
        /* Go into the nested structure to get the full entryNames list (should be quite flat, if not completely) */
        do {
            recordedEntryNames = Object.keys(activeRecordings);
            recordedEntryName = recordedEntryNames[0];
            if (recordedEntryName) {
                this._entryNames.push(recordedEntryName);
            }
            listenersInsideListenerTree = listenersInsideListenerTree[recordedEntryName] || {};
            activeRecordings = activeRecordings[recordedEntryName];
            if (listenersInsideListenerTree === true) {
                listenerForRecordAlreadyDefined = true;
            }
        } while (activeRecordings);
        this._shouldMuteUpdatesWhenChanging = !listenerForRecordAlreadyDefined;
    }
}