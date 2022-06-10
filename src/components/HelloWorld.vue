<template>
  <div>
    <div>123</div>
    <global-uploader></global-uploader>
    <div>345</div>
  </div>
</template>

<script>
import globalUploader from "@/components/home.vue";
export default {
  name: "HelloWorld",
  data() {
    return {
      msg: "Welcome to Your Vue.js App",
    };
  },
  components: {
    globalUploader,
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
