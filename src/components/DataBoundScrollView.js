/**
 This Source Code is licensed under the MIT license. If a copy of the
 MIT-license was not distributed with this file, You can obtain one at:
 http://opensource.org/licenses/mit-license.html.

 @author: Hans van den Akker (mysim1)
 @license MIT
 @copyright Bizboard, 2015

 */

import sortBy                       from 'lodash/sortBy.js';
import findIndex                    from 'lodash/findIndex.js';
import ListLayout                   from 'famous-flex/layouts/ListLayout.js';

import {RenderablePrototype}        from 'famous/utilities/RenderablePrototype.js'
import {Throttler}                  from '../utils/Throttler.js';
import {Utils}                      from '../utils/view/Utils.js';
import {ReflowingScrollView}        from './ReflowingScrollView.js';
import {combineOptions}             from '../utils/CombineOptions.js';

/**
 * A component for displaying multiple elements based on a two-way connection with a PrioritisedArray,
 * with support for grouping, sorting and header.
 */
//TODO Fix so that the background is scrollable (full size)
export class DataBoundScrollView extends ReflowingScrollView {


    /**
     * Be sure to specify either a getSize function in the class of the itemTemplate, or to specify the size in the
     * layoutOptions.
     *
     * @param {Object} options The options passed inherit from previous classes. Avoid using the dataSource option since
     * the DataBoundScrollView creates its own dataSource from options.dataSource.
     * @param {PrioritisedArray} [options.dataSource] The data that should be read to create entries.
     * @param {PrioritisedArray} [options.dataSources] Instead of passing one dataSource, this option can be used to pass multiple
     * @param {Function} [options.itemTemplate] A function that returns a renderable representing each data item.
     * @param {Function} [options.placeholderTemplate] A function that returns a renderable to display when there are
     * no items present.
     * @param {Function} [options.headerTemplate] A function that returns a renderable to display as a header.
     * @param {Function} [options.orderBy] An ordering function that takes two data models (model1, model2).
     * If it returns true, then model1 should go before model2.
     * @param {Function} [options.groupBy] A function that takes a model and returns a value to group by. If set, then
     * the groupTemplate option also needs to be set.
     * @param {Function} [options.groupTemplate] A function that takes as a single argument, the groupBy value, and returns
     * a renderable to insert before a group belonging to that value.
     * @param {function} [options.dataFilter] Filter what data is relevant to the view. Should be a function taking as
     * an argument a model and from there returning a boolean.
     * @param {Boolean} [options.stickHeaders] If set to true, then the group headers will stick to the top when scrolling.
     * Beware that this is slightly buggy as of now and might require some fine tuning to provide a better UX.
     * @param {Function} [options.customInsertSpec] A function that takes as a single argument a model and returns a spec
     * that is used when inserting a new item.
     * @param {Boolean} [options.chatScrolling] If set to true, the scroll will remain at the bottom if at bottom already
     * when new messages are added.
     *
     * If this function returns true, then model1 will be placed before model2.
     *
     */
    constructor(options = {}) {
        /* Treat dataSource differently since the options has another meaning further down the chain */
        let {dataSource} = options;
        delete options.dataSource;
        super(combineOptions({
            scrollFriction: {
                strength: 0.0015
            },
            autoPipeEvents: true,
            throttleDelay: 0, /* If set to 0, no delay is added in between adding items to the DataBoundScrollView. */
            dataSource: [],
            sortingDirection: 'ascending',
            flow: true,
            flowOptions: {
                spring: {               // spring-options used when transitioning between states
                    dampingRatio: 0.8,  // spring damping ratio
                    period: 1000        // duration of the animation
                },
                insertSpec: {           // render-spec used when inserting renderables
                    opacity: 0          // start opacity is 0, causing a fade-in effect,
                }
            },
            dataFilter: () => true,
            ensureVisible: null,
            layoutOptions: {
                isSectionCallback: options.stickyHeaders ? function (renderNode) {
                    return renderNode.groupId !== undefined;
                } : undefined
            },
            chatScrolling: false
        }, options));

        this._internalDataSource = {};
        this._internalGroups = {};
        this._eventCallbacks = {};

        /* In order to keep track of what's being removed, we store this which maps an id to a boolean */
        this._removedEntries = {};
        this._isGrouped = this.options.groupBy != null;
        this._isDescending = this.options.sortingDirection === 'descending';
        this._throttler = new Throttler(this.options.throttleDelay, true, this);
        this._useCustomOrdering = !!this.options.orderBy;
        /* If no orderBy method is set, or it is a string field name, we set our own ordering method. */
        if (!this.options.orderBy || typeof this.options.orderBy === 'string') {
            let fieldName = this.options.orderBy || 'id';
            this.options.orderBy = function (firstModel, secondModel) {
                if (this._isDescending) {
                    return firstModel[fieldName] > secondModel[fieldName];
                } else {
                    return firstModel[fieldName] < secondModel[fieldName];
                }
            }.bind(this);
        }


        /* If present in options.headerTemplate or options.placeholderTemplate, we build the header and placeholder elements. */
        this._addHeader();
        this._addPlaceholder();


        if (!this.options.itemTemplate) {
            console.log('DataBoundScrollView.options.itemTemplate must be set!');
            return this;
        }


        if (dataSource && this.options.dataSources) {
            throw new Error('Both the single dataSource and the multiple dataSources is set, please decide for one or the other');
        }
        if (this.options.dataSources) {
            this._bindMultipleDataSources(this.options.dataSources);
        } else if (dataSource) {

            this._bindDataSource(dataSource);
        }
    }

