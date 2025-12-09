export default ({ Vue, options, router, siteData }) => {
  Vue.mixin({
    mounted() {
      import('../../src/index').then(function (m) {
        Vue.component(m.default);
      });
    },
  });
};
