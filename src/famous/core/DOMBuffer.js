/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
* any variations, changes and additions are NPOSL-3 licensed.
*
* @authors Karl Lundfall, Hans van den Akker
* @license NPOSL-3.0
* @copyright Arva 2015-2017
*/

export default class DOMBuffer {

  static enqueuedOperations = [];

  static assignProperty(object, property, value) {
    DOMBuffer.enqueuedOperations.push({ data: [object, property, value], operation: 'assignProperty' });
  }

  static setAttribute(element, attribute, value) {
    DOMBuffer.enqueuedOperations.push({ data: [element, attribute, value], operation: 'setAttribute' });
  };

  static addToObject(object, value) {
    DOMBuffer.enqueuedOperations.push({ data: [object, value], operation: 'addToObject' });
  };

  static setAttributeOnDescendants(element, attribute, attributeValue) {
    DOMBuffer.enqueuedOperations.push({ data: [element, attribute, attributeValue], operation: 'setAttributeOnDescendants' });
  };

  static removeFromObject(object, attribute) {
    DOMBuffer.enqueuedOperations.push({ data: [object, attribute], operation: 'removeFromObject' });
  };

  static removeAttribute(element, attribute) {
    DOMBuffer.enqueuedOperations.push({ data: [element, attribute], operation: 'removeAttribute' });
  };

  static removeChild(parent, childToRemove) {
    DOMBuffer.enqueuedOperations.push({ data: [parent, childToRemove], operation: 'removeChild' });
  };

  static appendChild(parent, childToAppend) {
    DOMBuffer.enqueuedOperations.push({ data: [parent, childToAppend], operation: 'appendChild' });
  };

  static insertBefore(parent, childBefore, childToInsert) {
    DOMBuffer.enqueuedOperations.push({ data: [parent, childBefore, childToInsert], operation: 'insertBefore' });
  };

  static flushUpdates() {
    for (let index = 0; index < DOMBuffer.enqueuedOperations.length; index++) {
      let enqueuedOperation = DOMBuffer.enqueuedOperations[index];
      let operationName = DOMBuffer.enqueuedOperation.operation;
      let data = DOMBuffer.enqueuedOperation.data;
      switch (operationName) {
        case 'appendChild':
          data[0].appendChild(data[1]);
          break;
        case 'insertBefore':
          data[0].insertBefore(data[1], data[2]);
          break;
        case 'setAttribute':
          data[0].setAttribute(data[1], data[2]);
          break;
        case 'removeChild':
          if (data[0].childNodes.length && data[0].contains(data[1])) {
            data[0].removeChild(data[1]);
          }
          break;
        case 'removeAttribute':
          data[0].removeAttribute(data[1]);
          break;
        case 'addToObject':
          data[0].add(data[1]);
          break;
        case 'removeFromObject':
          data[0].remove(data[1]);
          break;
        case 'assignProperty':
          data[0][data[1]] = data[2];
          break;
        case 'setAttributeOnDescendants':
          /* Gets all the descendants for element
           * https://stackoverflow.com/questions/26325278/how-can-i-get-all-descendant-elements-for-parent-container
           * */
          var descendants = data[0].querySelectorAll("*");
          for (var i = 0; i < descendants.length; i++) {
            descendants[i].setAttribute(data[1], data[2]);
          }
          break;
        default:
          throw new Error(`Internal problem in DOMBuffer: Unkown operation: "${operationName}"`);
      }
    }
    DOMBuffer.enqueuedOperations = [];
  }
}