    /**
     * Gets a renderable from a specific ID
     *
     * @param {String} id The id of data
     * @param {Number} [dataSourceIndex] the index of the dataSource that is used, if several of them are specified
     */
    getRenderableFromID(id, dataSourceIndex = 0) {
        let data = this._findData(id, dataSourceIndex);
        if (data) {
            return data.renderable;
        }
    }

    /**
     * Set a template function, optionally re-renders all the dataSource' renderables
     * @param templateFunction
     */
    setItemTemplate(templateFunction = {}, reRender = false) {
        this.options.itemTemplate = templateFunction;

        if (reRender) {
            this.clearDataSource();
            this.reloadFilter(this.options.dataFilter);
        }
    }

    /**
     * Sets a group template function, optionally re-renders all the dataSource' renderables.
     * @param templateFunction
     * @param reRender
     */
    setGroupTemplate(templateFunction = {}, reRender = false) {
        this.options.groupTemplate = templateFunction;

        if (reRender) {
            this.clearDataSource();
            this.reloadFilter(this.options.dataFilter);
        }
    }

    /**
     * Sets the dataSource to use. This will repopulate the view and remove any (if present) old items.
     * We decorate it with debounce in order to (naively) avoid race conditions when setting the dataSource frequently after each other
     * @param dataSource
     */
    setdataSource(dataSource) {
        this.clearDataSource();
        this._bindDataSource(dataSource);
    }

    /**
     * Sets the multiple dataSources to use. The "multiple" version of setdataSource(dataSource).
     * @param {Array} dataSources
     */
    setDataSources(dataSources) {
        let { dataSource, dataSources: previousdataSources } = this.options;
        if (dataSource) {
            this.cleardataSource();
        } else if (previousdataSources) {
            for (let index in previousdataSources) {
                this.clearDataSource(index);
            }
        }

        this.options.dataSources = dataSources;
        this._bindMultipleDataSources(dataSources);

    }


    /**
     * Gets the currently set dataSource.
     * @returns {*}
     */
    getDataSource() {
        return this._singleDataSource;
    }


    /**
     * Gets the currently set dataSource.
     * @returns {*}
     */
    getDataSources() {
        return this.options.dataSources;
    }

    /**
     * Reloads the dataFilter option of the DataBoundScrollView, and verifies whether the items in the dataSource are allowed by the new filter.
     * It removes any currently visible items that aren't allowed anymore, and adds any non-visible ones that are allowed now.
     * @param {Function} [newFilter] New filter function to verify item visibility with.
     * @returns {Promise} Resolves when filter has been applied
     */
    reloadFilter(newFilter) {

        if (newFilter) {
            this.options.dataFilter = newFilter;
        }

        let filterPromises = [];
        if (this.options.dataSources) {
            for (let [dataSourceIndex, dataSource] of this.options.dataSources.entries() || []) {
                for (let entry of dataSource) {
                    filterPromises.push(this._reloadEntryFromFilter(entry, this.options.dataFilter, dataSourceIndex));
                }

            }
            return Promise.all(filterPromises);
        } else if (this._singleDataSource) {
            for (let entry of this._singleDataSource || []) {
                filterPromises.push(this._reloadEntryFromFilter(entry, this.options.dataFilter, 0));
            }
            return Promise.all(filterPromises);
        }
    }

