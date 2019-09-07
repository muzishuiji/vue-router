import View from './components/view'
import Link from './components/link'

export let _Vue

export function install (Vue) {
  // 如果已经安装过,则直接返回
  if (install.installed && _Vue === Vue) return
  install.installed = true
  // 获取Vue实例
  _Vue = Vue

  const isDef = v => v !== undefined

  const registerInstance = (vm, callVal) => {
    let i = vm.$options._parentVnode
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }
 // 给Vue实例的钩子函数混入一些属性,并添加_route响应式对象
  Vue.mixin({
    beforeCreate () {
      if (isDef(this.$options.router)) {
        // 将根组件的_routerRoot属性指向Vue实例
        this._routerRoot = this
        // 将根组件_router属性指向传入的router对象
        this._router = this.$options.router
        // router初始化,调用vueRouter的init方法
        this._router.init(this)
        // 调用Vue的defineReactive增加_route的响应式对象
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 将每个组件的_routerRoot属性都指向根Vue实例
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      // 注册vueComponent进行Observer处理
      registerInstance(this, this)
    },
    destroyed () {
      // 注销VueComponent
      registerInstance(this)
    }
  })

 // 给Vue实例添加 $router属性,指向 _router 为VueRouter的实例
 // _route为一个存数量路有数据的对象
  Object.defineProperty(Vue.prototype, '$router', {
    get () { return this._routerRoot._router }
  })

  Object.defineProperty(Vue.prototype, '$route', {
    get () { return this._routerRoot._route }
  })

  // 注册组件
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)
  // vue钩子合并策略
  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
