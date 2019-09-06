// 使用路由之前,需要调用Vue.use(VueRouter)来安装插件,所以我们要先来kanknavue的use方法
export function initUse(Vue: GlobalAPI) {
    Vue.use = function(plugin: Function | Object) {
        // 判断重复安装插件
        const installedPlugins = this._installedPlugins || (this._installedPlugins = [])
        if(this._installedPlugins.indexOf(plugin) > -1) {
            return this
        }
        const args = toArray(arguments, 1)
        // 插入vue
        args.unshift(this)
        // 一般插件都会有一个install函数
        // 通过该函数让插件可以使用vue
        if(typeof plugin.install === 'function') {
            plugin.install.apply(plugin, args)
        } else if(typeof plugin === 'function') {
            plugin.apply(null, args) // 第一个参数传空,让this指向window
        }
        installedPlugins.push(plugin)
        return this
    }
}
// 接下来看install函数的实现
export function install(Vue) {
    // 确保install只调用一次
    if(install.installed && _Vue === Vue) return
    install.installed = true
    // 把VUE赋值给全局变量
    _Vue = Vue
    // 注册实例
    const registerInstance = (vm, callVal) => {
        let i = vm.$options._parentVnode
        if(
            isDef(i) &&
            isDef((i = i.data)) &&
            isDef((i = i.registerInstance))
        ) {
            i(vm, callVal)
        }
    }
    // 给每个组件的钩子函数(beforeCreate和destoryed)混入实现
    Vue.mixin({
        beforeCreate() {
            // 判断组件是否存在router对象,该对象只在根组件上有
            if(isDef(this.$options.router)) {
                // 跟路由设置为自己
                this._routerRoot = this
                this._router = this.$options.router
                // 初始化路由
                this._router.init(this)
                // 很重要,为_route属性实现双向绑定
                // 触发组件渲染
                Vue.util.defineReactive(this, '_route', this._router.history.current)
            } else {
                // 用于router-view层级判断
                this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
            }
            registerInstance(this, this)
        },
        destroyed() {
            registerInstance(this)
        },
    })
    // 全局注册组件router-link和router-view
    Vue.component('RouterView', View)
    Vue.component('RouterLink', Link)
    
}
// 对于路由注册来说,核心就是调用Vue.use(VueRouter),然后使得vueRouter可以使用vue,然后通过vue
// 来调用vueRouter的install函数,在函数中,核心就是给组件混入钩子函数和全局注册两个路由组件

// 在安装插件后,对vue-router进行实例化
const Home = { template: '<div>home</div>' }
const Foo = { template: '<div>foo</div>'}
const Bar = { template: '<div>bar</div>'}
// create the router
const router = new router({
    mode: 'hash',
    base: __dirname,
    routes: [
        {
            path: '/', component: Home
        },
        {
            path: '/foo', component: Foo
        },
        {
            path: '/bar', component: Bar
        }
    ]
})