    /**
     *
     * @param entry
     * @param newFilter
     * @param dataSourceIndex
     * @private
     */
    async _reloadEntryFromFilter(entry, newFilter, dataSourceIndex) {
        let alreadyExists = this._internalDataSource[`${entry.id}${dataSourceIndex}`] !== undefined;
        let result = await newFilter(entry);

        this._handleNewFilterResult(result, alreadyExists, entry, dataSourceIndex);
    }

    /**
     * Clears the dataSource by removing all entries
     */
    clearDataSource(index = 0) {
        /* Determine if there are multiple or single dataSource */
        let { dataSource, dataSources } = this.options;
        if (dataSource && !dataSource) {
            dataSource = dataSource[index];
        }
        for (let entry of dataSource || []) {
            this._removeItem(entry, index);
        }
    }

    /**
     * Determines whether the last element showing is the actual last element
     * @returns {boolean} True if the last element showing is the actual last element
     */
    isAtBottom() {
        let lastVisibleItem = this.getLastVisibleItem();
        return (lastVisibleItem && lastVisibleItem.renderNode === this._dataSource._.tail._value);
    }

    /**
     * Returns the currently active group elements, or an empty object of none are present.
     * @returns {Object}
     */
    getGroups() {
        return this._internalGroups || {};
    }

    /**
     *
     * @private
     */
    _addHeader() {
        if (this.options.headerTemplate) {
            this._header = this.options.headerTemplate();
            this._header.isHeader = true;
            this._insertId(0, 0, this._header, null, { isHeader: true }, 0);
            this.insert(0, this._header);
        }
    }

    /**
     * @private
     * Patch because Hein forgot to auto pipe events when replacing
     * @param indexOrId
     * @param renderable
     * @param noAnimation
     */
    _replace(indexOrId, renderable, noAnimation) {
        super.replace(indexOrId, renderable, noAnimation);
        // Auto pipe events
        if (this.options.autoPipeEvents && renderable && renderable.pipe) {
            renderable.pipe(this);
            renderable.pipe(this._eventOutput);
        }
    }

    /**
     *
     * @param shouldShow
     * @param alreadyExists
     * @param entry
     * @param dataSourceIndex
     * @private
     */
    _handleNewFilterResult(shouldShow, alreadyExists, entry, dataSourceIndex) {
        if (shouldShow) {
            /* This entry should be in the view, add it if it doesn't exist yet. */
            if (!alreadyExists) {
                this._addItem(entry, undefined, dataSourceIndex);
            }
        } else {
            /* This entry should not be in the view, remove if present. */
            if (alreadyExists) {
                this._removeItem(entry, dataSourceIndex);
            }
        }
    }

    /**
     *
     * @param groupId
     * @returns {*|number}
     * @private
     */
    _findGroup(groupId) {
        return this._internalGroups[groupId] || -1;
    }

    /**
     *
     * @param child
     * @returns {string}
     * @private
     */
    _getGroupByValue(child) {
        let groupByValue = '';
        if (typeof this.options.groupBy === 'function') {
            groupByValue = this.options.groupBy(child);
        } else if (typeof this.options.groupBy === 'string') {
            groupByValue = this.options.groupBy;
        }
        return groupByValue;
    }

    /**
     *
     * @param groupByValue
     * @param insertIndex
     * @returns {*|{}}
     * @private
     */
    _addGroupItem(groupByValue, insertIndex) {
        let { groupTemplate } = this.options;
        if (typeof groupTemplate !== 'function') {
            throw new Error('Cannot group items without specifying a group template (groupBy was specified)');
        }


        let newSurface = this._createNewRenderable(groupByValue, groupTemplate);

        newSurface.groupId = groupByValue;
        this._internalGroups[groupByValue] = { position: insertIndex, itemsCount: 0 };
        this.insert(insertIndex, newSurface);

        return newSurface
    }


    async _createNewRenderable(data, template) {
        let result = await template(data)
        if (result instanceof RenderablePrototype) {
            result = new result.type(result.options)
        }
        return result
    }

