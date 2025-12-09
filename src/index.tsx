import Vue from 'vue';
import Item from './item';
import { VirtualProps } from './props';
import {
  getDataKey,
  isEqual,
  throttle,
  SortableAttrs,
  VirtualAttrs,
  VirtualSortable,
  type DragEvent,
  type DropEvent,
  type Range,
  type ScrollEvent,
} from './core';

let draggingItem: any;

const VirtualList = Vue.component('virtual-list', {
  model: {
    prop: 'dataSource',
    event: 'updateDataSource',
  },
  props: VirtualProps,
  data() {
    return {
      VS: null,
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
    vsAttributes() {
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
    vsAttributes: {
      handler(newVal, oldVal) {
        if (!this.VS) return;

        for (let key in newVal) {
          if (newVal[key] != oldVal[key]) {
            this.VS.option(key, newVal[key]);
          }
        }
      },
    },
  },

  activated() {
    // set back offset when awake from keep-alive
    this.scrollToOffset(this.VS.virtual.offset);

    this.VS.call('addScrollEventListener');
  },

  deactivated() {
    this.VS.call('removeScrollEventListener');
  },

  created() {
    this.range.end = this.keeps - 1;
    this._onDataSourceChange();
  },

  mounted() {
    this._initVirtualSortable();
  },

  beforeDestroy() {
    this.VS.destroy();
  },

  methods: {
    /**
     * Git item size by data-key
     */
    getSize(key: any) {
      return this.VS.call('getSize', key);
    },

    /**
     * Get the current scroll height
     */
    getOffset() {
      return this.VS.call('getOffset');
    },

    /**
     * Get client viewport size
     */
    getClientSize() {
      return this.VS.call('getClientSize');
    },

    /**
     * Get all scroll size
     */
    getScrollSize() {
      return this.VS.call('getScrollSize');
    },

    /**
     * Scroll to the specified data-key
     */
    scrollToKey(key: any, align?: 'top' | 'bottom' | 'auto') {
      const index = this.uniqueKeys.indexOf(key);
      if (index > -1) {
        this.VS.call('scrollToIndex', index, align);
      }
    },

    /**
     * Scroll to the specified index position
     */
    scrollToIndex(index: number, align?: 'top' | 'bottom' | 'auto') {
      this.VS.call('scrollToIndex', index, align);
    },

    /**
     * Scroll to the specified offset
     */
    scrollToOffset(offset: number) {
      this.VS.call('scrollToOffset', offset);
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
      this.VS.call('scrollToBottom');
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

    _updateUniqueKeys() {
      this.uniqueKeys = this.dataSource.map((item) => getDataKey(item, this.dataKey));
      this.VS?.option('uniqueKeys', this.uniqueKeys);
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
        this.VS?.call('isReachedBottom')
      ) {
        newRange.start++;
      }
      this.VS?.call('updateRange', newRange);
    },

    _handleToTop: throttle(function () {
      this.listLengthWhenTopLoading = this.dataSource.length;
      this.$emit('top');
    }, 50),

    _handleToBottom: throttle(function () {
      this.$emit('bottom');
    }, 50),

    _onScroll(event: ScrollEvent) {
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
      if (isEqual(key, this.dragging) || !this.VS) {
        return;
      }

      const sizes = this.VS.virtual.sizes.size;
      this.VS.call('updateItemSize', key, size);

      if (sizes === this.keeps - 1 && this.dataSource.length > this.keeps) {
        this.VS.call('updateRange', this.range);
      }
    },

    _onDrag(event: DragEvent<any>) {
      const { key, index } = event;
      const item = this.dataSource[index];

      draggingItem = item;
      this.dragging = key;

      if (!this.sortable) {
        this.VS.call('enableScroll', false);
        this.VS.option('autoScroll', false);
      }
      this.$emit('drag', { ...event, item });
    },

    _onDrop(event: DropEvent<any>) {
      const item = draggingItem;
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

      this.VS.call('enableScroll', true);
      this.VS.option('autoScroll', this.autoScroll);

      this.dragging = '';

      if (event.changed) {
        this.$emit('updateDataSource', newList);
      }
      this.$emit('drop', { ...event, item, list: newList, oldList });
    },

    _initVirtualSortable() {
      this.VS = new VirtualSortable(this.$refs.rootElRef, {
        ...this.vsAttributes,
        buffer: Math.round(this.keeps / 3),
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
        const record = this.dataSource[index];
        if (record) {
          const dataKey = getDataKey(record, this.dataKey);
          const isDragging = isEqual(dataKey, this.dragging);

          renders.push(
            this.$scopedSlots.item
              ? h(
                  Item,
                  {
                    key: dataKey,
                    attrs: {
                      role: 'item',
                      'data-key': dataKey,
                    },
                    props: {
                      dataKey,
                      horizontal: this.isHorizontal,
                    },
                    on: {
                      resized: this._onItemResized,
                    },
                    style: isDragging ? { display: 'none' } : {},
                  },
                  this.$scopedSlots.item({ record, index, dataKey })
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
