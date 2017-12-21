// A bunch of helper functions.

/**
 * @ignore
 */
function isUpperCase(char) {
    return char.toUpperCase() === char;
}

/**
 * @ignore
 */
function isFunction(value) {
    return typeof value === 'function';
}

/**
 * @ignore
 */
function isObject(value) {
    return typeof value === 'object';
}

/**
 * @ignore
 */
function toString(token) {
    if (typeof token === 'string') {
        return token;
    }

    if (token === undefined || token === null) {
        return '' + token;
    }

    if (token.name) {
        return token.name;
    }

    return token.toString();
}

/**
 * @ignore
 */
var ownKeys = (this && this.Reflect && Reflect.ownKeys ? Reflect.ownKeys : function ownKeys(O) {
    var keys = Object.getOwnPropertyNames(O);
    if (Object.getOwnPropertySymbols) return keys.concat(Object.getOwnPropertySymbols(O));
    return keys;
});


export {
    isUpperCase,
    isFunction,
    isObject,
    toString,
    ownKeys
};