    /**
     *
     * @param child
     * @param previousSiblingID
     * @param dataSourceIndex
     * @returns {*|Number}
     * @private
     */
    _getInsertIndex(child, previousSiblingID, dataSourceIndex) {
        /* By default, add item at the end if the orderBy function does not specify otherwise. */
        let firstIndex = this._getZeroIndex();
        let insertIndex = this._dataSource.getLength();
        let placedWithinGroup = false;

        if (this._isGrouped) {
            let groupIndex;
            let groupId = this._getGroupByValue(child);
            let groupData = this._findGroup(groupId);
            if (groupData) groupIndex = groupData.position;
            if (groupIndex != undefined && groupIndex !== -1) {
                for (insertIndex = groupIndex + 1; insertIndex <= (groupIndex + groupData.itemsCount); insertIndex++) {
                    if (this.options.orderBy) {
                        let sequence = this._viewSequence.findByIndex(insertIndex);
                        if (!sequence) {
                            /* Internal error, this should never happen. Reduce the number of items in the group */
                            console.log('Internal error in DataBoundScrollView. Inconsistent groupData');
                            groupData.itemsCount = insertIndex - 1;
                            break;
                        }

                        let { dataId, dataSourceIndex } = sequence._value;
                        if (dataId && this.options.orderBy(child, this._internalDataSource[`${dataId}${dataSourceIndex}`].model)) {
                            break;
                        }
                    } else {
                        insertIndex += this._internalGroups[groupId].itemsCount;
                        break;
                    }
                }
                placedWithinGroup = true;
            }
        }

        if (!placedWithinGroup) {
            /* If we have an orderBy function, find the index we should be inserting at. */
            if ((this._useCustomOrdering && this.options.orderBy && typeof this.options.orderBy === 'function') || this._isGrouped) {
                let foundOrderedIndex = -1;
                if (this._isGrouped) {

                    for (let group of sortBy(this._internalGroups, 'position')) {
                        /* Check the first and last item of every group (they're sorted) */
                        for (let position of group.itemsCount > 1 ? [group.position + 1, group.position + group.itemsCount - 1] : [group.position + 1]) {

                            let { dataId, dataSourceIndex } = this._viewSequence.findByIndex(position)._value;

                            if (this.options.orderBy(child, this._internalDataSource[`${dataId}${dataSourceIndex}`].model)) {
                                foundOrderedIndex = group.position;
                                break;
                            }
                        }
                        if (foundOrderedIndex > -1) {
                            break;
                        }
                    }
                } else {
                    foundOrderedIndex = this._orderBy(child, this.options.orderBy);
                }

                if (foundOrderedIndex !== -1) {
                    insertIndex = foundOrderedIndex;
                }
                /*
                 There is no guarantee of order when grouping objects unless orderBy is explicitly defined
                 */
            } else if (previousSiblingID !== undefined && previousSiblingID != null) {
                /* We don't have an orderBy method, but do have a previousSiblingID we can use to find the correct insertion index. */
                let childData = this._findData(previousSiblingID) || {};

                let siblingIndex = childData.position || -1;
                if (siblingIndex !== -1) {
                    insertIndex = siblingIndex + 1;
                }
            }
        }

        return insertIndex;
    }

    /**
     *
     * @param insertIndex
     * @param groupByValue
     * @returns {*}
     * @private
     */
    _insertGroup(insertIndex, groupByValue) {
        let groupIndex = this._findGroup(groupByValue);
        if (groupByValue !== undefined) {
            let groupExists = groupIndex !== -1;
            if (!groupExists) {
                /* No group of this value exists yet, so we'll need to create one. */
                this._updatePosition(insertIndex, 1);
                let newSurface = this._addGroupItem(groupByValue, insertIndex);
                this._insertId(`group_${groupByValue}`, insertIndex, newSurface, {}, { groupId: groupByValue }, 0);
                /*insertIndex++;*/
            }
            return !groupExists;
        }
        return null;
    }


