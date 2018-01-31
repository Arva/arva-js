/**
 * Clones an option object in a "lazy" way, which means that it is only (re-)cloned for the path which the getteres are triggered
 * //TODO Support caching
 */
import {Utils}                  from './Utils';
import {storedArrayObserver,
    shadow}                     from './OptionObserver.js';
import {Model}                  from '../../core/Model';

/* */
let deleted = Symbol('deleted');

/**
 * Used to lazily load a structural clone through getter hooks (the structure is also frozen since it's based on getters)
 */
export class LazyLoadedOptionClone {

    static get(TargetObjectType, optionToClone, listenerTree, nestedPropertyPath = [], optionObserver) {
        let root = new TargetObjectType(nestedPropertyPath, optionObserver, listenerTree);
        let optionIsArray = Array.isArray(optionToClone);
        let optionIsModel = optionToClone instanceof Model;
        if (!Utils.isPlainObject(optionToClone) && !optionIsArray && !optionIsModel) {
            return root;
        }

        let cachedShallowClone = {};

        //TODO Make sure caching works if stuff is replaced
        let addCloneGetter = (property) => {
            /* Clear any previous data in the cachedShallowClone (if it's marked as deleted)*/
            if (cachedShallowClone[property] === deleted) {
                delete cachedShallowClone[property];
                return;
            }
            Object.defineProperty(root, property, {
                get: () => {
                    if (cachedShallowClone[property] !== undefined) {
                        if (cachedShallowClone[property] === deleted) {
                            return undefined;
                        }
                        return cachedShallowClone[property];
                    }
                    return cachedShallowClone[property] = LazyLoadedOptionClone.get(TargetObjectType,
                        optionToClone[shadow][property],
                        /* Access the listener tree by using dedicated method to be sure that it's done correctly */
                        listenerTree[property],
                        nestedPropertyPath.concat(property),
                        optionObserver)
                }
            });
        };

        /* Arrays mean that the structure can change dynamically. In that case, we listen for added and removed
        *  properties, which would modify the clone structure */
        if (optionIsArray) {
            let arrayObserver = listenerTree[storedArrayObserver];
            if (!arrayObserver) {
                Utils.warn('Option passed to LazyLoadedOptionClone without properly initialized listener tree');
            } else {
                arrayObserver.on('removed', ({index}) => cachedShallowClone[index] = deleted);
                arrayObserver.on('added', ({index}) => addCloneGetter(index));
                /* Replaced means we should invalidate the cache */
                arrayObserver.on('replaced', ({index}) => cachedShallowClone[index] = undefined);
            }
        }

        for (let property of Object.keys(optionToClone)) {
            addCloneGetter(property);
        }
        return root;

    }
}