// vueRouter的构造函数
constructor(options: RouterOptions = {}) {
    // 路由匹配对象,为每一个路由匹配对应的组件
    this.matcher = createMatcher(options.routes || [], this)
    // 根据mode实例化不能的路由逻辑
    let mode = options.mode || 'hash'
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if(this.fallback) {
        mode = 'hash'
    }
    if(!inBrowser) {
        mode = 'abstract'
    }
    this.mode = mode
    switch(mode) {
        case 'history':
            this.history = new HTML5History(this, options.base)
            break
        case 'hash':
            this.history = new HashHistory(this, options.base, this.fallback)
            break
        case 'abstract':
            this.history = new AbstractHistory(this, optiosn.base)
            break
        default:
            if(process.env.NODE_ENV !== 'production') {
                assert(false, `invalid mode: ${mode}`)
            }
    }
}
// 在实例化vueRouter的过程中,核心是创建一个路由匹配对象,并根据mode的不同采取不同的路由方式,实例化不同的对象
export function createMatcher(
    roures: Array<RouteConfig>,
    router: vueRouter
): Matcher {
    // 创建路由映射表
    const { pathList, pathMap, nameMap } = createRouteMap(routes)
    function addRoutes(routes) {
        createRouteMap(routes, pathList, pathMap, nameMap)
    }
    // 路由匹配
    function match(
        raw: RawLocation,
        currentRoute?: Route,
        redirectedFrom?: Location
    ): Route {
        // ...
    }

    return {
        match,
        addRoutes
    }
}
// createMatcher函数的作用就是创建路由映射表,然后通过必报的方式让addRoutes和match函数能够使用路由映射表的几个对象
// 最后返回一个matcher对象
export function createRouteMap(
    routes: Array<RouteConfig>,
    oldPathList?: Array<string>,
    oldPathMap?: Dictionary<RouteRecord>,
    oldNameMap?: Dictionary<RouteRecord>
) : {
    pathList: Array<string>,
    pathMap: Dictionary<RouteRecord>,
    nameMap: Dictionary<RouteRecord>
} {
    // 创建映射表
    const pathList: Array<string> = oldPathList || []
    // Object.create(null)创建一个不包含原型上的属性和方法的对象
    const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
    const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)
    // 遍历路由配置,为每个配置添加路由记录
    routes.forEach(route => {
        addRouteRecord(pathList, pathMap, nameMap, route)
    })
    // 确保通配符在最后
    for(let i = 0, l = pathList.length; i < l; i++) {
        if(pathList[i] === '*') {
            // 如果遇到等于*号的就把它splice删除掉,然后push到pathList数组的最后
            pathList.push(pathList.splice(i, 1)[0])
            l--
            i--
        }
    }
    return {
        pathList,
        pathMap,
        nameMap
    }
}
// createMatcher函数创建映射表
export function addRouteRecord(
    pathList: Array<string>,
    pathMap?: Dictionary<RouteRecord>,
    nameMap?: Dictionary<RouteRecord>,
    route: RouteConfig,
    parent?: RouteRecord,
    matchAs?: string
) {
    // 获得路由配置下的属性  
    const { path, name } = route
    const pathToRegexOptions: PathToRegexOptions = route.pathToRegexOptions || {}
    // 格式化url.替换
    const normalizedPath = normalizedPath(path, parent, pathToRegexOptions.strict)
    // 生成记录对象
    const record: RouteRecord = {
        path: normalizedPath,
        regex: compileRouteRegex(normalizedPath, pathToRegexOptions),
        components: route.components || { default: route.component },
        instances: {},
        name,
        parent,
        matchAs,
        redirect: route.redirect,
        beforeEnter: route.beforeEnter,
        meta: route.meta || {},
        props: route.props == null ? {} : route.components ? route.props : { default: route.props }
    }
    if(route.children) {
        // 递归路由配置的children属性,添加路由记录
        route.children.forEach(child => {
            const childMatchAs = matchAs ? cleanPath(`${matchAs}/${child.path}`) : undefined
            addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
        })
    }
    // 如果路由有别名的话,给别名添加路由记录
    if(route.alias !== undefined) {
        const aliases = Array.isArray(route.alias) ? route.alias : [route.alias]
        aliases.forEach(alias => {
            const aliasRoute = {
                path: alias,
                children: route.children
            }
            addRouteRecord(pathList, pathMap, nameMap,aliasRoute, parent, record.path || '/')
        })
    }
    // 更新映射表
    if(!pathMap[record.path]) {
        pathMap[record.path] = record
        pathList.push(record.path)  // 给pathList数组添加新的记录
    } 
    // 命名路由添加记录
    if(name) {
        if(!nameMap[name]) {
            nameMap[name] = record
        } else if(process.env.NODE_ENV !== 'production' && !matchAs) {
            warn(false,
            `Duplicate named routes definition: ` +
            `{ name: "${name}", path: "${record.path}" }`
            )
        }
    } 
}
// 以上就是创建路由匹配对象的全过程,通过用户配置的路由规则来创建对应的路由映射表
// 路由初始化
// 当根组件调用beforeCreate钩子函数时.会执行一下代码
beforeCreate() {
    // 只有根组件有router属性,所以根组件初始化时会初始化路由
    if(isDef(this.$options.router)) {
        this._routerRoot = this
        this._router = this.$options.router
        this._router.init(this)
        Vue.util.defineReactive(this, '_route', this._router.history.current)
    } else {
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
    }
    registerInstance(this, this)
}
// 看看路由初始化会做些什么
init(app: any) {
    // 保存组件实例和根组件
    this.apps.push(app)
    // 如果跟组件已经有了就返回
    if(this.app) {
        return null
    }
    this.app = app
    // 赋值路由模式
    const history = this.history
    // 判断路由模式, 以hash模式为例
    if(history instanceof HTML5History) {
        history.transitionTo(history.getCurrentLocation())
    } else if(history instanceof HashHistory) {
        // 添加hashChange监听
        const setupHashListener = () => {
            history.setUpListeners()
        }
        // 路由跳转, 添加路由监听
        history.transitionTo(
            history.getCurrentLocation(),
            setupHashListener
        )
        // 该回调会在transitionTo中调用
        // 对组件的_route属性进行赋值,触发组件渲染
        history.listen(route => {
            this.apps.forEach(app => {
                apply._route = route
            })
        })
    }   
}
// 在初始化路由时,核心就是进行路由的跳转,改变url然后渲染对应的组件,接下来看看路由是如何进行挑战的
transitionTo(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // 获取匹配的路由信息,在对应的路由映射表中匹配当前location
    const route = this.router.match(location, this.current)
    // 确认切换路由
    this.confirmTransition(route, () => {
        // 以下为切换路由成功或失败的回调
        // 更新路由信息,队组建的_route属性进行赋值,触发组件渲染
        // 调用afterHook中的钩子函数
        // 更新路由,并触发对应的组件渲染
        this.updateRoute(route)
        // 添加hashChange监听
        onComplete && onComplete(route)
        // 更新URL
        this.ensureURL()
        // 只执行一次ready回调
        if(!ready) {
            this.ready = true
            this.readyCbs.forEach(cb => {
                cb(route)
            })
        }
    }, err => {
        // 错误处理
        if(onAbort) {
            onAbort(err)
        }
        if(err && !this.ready) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => {
                cb(err)
            })
        }
    })
}
// 在路由跳转中,需要现货区匹配的路由信息,所以先来看下如何获取匹配的路由信息
function match(
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
): Route {
    // 序列化url
    // 比如对于该 url 来说 /abc?foo=bar&baz=qux##hello
    // 会序列化为 /abc
    // hash为##hello
    // 参数为 foo: 'bar', 'baz', 'qux'
    const location= normalizedLocation(raw, currentRoute, false, router)
    const { name } = location// 如果是命名路由,就怕努单记录中是否有该命名路由配置
    if(name) {
        const record = nameMap[name] // 在路由name映射表上查找对应的record
        // 没找到标识没有匹配的路由
        if(!record) {
            // 没有匹配,则创建路由
            return _createRoute(null, location)
        }
        const paramNames = record.regex.keys
                            .filter(key => !!key.optional)
                            .map(key => key.name)
        // 参数处理
        if(typeof location.params !== 'object') {
            location.params = {}
        }
        // 遍历处理当前路由的参数
        if(currentRoute && typeof current.params === 'object') {
            for(const key in currentRoute.params) {
                if(!(key in location.params) && paramNames.indexOf(key) > -1) {
                    location.params[key] = currentRoute.params[key]
                }
            }
        }
        if(record) {
            location.path = fillParams(
                record.path,
                location.params,
                `named route "${name}"`
            )
            return _createRoute(record, location, redirectedFrom)
        }
    } else if(location.path) {
        // 非命名路由处理逻辑
        location.params = {}
        for(let i = 0; i< pathList.length; i++) {
            const path = pathList[i]
            const record = pathMap[path]
            // 如果匹配路由,则创建路由
            if(matchRoute(record.regex, location.path, location.params)) {
                return _createRoute(record, location, redirectedFrom)
            }
        }
    }
    // 没有匹配的路由
  return _createRoute(null, location)
}
// 根据条件创建不同的路由
function _createRoute(
    record?: RouteRecord,
    location: Location,
    redirectedFrom?: Location
): Route{
    if(record && record.redirect) {
        return redirect(record, redirectedFrom || location)
    }
    if(record && record.matchAs) {
        return alias(record, location, record.matchAs)
    }
    return createRoute(record, location, redirectedFrom, router)
}
export function createRoute(
    record?: RouteRecord,
    location: Location,
    redirectedFrom?: Location,
    router?: VueRouter
): Route {
    const stringifyQuery = router && router.options.stringifyQuery
    // 克隆参数
    let query: any = location.query || {}
    try {
        query = clone(query)
    } catch(e) {}
    // 创建路由对象
    const route:Route = {
        name: location.name || (record && record.name),
        meta: (record && record.meta) || {},
        path: location.path || '/',
        hash: location.hash,
        query,
        params: location.params || {},
        fullPath: getFullPath(location, stringifyQuery),
        matched: record ? formatMatch(record) : []
    }
    if(redirectedFrom) {
        route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
    }
    // 让路由对象不可更改
    return Object.freeze(route)
}
// 获取包含当前路由的所有嵌套路径片段的路由记录
// 包含从跟路由到当前路由的匹配记录,从上至下
function formatMatch(record?: RouteRecord): Array<RouteRecord> {
    const res = []
    while(record) {
        res.unshift(record)
        record = record.parent
    }
    return res
}
confirmTransition(route: Route, onComplete: Function, onAbort?: Function) {
    const current = this.current
    // 中断跳转路由函数, 执行完错误回调,然后中断
    const abort = err => {
        if(isError(err)) {
            if(this.errorCbs.length) {
                this.errorCbs.forEach(cb => {
                    cb(err)
                })
            } else {
                warn(false, 'uncaught error during route navigation:')
                console.error(err)
            }
        }
        onAbort && onAbort(err)
    }
    // 如果是相同的路由就不跳转
    if(
        isSameRoute(route, current) &&
        route.matched.length === current.matched.length
    ) {
        this.ensureURL()
        return abort()
    }
    // 通过对比路由解析出可复用的组件,需要渲染的组件,失活的组件
    const { updated, deactivated, activated} = resolveQueue(
        this.current.matched,
        route.matched
    )
    // 解析路由组件的函数
    function resolveQueue(
        current: Array<RouteRecord>,
        next: Array<RouteRecord>
    ): {
        updated: Array<RouteRecord>,
        activated: Array<RouteRecord>,
        deactivated: Array<RouteRecord>
    } {
        let i
        const max = Math.max(current.length, next.length)
        for(i = 0; i< max; i++) {
            // 当前路由路径和跳转路由路径不同时跳出遍历
            if(current[i] !== next[i]) {
                break
            }
        }
        return {
            // 可复用的组件对应路由
            updated: next.slice(0, i),
            activated: next.slice(i),
            deactivated: current.slice(i)
        }
    }
    // 导航守卫数组
    const queue: Array<?NavigationGuard> = [].concat(
        // 失活的组件钩子
        extractLeaveGuards(deactivated),
        // 全局beforeEach钩子
        this.router.beforeHooks,
        // 在当前路由改变,但是该组件被复用时调用
        extractUpdateHooks(updated),
        // 需要渲染组件enter守卫钩子
        activated.map(m => m.beforeEnter),
        // 解析异步路由组件
        resolveAsyncComponents(activated)
    )
    // 保存路由
    this.pending = route
    // 迭代器,用于执行queue中的导航守卫钩子
    const interator = (hook: NavigationGuard, next) => {
        // 路由不相等就不跳转路由
        if(this.pending !== route) {
            return abort()
        }
        try {
            // 执行钩子
            hook(route, current, (to: any) => {
                // 只有执行了钩子函数中的next,才会继续执行下一个钩子函数
                // 否则会暂停跳转
                // 以下逻辑实在判断next()中的传参
                if(to === false || isError(to)) {
                    this.ensureURL(true)
                    abort(to)
                } else if(
                    typeof to === 'string' ||
                    (typeof to === 'object' && 
                    (typeof to.path === 'string' || typeof to.name === 'string'))
                ) {
                    abort(0)
                    if(typeof to === 'object' && to.replace) {
                        this.replace(to)
                    } else {
                        this.push(to)
                    }
                } else {
                    next(to)
                }
            })
        } catch(e) {
            abort(e)
        }
    }
    // 经典的同步执行异步函数
    runQueue(queue, iterator, () => {
        const postEnterCbs = []
        const inValid = () => this.current === route
        // 当所有异步组件加载完成后,会执行这里的回调,也就是runQueue中的cb()
        // 接下来执行 需要渲染组件的导航守卫钩子
        const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
        const queue = enterGuards.concat(this.router.resolveHooks)
        runQueue(queue, interator, () => {
            // 跳转完成
            if(this.pending !== route) {
                return abort()
            }
            this.pending = null
            onComplete(route)
            if(this.router.app) {
                this.router.app.$nextTick(() => {
                    postEnterCbs.forEach(cb => {
                        cb()
                    })
                })
            }
        })
    })   
}
export function runQueue(queue:Array<?NavigationGuard>, fn: Function, cb: Function) {
    const step = index => {
        // 队列中的函数都执行完毕,就执行回调函数,这就相当于一个提供一的加工通道,大家都在这里有序经过盖章
        // 然后执行其他作业
        if(index >= queue.length) {
            cb()
        } else {
            if(queue[index]) {
                // 执行迭代器,用户在钩子函数中执行next回调
                // 将队列中的函数传入fn依次执行
                // 回调中判断传参,没有问题就执行next(),也就是fn函数中的第二个参数
                fn(quque[index], () => {
                    step(index +1)
                })
            } else {
                step(index +1)
            }
        }
    } 
    step(0)
}
// 接下来介绍导航守卫
const queue: Array<?NavigationGuard> = [].concat(
    // 失活的组件钩子
    extractLeaveGuards(deactivated),
    // 全局beforeEach钩子
    this.router.beforeHooks.
    // 当前路由改变,但是该组件被复用时调用
    extractUpdateHooks(updated),
    // 需要渲染的enter守卫钩子
    activated.map(m => m.beforeEnter),
    // 解析异步路由组件
    resolveAsyncComponents(activated)
)
// 第一步先执行失活的钩子函数
function extractLeaveGuards(
    records: Array<RouteRecord>,
    name: string,
    bind: Function,
    reverse?: boolean
): Array<?Function> {
    const guards = flatMapComponents(records, (def, instance, match, key) => {
        // 找出组件中对应的钩子函数
        const guard = extractGuard(def, name)
        if(guard) {
            // 为每个钩子函数添加山下文对象为组件自身
            return Array.isArray(guard)
                ? guard.map(guard => bind(guard, instance, match, key))
                : bind(guard, instance, match, key)
        }
    })
    // 数组降维,并且判断是否需要翻转数组
    // 因为某些钩子函数需要从字执行到父
    return flatten(reverse ? guards.reverse() : guards)
}
export function flatMapComponent(
    matched: Array<RouteRecord>,
    fn: function
): Array<?Function> {
    // 数组降维
    return flattern(
        matched.map(m => {
            // 将数组中的对象传入回调函数中,获得钩子函数数组
            return Object.keys(m.components).map(key => 
                fn(m.components[key], m.instances[key], m, key)
            )
        })
    )
}
// 第二步执行全局beforeEach钩子函数
beforeEach(fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
}
function registerHook(list: Array<any>, fn: Function): Function {
    list.push(fn)
    return () =>{
        const i = list.indexOf(fn)
        if(i > -1) list.splice(i, 1)
    }
}
// 解析异步组件
export function resolveAsyncComponents(matched: Array<RouteRecord>): Function {
    return (to, from, next) => {
        let hasAsync = false
        let pending = 0
        let error = null
        // 该函数作用之前已经介绍过来
        flatMapComponent(matched, (def, _, match, key) => {
            // 判断是否是异步组件
            if(typeof def === 'function' && def.cid === undefined) {
                hasAsync = true
                pending++
                // 成功回调
                // once函数确保异步组件只加载一次
                const resolve = once(resolvedDef => {
                    if(isESModule(resolvedDef)) {
                        resolvedDef = resolvedDef.default
                    }
                    // 判断是否是构造函数
                    // 不是的华通过vue来生成组件构造函数

                    def.resolved = 
                        typeof resolvedDef === 'function'
                        ? resolvedDef
                        : _Vue.extend(resolvedDef)
                    // 复制组件
                    // 如果组件全部解析完毕,继续下一步
                    match.components[key] = resolvedDef
                    pending--
                    if(pending <= 0) {
                        next()
                    }
                })
                // 失败回调
                const reject = once(reason => {
                    const meg = `Failed to resolve async component ${key}: ${reson}`
                    process.env.NODE_ENV !== 'production' && warn(false, msg)
                    if(!error) {
                        error = isError(reason) ? reason : new Error(msg)
                        next(error)
                    }
                })
                let res
                trt {
                    // 执行异步组件函数
                    res = def(resolve, reject)
                } catch(e) {
                    reject(e)
                }
                if(res) {
                    // 下载完成执行回调
                    if(typeof res.then === 'function') {
                        res.then(resolve, reject)
                    } else {
                        const comp = res.component
                        if(comp && typeof comp.then === 'function') {
                            comp.then(resolve, reject)
                        }
                    }
                }
            }
        })
        // 不是异步组件直接下一步
        if(!hasAsync) next()
    }
}
// 以上就是第一个runQueue中的逻辑,第五步完成后会执行第一个runQueue中回调函数
// 该回调用于保存beforeRouteEnter钩子中的回调函数
const postEnterCbs - []
const isValid = () => this.current === route
// beforeRouteEnter 导航守卫钩子
const enterGuards = extractEnterGuards(activated, postEnterCbs, isValid)
// beforeResolve 导航守卫钩子
const queue = enterGuards.concat(this.router.resolveHooks)
runQueue(queue, iterator, () => {
    if(this.pending !== route) {
        return abort()
    }
    this.pending = null
    // 这里会执行afterEach导航守卫钩子
    onComplete(route)
    if(this.router.app) {
        this.router.app.$nextTick(() => {
            postEnterCbs.forEach(cb => {
                cb()
            })
        })
    }
})
// beforeRouteEnter支持在回调中获取this对象
beforeRouteEnter(to, from, next) {
    next(vm => {
        // 通过vm访问组件实例

    })
}
// 下面看看如何支持在回调中拿到this对象的
function extractEnterGuards(
    activated: Array<RouteRecord>,
    cbs: Array<Function>,
    isValid: () => boolean
): Array<?Function> {
    // 这里和之前调用导航首位基本一致
    return extractGuards(
        activated,
        'beforeRouteEnter',
        (guard, _, match, key) => {
            return bindEnterGuard(guard, match, key, cbs, isValid)
        }
    )
}
function bindEnterGuard(
    guard: NavigationGuard,
    match: routeRecord,
    key: string,
    cbs: Array<Function>,
    isValid: () => boolean
): NavigationGuard {
    return function routeEnterGuard(to, from, next) {
        return guard(to, from, cb => {
            // 判断cb是否是函数
            // 是的话就push进postEnterCbs
            next(cb)
            if(typeof cb === 'function') {
                cbs.push(() => {
                    // 循环直到拿到组件实例
                    poll(cb, match.instances, key, isValid)
                })
            }
        })
    }
}
// 当router-view外面包裹了modeWieout-in的transition组件
// 会在组件初次导航到时获得不到组件实例对象
function poll(
    cb: any,
    instances: Object,
    key: string,
    isValid: () => boolean
) {
    if(
        instances[key] &&
        !instances[key]._isBeingDestoryed
    ) {
        cb(instances[key])
    } else if(isValid()) {
        setTimeout(() => {
            poll(cb, instances, key, isValid)
        }, 16)
    }
}
// 第七部是执行beforeResolve导航守卫钩子,如果注册了全局beforeResolve钩子就会在这里执行
// 第八步是导航确认,调用afterEach导航守卫钩子
// 以上都执行完成,会触发组件的渲染
histyory.listen(route => {
    this.app.forEach(app => {
        app._route = route
    })
})
// 以上回调会在updateRoute中调用
updateRoute(route: Route) {
    const prev = this.current
    this.current = route
    this.cb && this.cb(route)
    this.router.afterHooks.forEach(hook => {
        hook && hook(route, prev)
    })
}
// 路由组件的核心就是判断跳转的路由是否存在于记录中r,anhou执行各种导航守卫函数,最后完成url的改变和组件的渲染
// 简版的vue-router的api
push(location) {
    // 找到匹配传入参数的路由对象
    const targetRoute = match(location, this.router.routes)
    // 切换路由
    this.transitionTo(targetRoute, () => {
        changeUrl(this.router.base, this.current.fullPath)
    })
}
// replace
replaceState(location) {
    const targetRoute = match(location, this.router.routes)
    this.transitionTo(targetRoute, () => {
        changeUrl(this.router.base, this.current.fullPath, true)
    })
}
go(n) {
    window.history.go(n)
}

function changeUrl(path, replace) {
    const href = window.location.href
    const i = href.indexOf('#')
    const base = i >= 0 ? href.slice(0, i) : href
    if(replace) {
        window.history.replaceState({}, '', `${base}#/${path}`)
    } else {
        window.history.pushState({}, '', `${base}#/${path}`)
    }
}