    /**
     *
     * @param child
     * @param previousSiblingID
     * @param dataSourceIndex
     * @private
     */
    async _addItem(child, previousSiblingID = undefined, dataSourceIndex) {

        if (this._findData(child.id, dataSourceIndex)) {
            console.log('Child already exists ', child.id);
            return;
        }
        /* Temporarily insert a promise to the internal dataSource, so that other subsequent functions detect that we are about
        *  to insert something. Because itemTemplates and dataFilter are (potentially) asynchronous, we must take care. */
        let onInsertIndexKnown;
        let insertIndexPromise = new Promise((resolve) => onInsertIndexKnown = resolve);
        this._insertId(child.id, insertIndexPromise, null, child, {}, dataSourceIndex, null);

        this._removePlaceholder();

        let newSurface = await this._createNewRenderable(child, this.options.itemTemplate);

        /* If the entry was removed while trying to add it, we should abort here */
        if(this._removedEntries[`${child.id}${dataSourceIndex}`]){
            onInsertIndexKnown(-1);
            delete this._internalDataSource[`${child.id}${dataSourceIndex}`];
        }

        let insertIndex = this._getInsertIndex(child, previousSiblingID, dataSourceIndex);


        /* If we're using groups, check if we need to insert a group item before this child. */
        let groupByValue;
        if (this._isGrouped) {
            groupByValue = this._getGroupByValue(child);

            if (this._insertGroup(insertIndex, groupByValue)) {
                /* If a new group is inserted, then increase the insert index */
                insertIndex++;
            }
            /* Increase the count of the number of items in the group */
            this._internalGroups[groupByValue].itemsCount++;
        }
        newSurface.dataId = child.id;
        onInsertIndexKnown(insertIndex);

        newSurface.dataSourceIndex = dataSourceIndex;
        this._subscribeToClicks(newSurface, child);
        /* If we're scrolling as with a chat window, then scroll to last child if we're at the bottom */

        if (this.options.chatScrolling && insertIndex === this._dataSource.getLength()) {
            if (this.isAtBottom() || !this._allChildrenAdded) {
                this._lastChild = child;
            }
        }
        let insertSpec;
        if (this.options.customInsertSpec) {
            insertSpec = this.options.customInsertSpec(child);
        }
        this.insert(insertIndex, newSurface, insertSpec);


        this._updatePosition(insertIndex);
        this._insertId(child.id, insertIndex, newSurface, child, {}, dataSourceIndex, groupByValue);


        if (this.options.ensureVisible != null || this.options.chatScrolling) {
            let shouldEnsureVisibleUndefined = this.options.ensureVisible == null;
            let shouldEnsureVisible = !shouldEnsureVisibleUndefined ? this.options.ensureVisible(child, newSurface, insertIndex) : false;
            if (this.options.chatScrolling) {
                if (child === this._lastChild && (shouldEnsureVisible || shouldEnsureVisibleUndefined)) {
                    this.ensureVisible(newSurface);
                }
            } else if (shouldEnsureVisible) {
                this.ensureVisible(newSurface);
            }
        }

        super._addItem(child, previousSiblingID);
    }

    /**
     *
     * @param child
     * @param dataSourceIndex
     * @private
     */
    async _replaceItem(child, dataSourceIndex) {

        let data = this._findData(child.id, dataSourceIndex);

        if (!data) {
            Utils.warn(`Child with ID ${child.id} is not present (anymore) in dataSource with index ${dataSourceIndex}`);
            return false;
        }

        let { position, groupValue } = data;
        let newGroupValue = null;

        if (this._isGrouped) {
            newGroupValue = this._getGroupByValue(child);
        }

        if (newGroupValue !== groupValue) {
            this._removeItem(child, dataSourceIndex, groupValue);
            this._addItem(child, undefined, dataSourceIndex);
        } else {
            let newSurface = await this.options.itemTemplate(child);
            newSurface.dataId = child.id;
            newSurface.dataSourceIndex = dataSourceIndex;
            this._subscribeToClicks(newSurface, child);
            this._insertId(child.id, position, newSurface, child, {}, dataSourceIndex);
            this._replace(position, newSurface, true);
        }

    }

    /**
     *
     * @param groupByValue
     * @private
     */
    _removeGroupIfNecessary(groupByValue) {
        /* Check if the group corresponding to the child is now empty */
        let group = this._internalGroups[groupByValue];
        if (group && group.itemsCount === 0) {
            /* TODO: Maybe remove internalGroups[groupByValue]? (Or not?) */
            let { position } = group;
            this._updatePosition(position, -1);
            this.remove(position);
            delete this._internalGroups[groupByValue];
            delete this._internalDataSource[groupByValue];
        }

    }

