/**
 * 新事件注册
 */

import { DispatchConfig, PluginModule, PluginName } from "./PluginModuleType"

/**
 * 记录注册事件名称和event名称的对应关系
 */
export const registrationNameDependencies = {}

/* ============================================= */

// 事件 -> dispatchConfig Map
export const eventNameDispatchConfigs: {
  [key: string]: DispatchConfig
} = {}

/* ============================================= */

// plugin name -> module的对象类型
type NamesToPlugins = { [key: string]: PluginModule<any>}

// 准备注入的name -> event plugin module的map
const namesToPlugins: NamesToPlugins = {}

// 记录那些已经被注册了的事件
export const registrationNameModules = {}

// 已经被注入并且被排序了的plugins(此时才是真正可用的)
export const plugins: PluginModule<any>[] = []

/* ============================================= */

// plugin被注入的顺序
type EventPluginOrder = null | PluginName[]


/**
 * event plugin的插入顺序
 */
let eventPluginOrder: EventPluginOrder = null

/**
 * 根据注入的plugin的名字进行排序。始终允许即使插入并且与事件解耦
 * @param injectedEventPluginOrder 要注入的plugin(顺序) 其实是一个字符串数组
 */
export function injectEventPluginOrder (
  injectedEventPluginOrder: EventPluginOrder
): void {
  // 克隆数组化
  eventPluginOrder = Array.prototype.slice.call(injectedEventPluginOrder)
  // 重新计算plugin顺序
  recomputePluginOrdering()
}

/**
 * 插入plugins之后
 * 重新计算plugin list 的顺序
 */
function recomputePluginOrdering(): void {
  if (!eventPluginOrder) return
  let pluginName
  // 将plugin按照之前注册的顺序一个个注入
  // @question 顺序的意义是什么
  for(pluginName in namesToPlugins) {
    const pluginModule = namesToPlugins[pluginName]
    // 处于注入的plugin顺序中的位置
    const pluginIndex = eventPluginOrder.indexOf(pluginName)

    if (plugins[pluginIndex]) {
      // 如果已经加载了这个plugin，跳过
      continue
    }
    // 否则，放入plugin
    plugins[pluginIndex] = pluginModule

    // plugin中支持的事件类型
    const publishedEvents = pluginModule.eventTypes

    for(const eventName in publishedEvents) {
      // 将这些事件名正式注册
      publishEventForPlugin(
        publishedEvents[eventName],
        pluginModule,
        eventName
      )
    }
  }
}

// 发布一个事件，注册 name -> pluginModule map
function publishEventForPlugin (
  dispatchConfig: DispatchConfig,
  pluginModule: PluginModule<any>,
  eventName: string
): boolean {
  // 注册到 eventName -> dispatchConfig 的 Map 里去
  eventNameDispatchConfigs[eventName] = dispatchConfig

  // 触发这个事件的属性(分别有捕获和冒泡阶段)
  // phasedRegistrationNames: {
  //   bubbled: onEvent,
  //   captured: onEvent + 'Captured'
  // }
  const phasedRegistrationNames = dispatchConfig.phasedRegistrationNames
  // 在dispatchConfig中先取捕获和冒泡事件名来注册
  // 如果这个值缺省的了的话就寻找registrationName
  if (phasedRegistrationNames) {
    for(const phaseName in phasedRegistrationNames) {
      if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
        // 是自身的属性(我:?)
        const phasedRegistrationName = phasedRegistrationNames[phaseName]
        // 注册 name -> module | dependencies 的 map
        publishRegistrationName(
          phasedRegistrationName,
          pluginModule,
          eventName
        )
      }
    }
    return true
  } else if (dispatchConfig.registrationName) {
    publishRegistrationName(
      dispatchConfig.registrationName,
      pluginModule,
      eventName
    )
    return true
  }
  return false
}

/**
 * 发布一个事件名称，优化查找？
 */
function publishRegistrationName (
  registrationName: string,
  pluginModule: PluginModule<any>,
  eventName: string
): void {
  // 收集 name -> modules
  registrationNameModules[registrationName] = pluginModule
  // 收集 name -> dependencies
  registrationNameDependencies[registrationName] =
    pluginModule.eventTypes[eventName].dependencies
}


/**
 * 注入plugins来供EventPluginHub使用，这个plugin的名字必须被injectEventPluginOrder注入
 */
export function injectEventPluginByName (
  injectedNamesToPlugins: NamesToPlugins
): void {
  let isOrderingDirty = false
  for(const pluginName in injectedNamesToPlugins) {
    // 如果不是自身的属性，跳过
    if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
      continue
    }
    const pluginModule = injectedNamesToPlugins[pluginName]
    // 如果name -> module map中没有这个name或者是值对不上
    // 做一个更新，并且标记顺序已经不能保证纯净了
    if (
      !namesToPlugins.hasOwnProperty(pluginName) ||
      namesToPlugins[pluginName] !== pluginModule
    ) {
      namesToPlugins[pluginName] = pluginModule
      isOrderingDirty = true
    }
  }
  if (isOrderingDirty) {
    // 既然顺序已经不纯净，重新排序
    recomputePluginOrdering()
  }
}
