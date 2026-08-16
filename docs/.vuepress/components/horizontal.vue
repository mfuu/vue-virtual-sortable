<template>
  <virtual-list
    v-model="list"
    data-key="id"
    handle=".handle"
    direction="horizontal"
    class="horizontal-list"
    chosen-class="chosen"
    :wrap-style="{ display: 'flex' }"
  >
    <template v-slot:item="{ item, index, key }">
      <div class="list-item">
        <div class="item-title">
          <span class="index">#{{ item.index }}</span>
          <span class="handle">☰</span>
        </div>
        <p>{{ item.desc }}</p>
      </div>
    </template>
  </virtual-list>
</template>

<script>
import { getPageData } from '../public/sentence';
export default {
  data() {
    return {
      list: getPageData(1000, 0),
    };
  },
};
</script>

<style scoped>
.horizontal-list {
  height: 500px;
  display: flex;
  padding: 5px;
}

.list-item {
  position: relative;
  border-radius: 5px;
  box-shadow: 0px 2px 10px -5px #57bbb4;
  padding: 16px;
  width: fit-content;
}

.item-title {
  display: flex;
  justify-content: space-between;
}

.index {
  float: left;
}

.handle {
  cursor: grab;
  text-align: right;
}

.chosen {
  box-shadow: 0px 0px 0px 2px #30a46c;
}
</style>
