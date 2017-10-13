/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


export default class Entity {

  /**
   * A singleton that maintains a global registry of Surfaces.
   *   Private.
   *
   * @private
   * @static
   */
  static entities = [];

  /**
   * Get entity from global index.
   *
   * @private
   * @method get
   * @param {Number} id entity registration id
   * @return {Surface} entity in the global index
   */
   static get(id) {
      return entities[id];
  }

  /**
   * Overwrite entity in the global index
   *
   * @private
   * @method set
   * @param {Number} id entity registration id
   * @param {Surface} entity to add to the global index
   */
  static set(id, entity) {
      entities[id] = entity;
  }

  /**
   * Add entity to global index
   *
   * @private
   * @method register
   * @param {Surface} entity to add to global index
   * @return {Number} new id
   */
   static register(entity) {
      var id = entities.length;
      set(id, entity);
      return id;
  }

  /**
   * Remove entity from global index
   *
   * @private
   * @method unregister
   * @param {Number} id entity registration id
   */
   static unregister(id) {
      set(id, null);
  }
}
