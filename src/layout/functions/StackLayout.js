/**
 * Karl Lundfall
 */
// import dependencies
import Utility          from '../../famous/utilities/Utility';
import LayoutUtility    from 'famous-flex/LayoutUtility.js';

// Define capabilities of this layout function
var capabilities = {
    sequence: true,
    direction: [Utility.Direction.Y, Utility.Direction.X],
    scrolling: true,
    trueSize: true,
    sequentialScrollingOptimized: true
};

// Data
var set = {
    size: [0, 0],
    translate: [0, 0, 0],
    scrollLength: undefined
};
var margin = [0, 0];

// Layout function
export function StackLayout(context, options) {

    // Local data
    var size = context.size;
    var direction = context.direction;
    var alignment = context.alignment;
    var revDirection = direction ? 0 : 1;
    var offset;
    var margins = options.margins;
    var spacing = options.spacing || 0;
    var node;
    var nodeSize;
    var itemSize;
    var getItemSize;
    var lastSectionBeforeVisibleCell;
    var lastSectionBeforeVisibleCellOffset;
    var lastSectionBeforeVisibleCellLength;
    var lastSectionBeforeVisibleCellScrollLength;
    var lastSectionBeforeVisibleCellTopReached;
    var firstVisibleCell;
    var lastNode;
    var lastCellOffsetInFirstVisibleSection;
    var isSectionCallback = options.isSectionCallback;
    var bound;
    var coveredScrollHeight = 0, maxOffset, minOffset;

    //
    // Sanity checks
    //
    if (spacing && typeof spacing !== 'number') {
        console.log('Famous-flex warning: StackLayout was initialized with a non-numeric spacing option. ' + // eslint-disable-line no-console
            'The CollectionLayout supports an array spacing argument, but the StackLayout does not.');
    }

    //
    // Reset size & translation
    //
    set.size[0] = size[0];
    set.size[1] = size[1];
    set.size[revDirection] -= (margins[1 - revDirection] + margins[3 - revDirection]);
    set.translate[0] = 0;
    set.translate[1] = 0;
    set.translate[2] = 0;
    set.translate[revDirection] = margins[direction ? 3 : 0];

    //
    // Determine item-size or use true=size
    //
    if ((options.itemSize === true) || !options.hasOwnProperty('itemSize')) {
        itemSize = true;
    }
    else if (options.itemSize instanceof Function) {
        getItemSize = options.itemSize;
    }
    else {
        itemSize = (options.itemSize === undefined) ? size[direction] : options.itemSize;
    }

    //
    // Determine leading/trailing margins
    //
    margin[0] = margins[direction ? 0 : 3];
    margin[1] = -margins[direction ? 2 : 1];

    //
    // Process all next nodes
    //
    maxOffset = offset = context.scrollOffset + margin[alignment];

    bound = context.scrollEnd;
    if(context.scrollTopHeight){
        context.set('topScroller', {
            translate: [0, 0, 0],
            opacity: 0,
            size: [0,context.scrollTopHeight]
        });
    }


    var scrollStart = context.scrollStart + margin[alignment];
    while (offset < (bound + spacing)) {
        lastNode = node;
        node = context.next();

        if (!node) {
            break;
        }

        //
        // Get node size
        //
        nodeSize = getItemSize ? getItemSize(node.renderNode, context.size) : itemSize;
        nodeSize = (nodeSize === true) ? context.resolveSize(node, size)[direction] : nodeSize;


        //
        // Position node
        //
        set.size[direction] = nodeSize;
        set.translate[direction] = offset + (alignment ? spacing : 0);
        set.scrollLength = nodeSize + spacing;

        offset += set.scrollLength;
        maxOffset = offset;

        if (offset < context.scrollStart) {
            /* We scrolled down so that the start sequence changed */
            context.moveStartSequence(true);
        }

        context.set(node, set);


        //
        // Keep track of the last section before the first visible cell
        //
        if (isSectionCallback && isSectionCallback(node.renderNode)) {
            if ((set.translate[direction] <= margin[0]) && !lastSectionBeforeVisibleCellTopReached) {
                lastSectionBeforeVisibleCellTopReached = true;
                set.translate[direction] = margin[0];
                context.set(node, set);
            }
            if (!firstVisibleCell) {
                lastSectionBeforeVisibleCell = node;
                lastSectionBeforeVisibleCellOffset = offset - nodeSize;
                lastSectionBeforeVisibleCellLength = nodeSize;
                lastSectionBeforeVisibleCellScrollLength = nodeSize;
            }
            else if (lastCellOffsetInFirstVisibleSection === undefined) {
                lastCellOffsetInFirstVisibleSection = offset - nodeSize;
            }
        }
        else if (!firstVisibleCell && (offset >= 0)) {
            firstVisibleCell = node;
        }
    }
    if(context.scrollLength){
        context.set('bottomScroller', {
            translate: [0, 0, 0],
            opacity: 0,
            size: [10,context.scrollLength + margins[alignment + 2]],
            origin: [0, 0]
        });
    }


    //
    // Process previous nodes
    //
    lastNode = undefined;
    node = undefined;
    minOffset = offset = context.scrollOffset + margin[alignment];
    bound = context.scrollStart;

    while (offset > (bound - spacing)) {
        lastNode = node;
        node = context.prev();
        if (!node) {
            break;
        }


        //
        // Get node size
        //
        nodeSize = getItemSize ? getItemSize(node.renderNode, context.size) : itemSize;
        nodeSize = (nodeSize === true) ? context.resolveSize(node, size)[direction] : nodeSize;

        //
        // Position node
        //
        set.scrollLength = nodeSize + spacing;
        offset -= set.scrollLength;
        minOffset = offset;
        set.size[direction] = nodeSize;
        set.translate[direction] = offset + (alignment ? spacing : 0);
        if(offset > context.scrollEnd) {
            context.moveStartSequence(false);
        }

        context.set(node, set);



        //
        // Keep track of the last section before the first visible cell
        //
        if (isSectionCallback && isSectionCallback(node.renderNode)) {
            if ((set.translate[direction] <= margin[0]) && !lastSectionBeforeVisibleCellTopReached) {
                lastSectionBeforeVisibleCellTopReached = true;
                set.translate[direction] = margin[0];
                context.set(node, set);
            }
            if (!lastSectionBeforeVisibleCell) {
                lastSectionBeforeVisibleCell = node;
                lastSectionBeforeVisibleCellOffset = offset;
                lastSectionBeforeVisibleCellLength = nodeSize;
                lastSectionBeforeVisibleCellScrollLength = set.scrollLength;
            }
        }
        else if ((offset + nodeSize) >= 0) {
            firstVisibleCell = node;
            if (lastSectionBeforeVisibleCell) {
                lastCellOffsetInFirstVisibleSection = offset + nodeSize;
            }
            lastSectionBeforeVisibleCell = undefined;
        }
    }
    if (lastNode && !node && alignment) {
        set.scrollLength = nodeSize + margin[0] + -margin[1];
        context.set(lastNode, set);
        if (lastSectionBeforeVisibleCell === lastNode) {
            lastSectionBeforeVisibleCellScrollLength = set.scrollLength;
        }
    }

    //
    // When no first section is in the scrollable range, then
    // look back further in search for that section
    //
    if (isSectionCallback && !lastSectionBeforeVisibleCell) {
        node = context.prev();
        while (node) {
            if (isSectionCallback(node.renderNode)) {
                lastSectionBeforeVisibleCell = node;
                nodeSize = options.itemSize || context.resolveSize(node, size)[direction];
                lastSectionBeforeVisibleCellOffset = offset - nodeSize;
                lastSectionBeforeVisibleCellLength = nodeSize;
                lastSectionBeforeVisibleCellScrollLength = undefined;
                break;
            }
            else {
                node = context.prev();
            }
        }
    }

    //
    // Reposition "last section before first visible cell" to the top of the layout
    //
    if (lastSectionBeforeVisibleCell) {
        var correctedOffset = Math.max(margin[0], lastSectionBeforeVisibleCellOffset);
        if ((lastCellOffsetInFirstVisibleSection !== undefined) &&
            (lastSectionBeforeVisibleCellLength > (lastCellOffsetInFirstVisibleSection - margin[0]))) {
            correctedOffset = ((lastCellOffsetInFirstVisibleSection - lastSectionBeforeVisibleCellLength));
        }
        set.size[direction] = lastSectionBeforeVisibleCellLength;
        set.translate[direction] = correctedOffset;
        set.scrollLength = lastSectionBeforeVisibleCellScrollLength;
        context.set(lastSectionBeforeVisibleCell, set);
    }

    context.setCoveredScrollHeight(maxOffset - minOffset);
}

StackLayout.Capabilities = capabilities;
StackLayout.Name = 'StackLayout';
StackLayout.Description = 'List-layout with margins, spacing and sticky headers';
