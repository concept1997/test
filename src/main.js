// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import uploader from 'vue-simple-uploader'
import App from './App'
import router from './router'
import $ from 'jquery'
import axios from 'axios'

Vue.config.productionTip = false
axios.defaults.baseURL = 'http://apidev.obei.com.cn/obei-gateway/basic/'
Vue.prototype.$http = axios
Vue.use(uploader)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  $,
  components: { App },
  template: '<App/>'
})
