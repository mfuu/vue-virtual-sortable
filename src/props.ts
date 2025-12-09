export const VirtualProps = {
  dataSource: {
    type: Array,
    default: () => [],
  },
  dataKey: {
    type: String,
    required: true,
  },
  scroller: {
    type: [Document, HTMLElement],
    default: undefined,
  },
  direction: {
    type: String,
    default: 'vertical',
  },
  keeps: {
    type: Number,
    default: 30,
  },
  size: {
    type: Number,
    default: undefined,
  },
  keepOffset: {
    type: Boolean,
    default: false,
  },
  tableMode: {
    type: Boolean,
    default: false,
  },
  draggable: {
    type: String,
    default: '[role="item"]',
  },
  sortable: {
    type: Boolean,
    default: true,
  },
  handle: {
    type: [Function, String],
    default: undefined,
  },
  group: {
    type: [String, Object],
    default: undefined,
  },
  lockAxis: {
    type: String,
    default: '',
  },
  debounceTime: {
    type: Number,
    default: 0,
  },
  throttleTime: {
    type: Number,
    default: 0,
  },
  animation: {
    type: Number,
    default: 150,
  },
  autoScroll: {
    type: Boolean,
    default: true,
  },
  scrollSpeed: {
    type: Object,
    default: () => ({ x: 10, y: 10 }),
  },
  scrollThreshold: {
    type: Number,
    default: 55,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  appendToBody: {
    type: Boolean,
    default: false,
  },
  delay: {
    type: Number,
    default: 0,
  },
  delayOnTouchOnly: {
    type: Boolean,
    default: false,
  },
  dropOnAnimationEnd: {
    type: Boolean,
    default: true,
  },
  rootTag: {
    type: String,
    default: 'div',
  },
  wrapTag: {
    type: String,
    default: 'div',
  },
  wrapClass: {
    type: String,
    default: '',
  },
  wrapStyle: {
    type: Object,
    default: () => ({}),
  },
  ghostClass: {
    type: String,
    default: '',
  },
  ghostStyle: {
    type: Object,
    default: () => ({}),
  },
  chosenClass: {
    type: String,
    default: '',
  },
  placeholderClass: {
    type: String,
    default: '',
  },
};

export const ItemProps = {
  dataKey: {
    type: [String, Number],
    default: undefined,
  },
  horizontal: {
    type: Boolean,
    default: false,
  },
};
