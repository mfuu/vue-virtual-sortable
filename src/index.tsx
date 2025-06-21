import Vue from 'vue';
import Item from './item';
import { VirtualProps } from './props';
import {
  Virtual,
  Sortable,
  throttle,
  getDataKey,
  isSameValue,
  VirtualAttrs,
  SortableAttrs,
} from './core';

const VirtualList = Vue.component('virtual-list', {
  model: {
    prop: 'dataSource',
    event: 'updateDataSource',
  },
  props: VirtualProps,
  data() {
    return {
      range: { start: 0, end: 0, front: 0, behind: 0 },
      chosenKey: '',
      dragging: false,
      lastList: [],
      lastLength: null,
      uniqueKeys: [],
      virtualRef: null,
      sortableRef: null,
    };
  },

  computed: {
    isHorizontal() {
      return this.direction !== 'vertical';
    },
    itemSizeKey() {
      return this.isHorizontal ? 'offsetWidth' : 'offsetHeight';
    },
    virtualAttributes() {
      return VirtualAttrs.reduce((res, key) => {
        res[key] = this[key];
        return res;
      }, {});
    },
    sortableAttributes() {
      return SortableAttrs.reduce((res, key) => {
        res[key] = this[key];
        return res;
      }, {});
    },
  },

  watch: {
    dataSource: {
      handler() {
        this._onUpdate();
      },
      deep: true,
    },
    virtualAttributes: {
      handler(newVal, oldVal) {
        if (!this.virtualRef) return;
        for (let key in newVal) {
          if (newVal[key] != oldVal[key]) {
            this.virtualRef.option(key, newVal[key]);
          }
        }
      },
    },
    sortableAttributes: {
      handler(newVal, oldVal) {
        if (!this.sortableRef) return;
        for (let key in newVal) {
          if (newVal[key] != oldVal[key]) {
            this.sortableRef.option(key, newVal[key]);
          }
        }
      },
    },
  },

  activated() {
    // set back offset when awake from keep-alive
    this.scrollToOffset(this.virtualRef.offset);

    this.virtualRef.addScrollEventListener();
  },

  deactivated() {
    this.virtualRef.removeScrollEventListener();
  },

  created() {
    this.range.end = this.keeps - 1;
    this._onUpdate();
  },

  mounted() {
    this._installVirtual();
    this._installSortable();
  },

  beforeDestroy() {
    this.sortableRef?.destroy();
    this.virtualRef?.removeScrollEventListener();
  },

  methods: {
    /**
     * Git item size by data-key
     */
    getSize(key: any) {
      return this.virtualRef.getSize(key);
    },

    /**
     * Get the current scroll height
     */
    getOffset() {
      return this.virtualRef.getOffset();
    },

    /**
     * Get client viewport size
     */
    getClientSize() {
      return this.virtualRef.getClientSize();
    },

    /**
     * Get all scroll size
     */
    getScrollSize() {
      return this.virtualRef.getScrollSize();
    },

    /**
     * Scroll to the specified data-key
     */
    scrollToKey(key: any) {
      const index = this.uniqueKeys.indexOf(key);
      if (index > -1) {
        this.virtualRef.scrollToIndex(index);
      }
    },

    /**
     * Scroll to the specified index position
     */
    scrollToIndex(index: number) {
      this.virtualRef.scrollToIndex(index);
    },

    /**
     * Scroll to the specified offset
     */
    scrollToOffset(offset: number) {
      this.virtualRef.scrollToOffset(offset);
    },

    /**
     * Scroll to top of list
     */
    scrollToTop() {
      this.virtualRef.scrollToOffset(0);
    },

    /**
     * Scroll to bottom of list
     */
    scrollToBottom() {
      this.virtualRef.scrollToBottom();
    },

    _onUpdate() {
      this._updateUniqueKeys();
      this._updateRange(this.lastList, this.dataSource);

      this.sortableRef?.option('list', this.dataSource);

      // top loading: auto scroll to the last offset
      if (this.lastLength && this.keepOffset) {
        const index = this.dataSource.length - this.lastLength;
        if (index > 0) {
          this.scrollToIndex(index);
        }
        this.lastLength = null;
      }

      this.lastList = [...this.dataSource];
    },

    _updateUniqueKeys() {
      this.uniqueKeys = this.dataSource.map((item) => getDataKey(item, this.dataKey));
      this.virtualRef?.option('uniqueKeys', this.uniqueKeys);
      this.sortableRef?.option('uniqueKeys', this.uniqueKeys);
    },

    _updateRange(oldList: any[], newList: any[]) {
      if (!oldList.length && !newList.length) {
        return;
      }

      if (oldList.length === newList.length) {
        return;
      }

      let range = { ...this.range };
      if (
        oldList.length > this.keeps &&
        newList.length > oldList.length &&
        this.range.end === oldList.length - 1 &&
        this._scrolledToBottom()
      ) {
        range.start++;
      }
      this.virtualRef?.updateRange(range);
    },

    _scrolledToBottom() {
      const offset = this.getOffset();
      const clientSize = this.getClientSize();
      const scrollSize = this.getScrollSize();
      return offset + clientSize + 1 >= scrollSize;
    },

    // virtual init
    _installVirtual() {
      this.virtualRef = new Virtual({
        ...this.virtualAttributes,
        buffer: Math.round(this.keeps / 3),
        wrapper: this.$refs.wrapRef,
        scroller: this.scroller || this.$refs.rootRef,
        uniqueKeys: this.uniqueKeys,
        onScroll: (event) => {
          this.lastLength = null;
          if (!!this.dataSource.length && event.top) {
            this._handleToTop();
          } else if (event.bottom) {
            this._handleToBottom();
          }
        },
        onUpdate: (range) => {
          const rangeChanged = range.start !== this.range.start;
          if (this.dragging && rangeChanged) {
            this.sortableRef.rangeChanged = true;
          }

          this.range = range;
          this.sortableRef?.option('range', range);
          rangeChanged && this.$emit('rangeChange', range);
        },
      });
    },

    // sortable init
    _installSortable() {
      this.sortableRef = new Sortable(this.$refs.rootRef, {
        ...this.sortableAttributes,
        list: this.dataSource,
        uniqueKeys: this.uniqueKeys,
        onChoose: (event) => {
          this.chosenKey = event.node.getAttribute('data-key');
        },
        onUnChoose: () => {
          this.chosenKey = '';
        },
        onDrag: (event) => {
          this.dragging = true;
          if (!this.sortable) {
            this.virtualRef.enableScroll(false);
            this.sortableRef.option('autoScroll', false);
          }
          this.$emit('drag', event);
        },
        onDrop: (event) => {
          this.dragging = false;
          this.virtualRef.enableScroll(true);
          this.sortableRef.option('autoScroll', this.autoScroll);

          if (event.changed) {
            this.$emit('updateDataSource', event.list);
          }
          this.$emit('drop', event);
        },
      });
    },

    _handleToTop: throttle(function () {
      this.$emit('top');
      this.lastLength = this.dataSource.length;
    }, 50),

    _handleToBottom: throttle(function () {
      this.$emit('bottom');
    }, 50),

    _onItemResized(key, size) {
      if (isSameValue(key, this.chosenKey)) {
        return;
      }

      const sizes = this.virtualRef.sizes.size;
      this.virtualRef.onItemResized(key, size);

      if (sizes === this.keeps - 1 && this.dataSource.length > this.keeps) {
        this.virtualRef.updateRange(this.range);
      }
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
          const isChosen = isSameValue(dataKey, this.chosenKey);
          const itemStyle = this.dragging && isChosen && { display: 'none' };
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
                      sizeKey: this.itemSizeKey,
                    },
                    on: {
                      resized: this._onItemResized,
                    },
                    style: itemStyle,
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

    const container = tableMode ? 'table' : rootTag;
    const wrapper = tableMode ? 'tbody' : wrapTag;

    return h(
      container,
      {
        ref: 'rootRef',
        style: !this.scroller && !tableMode ? { overflow } : {},
      },
      [
        this.$slots.header,

        h(
          wrapper,
          {
            ref: 'wrapRef',
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
