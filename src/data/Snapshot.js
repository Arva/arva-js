/**



 @author: Tom Clement (tjclement)
 @license NPOSL-3.0
 @copyright Bizboard, 2015

 */

/**
 * @ignore
 * Abstraction of a data snapshot
 */
export class Snapshot{
    constructor(dataSnapshot){}

    get key(){}
    val(){}
    get ref(){}
    getPriority(){}
    forEach(){}
    numChildren(){}
}