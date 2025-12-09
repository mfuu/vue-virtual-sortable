module.exports = {
  base: '/vue-virtual-sortable/',
  lang: 'en-US',
  title: 'vue-virtual-sortable',
  description: 'A virtual scrolling list component that can be sorted by dragging',

  themeConfig: {
    repo: 'mfuu/vue-virtual-sortable',

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2019-${new Date().getFullYear()} mfuu`,
    },

    nav: [
      {
        text: 'Guide',
        link: '/guide/install',
        activeMatch: '/guide/',
      },
      {
        text: 'Demo',
        link: '/demo/basic',
        activeMatch: '/demo/',
      },
    ],

    sidebar: {
      '/guide/': ['install', 'props', 'emits', 'methods'],
      '/demo/': ['basic', 'group', 'infinity', 'horizontal', 'scrollto', 'table', 'scroller'],
    },
  },

  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.ts|\.tsx$/,
          loader: 'babel-loader',
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx'],
    },
  },
};