    /**
     *
     * @param child
     * @param dataSourceIndex
     * @private
     */
    _removeItem(child, dataSourceIndex, groupValue = null) {
        let internalChild = this._internalDataSource[`${child.id}${dataSourceIndex}`] || {};
        let index = internalChild.position;
        if (index > -1) {
            this._updatePosition(index, -1);
            this.remove(index);
            delete this._internalDataSource[`${child.id}${dataSourceIndex}`];
        }

        /* If we're using groups, check if we need to remove the group that this child belonged to. */
        if (this._isGrouped) {
            let groupByValue = groupValue || this._getGroupByValue(child);
            let group = this._internalGroups[groupByValue];
            if (group) {
                group.itemsCount--;
            }


            this._removeGroupIfNecessary(groupByValue, dataSourceIndex);

        }

        /* The amount of items in the dataSource is subtracted with a header if present, to get the total amount of actual items in the scrollView. */
        let itemCount = this._dataSource.getLength() - (this._getZeroIndex());
        if (itemCount === 0) {
            this._addPlaceholder();
        }
        super._removeItem(child, dataSourceIndex);
    }

    /**
     *
     * @param child
     * @param prevChildId
     * @param dataSourceIndex
     * @private
     */
    _moveItem(child, prevChildId = null, dataSourceIndex) {
        let oldData = this._findData(child.id, dataSourceIndex);
        let oldIndex = oldData && oldData.position;
        let previousSiblingIndex = this._getNextVisibleIndex(prevChildId, dataSourceIndex);
        if (oldIndex !== undefined && oldIndex !== previousSiblingIndex) {
            this.move(oldIndex, previousSiblingIndex);
            this._internalDataSource[`${previousSiblingIndex}${dataSourceIndex}`] = oldData;
            this._internalDataSource[`${previousSiblingIndex}${dataSourceIndex}`].position = oldIndex;
        }
    }

    /**
     *
     * @private
     */
    _removeHeader() {
        if (this._header) {
            this.remove(0);
            delete this._internalDataSource[0];
            this._header = null;
        }
    }

    /**
     *
     * @private
     */
    _addPlaceholder() {
        if (this.options.placeholderTemplate && !this._placeholder) {
            let insertIndex = this._getZeroIndex();
            this._placeholder = this.options.placeholderTemplate();
            this._placeholder.isPlaceholder = true;
            this.insert(insertIndex, this._placeholder);
        }
    }

    /**
     *
     * @returns {number}
     * @private
     */
    _getZeroIndex() {
        return this._header ? 1 : 0;
    }

    /**
     *
     * @private
     */
    _removePlaceholder() {
        if (this._placeholder) {
            if (this._placeholder)
                this.remove(this._getZeroIndex());
            this._placeholder = null;
        }
    }

    /**
     *
     * @param dataSources
     * @private
     */
    _bindMultipleDataSources(dataSources) {
        for (let [index, dataSource] of dataSources.entries()) {
            this._bindDataSource(dataSource, index);
        }
    }

    /**
     *
     * @param dataSource
     * @param index
     * @private
     */
    _bindDataSource(dataSource, index = 0) {
        this._singleDataSource = dataSource;
        if (this.options.chatScrolling) {
            //TODO: This won't work with multiple dataSources
            dataSource.on('ready', () => this._allChildrenAdded = true);
            this._initialLoad = true;
            dataSource.on('ready', () => this._initialLoad = false);
        }
        this._setupDataSourceListeners(dataSource, index, true);
    }

    /**
     *
     * @param dataSourceIndex
     * @param child
     * @param previousSiblingID
     * @private
     */
    _onChildAdded(dataSourceIndex, child, previousSiblingID) {
        if(!child){
            console.log('Warning: Child added received with undefined child, in DataBoundScrollView');
        }
        /* Mark the entry as undeleted */
        this._removedEntries[`${child.id}${dataSourceIndex}`] = false;
        this._throttler.add(async () => {
            if (this.options.dataFilter &&
                (typeof this.options.dataFilter === 'function')) {

                let result = await this.options.dataFilter(child);

                if (result) {
                    await this._addItem(child, previousSiblingID, dataSourceIndex);
                }
            } else {
                /* There is no dataFilter method, so we can add this child. */
                await this._addItem(child, previousSiblingID, dataSourceIndex);
            }
        });
    }

