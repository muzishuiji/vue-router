/* @flow */

import { install } from './install'
import { START } from './util/route'
import { assert } from './util/warn'
import { inBrowser } from './util/dom'
import { cleanPath } from './util/path'
import { createMatcher } from './create-matcher'
import { normalizeLocation } from './util/location'
import { supportsPushState } from './util/push-state'

import { HashHistory } from './history/hash'
import { HTML5History } from './history/html5'
import { AbstractHistory } from './history/abstract'

import type { Matcher } from './create-matcher'

// VueRouter类
export default class VueRouter {
  static install: () => void;  // 安装函数
  static version: string;      // 版本号

  app: any;                    //  vue跟实例
  apps: Array<any>;            // vue组件实例们
  ready: boolean;              // 准备好了
  readyCbs: Array<Function>;   //  准备好了的回调们
  options: RouterOptions;      // 实例化vue-router的传参
  mode: string;                // 路由匹配模式
  history: HashHistory | HTML5History | AbstractHistory;    // history
  matcher: Matcher;                                         // 匹配路由的构造函数
  fallback: boolean;                                        // 
  beforeHooks: Array<?NavigationGuard>;                     // vue-router的钩子函数
  resolveHooks: Array<?NavigationGuard>;                    // vue-router的钩子函数
  afterHooks: Array<?AfterNavigationHook>;                  // vue-router的钩子函数

  constructor (options: RouterOptions = {}) {
    // 跟实例
    this.app = null
    // 组件实例
    this.apps = []
    // vue-router的配置项
    this.options = options
    // vue-router的钩子函数
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    // 创建路由匹配实例,传入我们定义的routes,path,name,component等
    this.matcher = createMatcher(options.routes || [], this)

    // 判断模式
    let mode = options.mode || 'hash'
    // fallback不等于false,且mode传入history但是不支持pushState api的时候调整路由模式为hash
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    // 非浏览器环境mode='abstract'
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode
    // 根据不同的模式创建对应的history实例
    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }

  match (
    raw: RawLocation,
    current?: Route,
    redirectedFrom?: Location
  ): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }

  // 获得当前路由对象
  get currentRoute (): ?Route {
    return this.history && this.history.current
  }
  
  // vue-router 初始化函数
  init (app: any /* Vue component instance */) {
    process.env.NODE_ENV !== 'production' && assert(
      install.installed,
      `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
      `before creating root instance.`
    )

    this.apps.push(app)

    // 创建一个组件销毁的处理程序
    // https://github.com/vuejs/vue-router/issues/2639
    app.$once('hook:destroyed', () => {
      // 如果组件数组中存在某个对应组件的实例,则清除
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      // 确保我们有一个根组件或者null如果没有组件的情况下
      // we do not release the router so it can be reused
      if (this.app === app) this.app = this.apps[0] || null
    })
    // 根组件如果已经创建,则直接返回,我们不需要在创建一个新的history 监听
    if (this.app) {
      return
    }

    // 否则创建根组件
    this.app = app

    const history = this.history

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation())
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }
    // 添加路由监听,给所有的组件实例定义响应式_route对象
    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }


  /*
  vue-router的一系列api
   */
  // 给组件实例注册beforeHooks钩子函数
  beforeEach (fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
  }

  beforeResolve (fn: Function): Function {
    return registerHook(this.resolveHooks, fn)
  }

  afterEach (fn: Function): Function {
    return registerHook(this.afterHooks, fn)
  }

  onReady (cb: Function, errorCb?: Function) {
    this.history.onReady(cb, errorCb)
  }

  onError (errorCb: Function) {
    this.history.onError(errorCb)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // $flow-disable-line
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.push(location, resolve, reject)
      })
    } else {
      this.history.push(location, onComplete, onAbort)
    }
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // $flow-disable-line
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.replace(location, resolve, reject)
      })
    } else {
      this.history.replace(location, onComplete, onAbort)
    }
  }

  go (n: number) {
    this.history.go(n)
  }

  back () {
    this.go(-1)
  }

  forward () {
    this.go(1)
  }
  // 获取匹配的组件, 根据传入的path,返回匹配的组件的key组成的数组
  getMatchedComponents (to?: RawLocation | Route): Array<any> {
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply([], route.matched.map(m => {
      return Object.keys(m.components).map(key => {
        return m.components[key]
      })
    }))
  }

  // 一个路由的处理函数
  resolve (
    to: RawLocation,
    current?: Route,
    append?: boolean
  ): {
    location: Location,
    route: Route,
    href: string,
    // for backwards compat
    normalizedTo: Location,
    resolved: Route
  } {
    current = current || this.history.current
    const location = normalizeLocation(
      to,
      current,
      append,
      this
    )
    const route = this.match(location, current)
    const fullPath = route.redirectedFrom || route.fullPath
    const base = this.history.base
    const href = createHref(base, fullPath, this.mode)
    return {
      location,
      route,
      href,
      // for backwards compat
      normalizedTo: location,
      resolved: route
    }
  }
  // 添加路由
  addRoutes (routes: Array<RouteConfig>) {
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }
}
// 将fn添加进钩子函数列表,并返回一个移除该钩子函数的回调
function registerHook (list: Array<any>, fn: Function): Function {
  list.push(fn)
  return () => {
    const i = list.indexOf(fn)
    if (i > -1) list.splice(i, 1)
  }
}

// 生成匹配的href url
function createHref (base: string, fullPath: string, mode) {
  var path = mode === 'hash' ? '#' + fullPath : fullPath  // hash模式则加上#
  return base ? cleanPath(base + '/' + path) : path       // 基础路由存在则拼接,不存在则直接展示path
}

VueRouter.install = install           // 挂载install函数
VueRouter.version = '__VERSION__'     // 定义版本号

// 判断如果window上挂载了Vue则自动使用插件
if (inBrowser && window.Vue) {
  window.Vue.use(VueRouter)
}
