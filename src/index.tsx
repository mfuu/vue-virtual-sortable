import Vue from 'vue';
import Item from './item';
import Sortable from 'sortable-dnd';
import { VirtualListProps } from './props';
import {
  CoreService,
  getDataKey,
  isEqual,
  throttle,
  SortableAttrs,
  VirtualAttrs,
  type DragEvent,
  type DropEvent,
  type Range,
  type ScrollEvent,
} from './core';

const VirtualList = Vue.component('virtual-list', {
  model: {
    prop: 'dataSource',
    event: 'updateDataSource',
  },
  props: VirtualListProps,
  data() {
    return {
      core: null,
      range: { start: 0, end: 0, front: 0, behind: 0 },
      dragging: '',
      uniqueKeys: [],
      lastListLength: null,
      listLengthWhenTopLoading: null,
    };
  },

  computed: {
    isHorizontal() {
      return this.direction !== 'vertical';
    },
    coreAttributes() {
      return [...VirtualAttrs, ...SortableAttrs].reduce((res, key) => {
        res[key] = this[key];
        return res;
      }, {});
    },
  },

  watch: {
    dataSource: {
      handler() {
        this._onDataSourceChange();
      },
      deep: true,
    },
    coreAttributes: {
      handler(newVal, oldVal) {
        if (!this.core) return;

        for (let key in newVal) {
          if (newVal[key] != oldVal[key]) {
            this.core.option(key, newVal[key]);
          }
        }
      },
    },
  },

  activated() {
    // set back offset when awake from keep-alive
    this.scrollToOffset(this.core.virtual.offset);

    this.core.virtual.addScrollEventListener();
  },

  deactivated() {
    this.core.virtual.removeScrollEventListener();
  },

  created() {
    this.range.end = this.keeps - 1;
    this._onDataSourceChange();
  },

  mounted() {
    this._initCoreService();
  },

  beforeDestroy() {
    this.core.destroy();
  },

  methods: {
    /**
     * Git item size by data-key
     */
    getSize(key: any) {
      return this.core.virtual.getSize(key);
    },

    /**
     * Get the current scroll height
     */
    getOffset() {
      return this.core.virtual.getOffset();
    },

    /**
     * Get client viewport size
     */
    getClientSize() {
      return this.core.virtual.getClientSize();
    },

    /**
     * Get all scroll size
     */
    getScrollSize() {
      return this.core.virtual.getScrollSize();
    },

    /**
     * Scroll to the specified data-key
     */
    scrollToKey(key: any, align?: 'top' | 'bottom' | 'auto') {
      const index = this.uniqueKeys.indexOf(key);
      if (index > -1) {
        this.core.virtual.scrollToIndex(index, align);
      }
    },

    /**
     * Scroll to the specified index position
     */
    scrollToIndex(index: number, align?: 'top' | 'bottom' | 'auto') {
      this.core.virtual.scrollToIndex(index, align);
    },

    /**
     * Scroll to the specified offset
     */
    scrollToOffset(offset: number) {
      this.core.virtual.scrollToOffset(offset);
    },

    /**
     * Scroll to top of list
     */
    scrollToTop() {
      this.scrollToOffset(0);
    },

    /**
     * Scroll to bottom of list
     */
    scrollToBottom() {
      this.core.virtual.scrollToBottom();
    },

    _onDataSourceChange() {
      this._updateUniqueKeys();
      this._detectRangeChange(this.lastListLength, this.dataSource.length);

      // top loading: auto scroll to the last offset
      if (this.listLengthWhenTopLoading && this.keepOffset) {
        const index = this.dataSource.length - this.listLengthWhenTopLoading;
        if (index > 0) {
          this.scrollToIndex(index);
        }
        this.listLengthWhenTopLoading = null;
      }

      this.lastListLength = this.dataSource.length;
    },

    _getItemKey(item: any) {
      if (typeof this.dataKey === 'function') {
        return this.dataKey(item);
      }

      return getDataKey(item, this.dataKey);
    },

    _updateUniqueKeys() {
      const len = this.dataSource.length;
      const keys = new Array(len);

      for (let i = 0; i < len; i++) {
        keys[i] = this._getItemKey(this.dataSource[i]);
      }

      this.uniqueKeys = keys;
      this.core?.option('uniqueKeys', this.uniqueKeys);
    },

    _detectRangeChange(oldListLength: number, newListLength: number) {
      if (!oldListLength && !newListLength) {
        return;
      }

      if (oldListLength === newListLength) {
        return;
      }

      let newRange = { ...this.range };
      if (
        oldListLength > this.keeps &&
        newListLength > oldListLength &&
        this.range.end === oldListLength - 1 &&
        this.core?.virtual.isReachedBottom()
      ) {
        newRange.start++;
      }
      this.core?.virtual.updateRange(newRange);
    },

    _handleToTop: throttle(function () {
      this.listLengthWhenTopLoading = this.dataSource.length;
      this.$emit('top');
    }, 50),

    _handleToBottom: throttle(function () {
      this.$emit('bottom');
    }, 50),

    _onScroll(event: ScrollEvent) {
      this.$emit('scroll', event);

      this.listLengthWhenTopLoading = 0;
      if (!!this.dataSource.length && event.top) {
        this._handleToTop();
      } else if (event.bottom) {
        this._handleToBottom();
      }
    },

    _onUpdate(range: Range, changed: boolean) {
      this.range = range;

      changed && this.$emit('rangeChange', range);
    },

    _onItemResized(key: any, size: number) {
      if (isEqual(key, this.dragging) || !this.core) {
        return;
      }

      const sizes = this.core.virtual.sizes.size;
      this.core.virtual.updateItemSize(key, size);

      if (sizes === this.keeps - 1 && this.dataSource.length > this.keeps) {
        this.core.virtual.updateRange(this.range);
      }
    },

    _onDrag(event: DragEvent<any>) {
      const { key, index } = event;
      const item = this.dataSource[index];

      Sortable.store.draggingItem = item;
      this.dragging = key;

      this.$emit('drag', { ...event, item });
    },

    _onDrop(event: DropEvent<any>) {
      const item = Sortable.store.draggingItem;
      const { oldIndex, newIndex } = event;

      const oldList = [...this.dataSource];
      const newList = [...this.dataSource];

      if (oldIndex === -1) {
        newList.splice(newIndex, 0, item);
      } else if (newIndex === -1) {
        newList.splice(oldIndex, 1);
      } else {
        newList.splice(oldIndex, 1);
        newList.splice(newIndex, 0, item);
      }

      this.dragging = '';

      if (event.changed) {
        this.$emit('updateDataSource', newList);
      }
      this.$emit('drop', { ...event, item, list: newList, oldList });
    },

    _initCoreService() {
      this.core = new CoreService(this.$refs.rootElRef, {
        ...this.coreAttributes,
        wrapper: this.$refs.wrapElRef,
        scroller: this.scroller || this.$refs.rootElRef,
        uniqueKeys: this.uniqueKeys,
        ghostContainer: this.$refs.wrapElRef,
        onDrag: (event) => this._onDrag(event),
        onDrop: (event) => this._onDrop(event),
        onScroll: (event) => this._onScroll(event),
        onUpdate: (range, changed) => this._onUpdate(range, changed),
      });
    },

    _renderSpacer(h: Vue.CreateElement, offset: number) {
      if (this.tableMode) {
        const offsetKey = this.isHorizontal ? 'width' : 'height';
        const tdStyle = { padding: 0, border: 0, [offsetKey]: `${offset}px` };

        return h('tr', {}, [h('td', { style: tdStyle })]);
      }
      return null;
    },

    _renderItems(h: Vue.CreateElement) {
      const renders: any[] = [];
      const { start, end, front, behind } = this.range;

      renders.push(this._renderSpacer(h, front));

      for (let index = start; index <= end; index++) {
        const item = this.dataSource[index];
        if (item) {
          const key = this._getItemKey(item);
          const isDragging = isEqual(key, this.dragging);

          renders.push(
            this.$scopedSlots.item
              ? h(
                  Item,
                  {
                    key: key,
                    attrs: {
                      role: 'item',
                      'data-key': key,
                    },
                    props: {
                      itemKey: key,
                      horizontal: this.isHorizontal,
                    },
                    on: {
                      resized: this._onItemResized,
                    },
                    style: isDragging ? { display: 'none' } : {},
                  },
                  this.$scopedSlots.item({ item, index, key })
                )
              : null
          );
        }
      }

      renders.push(this._renderSpacer(h, behind));

      return renders;
    },
  },

  render(h) {
    const { front, behind } = this.range;
    const { tableMode, isHorizontal, rootTag, wrapTag } = this;
    const padding = isHorizontal ? `0px ${behind}px 0px ${front}px` : `${front}px 0px ${behind}px`;
    const overflow = isHorizontal ? 'auto hidden' : 'hidden auto';

    const rootElTag = tableMode ? 'table' : rootTag;
    const wrapElTag = tableMode ? 'tbody' : wrapTag;

    return h(
      rootElTag,
      {
        ref: 'rootElRef',
        style: !this.scroller && !tableMode ? { overflow } : {},
      },
      [
        this.$slots.header,

        h(
          wrapElTag,
          {
            ref: 'wrapElRef',
            class: this.wrapClass,
            style: { ...this.wrapStyle, padding: !tableMode && padding },
          },
          this._renderItems(h)
        ),

        this.$slots.footer,
      ]
    );
  },
});

export default VirtualList;