    /**
     *
     * @param dataSourceIndex
     * @param child
     * @param previousSiblingID
     * @private
     */
    //TODO: This won't reorder children, which is a problem
    async _onChildChanged(dataSourceIndex, child, previousSiblingID) {

        this._throttler.add(async () => {
            let changedItemIndex = await this._findIndexFromID(dataSourceIndex, child.id);

            if (this._dataSource && changedItemIndex < this._dataSource.getLength()) {

                let result = this.options.dataFilter ? await this.options.dataFilter(child) : true;
                changedItemIndex = await this._findIndexFromID(dataSourceIndex, child.id);

                if (this.options.dataFilter &&
                    typeof this.options.dataFilter === 'function' && !result) {
                    this._removeItem(child, dataSourceIndex);
                } else {
                    /* If the entry was removed in the meantime, return */
                    if(this._removedEntries[`${child.id}${dataSourceIndex}`]){
                        return;
                    }

                    if (changedItemIndex === -1) {
                        await this._addItem(child, previousSiblingID, dataSourceIndex);
                    } else {
                        await this._replaceItem(child, dataSourceIndex);
                    }
                }
            }
        });
    }

    /**
     *
     * @param {Number} dataSourceIndex The index of the data source that is being modified
     * @param child
     * @param previousSiblingID
     * @private
     */
    _onChildMoved(dataSourceIndex, child, previousSiblingID) {
        let current = this._findData(child.id, dataSourceIndex);
        this._throttler.add(() => {
            this._moveItem(current, previousSiblingID, dataSourceIndex);
        });
    }


    /**
     *
     * @param dataSourceIndex
     * @param child
     * @private
     */
    _onChildRemoved(dataSourceIndex, child) {

        /* Mark the entry as removed */
        this._removedEntries[`${child.id}${dataSourceIndex}`] = true;
        this._throttler.add(() => {
            this._removeItem(child, dataSourceIndex);
        });
    }
    ;


    /**
     *
     * @param id
     * @param dataSourceIndex
     * @returns {*}
     * @private
     */
    _getNextVisibleIndex(id, dataSourceIndex) {
        let viewIndex = -1;
        let viewData = this._findData(dataSourceIndex, id);

        if (viewData) {
            viewIndex = viewData.position;
        }

        if (viewIndex === -1) {

            let modelIndex = findIndex(this._singleDataSource, function (model) {
                return model.id === id;
            });

            if (modelIndex === 0 || modelIndex === -1) {
                return this._isDescending ? this._dataSource ? this._dataSource.getLength() - 1 : 0 : 0;
            } else {
                let nextModel = this._singleDataSource[this._isDescending ? modelIndex + 1 : modelIndex - 1];
                let nextIndex = this._findData(nextModel.id, nextModel.dataSourceIndex).position;
                if (nextIndex > -1) {
                    return this._isDescending ? nextIndex === 0 ? 0 : nextIndex - 1 :
                        this._dataSource.getLength() === nextIndex + 1 ? nextIndex : nextIndex + 1;
                } else {
                    return this._getNextVisibleIndex(nextModel.id, dataSourceIndex);
                }
            }
        } else {
            return this._isDescending ? viewIndex === 0 ? 0 : viewIndex - 1 :
                this._dataSource.getLength() === viewIndex + 1 ? viewIndex : viewIndex + 1;
        }
    }

    /**
     *
     * @param child
     * @param orderByFunction
     * @returns {number}
     * @private
     */
    _orderBy(child, orderByFunction) {
        let item = this._dataSource._.head;
        let index = 0;

        while (item) {
            let { dataId, dataSourceIndex } = item._value;
            if (item._value.dataId && this._internalDataSource[`${dataId}${dataSourceIndex}`] && orderByFunction(child, this._internalDataSource[`${dataId}${dataSourceIndex}`].model)) {
                return index;
            }

            index++;
            item = item._next;
        }
        return -1;
    }


    /**
     *
     * @param position
     * @param change
     * @private
     */
    _updatePosition(position, change = 1) {
        if (position === undefined || position === this._dataSource.getLength() - 1) return;
        for (let element of Object.keys(this._internalDataSource)) {
            let dataObject = this._internalDataSource[element];
            if (dataObject.position >= position) {
                dataObject.position += change;
            }
        }
        if (this._isGrouped) {
            this._updateGroupPosition(position, change);
        }
    }

    /**
     *
     * @param position
     * @param change
     * @private
     */
    _updateGroupPosition(position, change = 1) {
        for (let element of Object.keys(this._internalGroups)) {
            if (this._internalGroups[element].position >= position) {
                /* Update the position of groups coming after */
                this._internalGroups[element].position += change;
            }
        }
    }

