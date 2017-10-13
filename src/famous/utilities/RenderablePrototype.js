/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
* any variations, changes and additions are NPOSL-3 licensed.
*
* @authors Karl Lundfall, Hans van den Akker
* @license NPOSL-3.0
* @copyright Arva 2015-2017
*/

/**
 * Used internally as a return from with() statements that data bind the contents
 */
export class RenderablePrototype {
  _decoratorFunctions = [];

  constructor(type, options){
    this.type = type;
    this.options = options;
  }

  addDirectlyAppliedDecoratorFunction(decoratorFunction){
    this._decoratorFunctions.push(decoratorFunction);
  }

  getDirectlyAppliedDecoratorFunctions() {
    return this._decoratorFunctions;
  }

}