    /**
     *
     * @param id
     * @param dataSourceIndex
     * @returns {*|undefined}
     * @private
     */
    _findData(id, dataSourceIndex) {
        let data = this._internalDataSource[`${id}${dataSourceIndex}`] || undefined;
        return data;
    }

    /**
     *
     * @param id
     * @param position
     * @param renderable
     * @param model
     * @param options
     * @param dataSourceIndex
     * @private
     */
    _insertId(id = null, position, renderable = {}, model = {}, options = {}, dataSourceIndex, groupValue = null) {
        if (id === undefined || id === null) return;

        this._internalDataSource[`${id}${dataSourceIndex}`] = { position, renderable, model, groupValue };
        for (let element of Object.keys(options)) {
            this._internalDataSource[`${id}${dataSourceIndex}`][element] = options[element];
        }
    }

    /**
     *
     * @param surface
     * @param model
     * @private
     */
    _subscribeToClicks(surface, model) {
        surface.on('click', function () {
            this._eventOutput.emit('child_click', { renderNode: surface, dataObject: model });
        }.bind(this));
    }

    /**
     * Based on the guess that layout is ListLayout, calculates the vertical size
     * @returns {number}
     */
    getSize() {
        let item = this._dataSource._.head;
        let { layoutOptions } = this.options;
        if (this.options.layout !== ListLayout || (this.options.layoutOptions.direction && this.options.layoutOptions.direction !== 1)) {
            console.log('\'Trying to calculate the size of a DataBoundScrollView, which can\'t be done in the current configuration');
            return [undefined, undefined];
        }
        let height = layoutOptions && layoutOptions.margins ? layoutOptions.margins[0] + layoutOptions.margins[2] : 0;

        if (item) {
            do {
                let renderable = item._value;
                let itemSize;
                if (renderable.getSize && (itemSize = renderable.getSize())) {
                    height += itemSize[1];
                } else {
                    console.log('Trying to calculate the size of a DataBoundScrollView, but all elements cannot be calculated');
                }
                if (layoutOptions && layoutOptions.spacing) {
                    height += layoutOptions.spacing;
                }

            } while (item = item._next);
        }

        return [undefined, height];
    }


    /**
     * Either add or remove the prioritisedArray events to our event handlers.
     * The event handlers are cached, so they can be removed later on if needed.
     * @param dataSource
     * @param index
     * @param {Boolean} shouldActivate
     * @private
     */
    _setupDataSourceListeners(dataSource, index, shouldActivate) {
        let methodName = shouldActivate ? 'on' : 'off';
        let method = dataSource[methodName].bind(dataSource);

        /* We have to cache the event handler functions, otherwise we can't remove them later on if needed */
        if(shouldActivate){
            /* To support multiple dataSources with multiple indices */
            if(!this._eventCallbacks[index]){
                this._eventCallbacks[index] = {};
            }
            /* On the initial load, await all data to arrive and then sort it */
            let initialDataIsSorted = !this.options.orderBy;
            if(!initialDataIsSorted){
                dataSource.once('value').then((data) => {
                    let prevSiblingID;
                    let sortedData = data.sort ? data.sort((first, second) => this.options.orderBy(first, second) ? -1 : 1) : data;
                    for(let item of sortedData){
                        this._onChildAdded(index, item, prevSiblingID);
                        prevSiblingID = item.id;
                    }
                    initialDataIsSorted = true;
                });
            }
            this._eventCallbacks[index]['child_added'] = (child, prevID) => initialDataIsSorted && this._onChildAdded(index, child, prevID);
            this._eventCallbacks[index]['child_changed'] = this._onChildChanged.bind(this, index);
            this._eventCallbacks[index]['child_removed'] = this._onChildRemoved.bind(this, index);
            this._eventCallbacks[index]['child_moved'] = this._onChildMoved.bind(this, 0);
        }

        method('child_added',  this._eventCallbacks[index]['child_added']);
        method('child_changed', this._eventCallbacks[index]['child_changed']);
        method('child_removed',  this._eventCallbacks[index]['child_removed']);

        /* Only listen for child_moved if there is one single dataSource.
         * TODO: See if we want to change this behaviour to support moved children within the dataSource */
        if (!this.options.dataSources) {
            method('child_moved',  this._eventCallbacks[index]['child_moved']);
        }
    }

    _findIndexFromID(dataSourceIndex, id) {
        let internalDataSourceData = this._findData(id, dataSourceIndex) || { position: -1 };
        return internalDataSourceData.position;
    }
}
