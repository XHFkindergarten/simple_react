/**
 * 浏览器的简单事件代理(并不是事件很简单的意思)
 */

import { DOMTopLevelEventType } from "./BrowserEventEmitter"
import { ContinuousEvent, DiscreteEvent, EventPriority } from "./EventPriority"
import { DispatchConfig, EventTypes, PluginModule } from "./PluginModuleType"
import * as DOMTopLevelEventTypes from './DOMTopEventTypes'
import { EventSystemFlags } from "../common/EventSystemFlags"
import { Fiber } from "../Fiber/Fiber"
import { ReactSyntheticEvent } from "./SyntheticEventType"
import SyntheticEvent from "./SyntheticEvent"
import { accumulateTwoPhaseDispatches } from "./EventPropagators"
// 事件元组类型
type EventTuple = [
  DOMTopLevelEventType, // React 中的事件类型
  string,               // 浏览器中的事件名称
  EventPriority         // 事件优先级
]

// 数据其实都是写好的，采用注入方式的原因是React需要兼容多种原生环境
const eventTuples: EventTuple[] = [
  // 离散的事件
  // 离散事件一般指的是在浏览器中连续两次触发间隔最少33ms的事件(无依据，俺自己说的)
  // 例如快速连按两下键盘，这两个事件的实际触发事件仍然会有一定间隔
  [ DOMTopLevelEventTypes.TOP_BLUR, 'blur', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CANCEL, 'cancel', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CHANGE, 'change', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CLICK, 'click', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CLOSE, 'close', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CONTEXT_MENU, 'contextMenu', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_COPY, 'copy', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_CUT, 'cut', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_DOUBLE_CLICK, 'doubleClick', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_AUX_CLICK, 'auxClick', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_DRAG, 'drag', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_DRAG_END, 'dragEnd', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_DRAG_ENTER, 'dragEnter', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_FOCUS, 'focus', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_INPUT, 'input', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_KEY_DOWN, 'keyDown', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_KEY_PRESS, 'keyPress', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_KEY_UP, 'keyUp', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_LOAD, 'load', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_MOUSE_DOWN, 'mouseDown', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_MOUSE_MOVE, 'mouseMove', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_MOUSE_OUT, 'mouseOut', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_MOUSE_OVER, 'mouseOver', DiscreteEvent ],
  [ DOMTopLevelEventTypes.TOP_MOUSE_UP, 'mouseUp', DiscreteEvent ]
]

// 事件类型
const eventTypes: EventTypes = {}

// 事件名称 -> DispatchConfig
const topLevelEventsToDispatchConfig: {
  [key: string]: DispatchConfig
} = {}

// 遍历eventTuples将数据转换后填入eventTypes
for(let i = 0; i < eventTuples.length; i++) {
  const eventTuple = eventTuples[i]
  // 从元组中提取出信息
  // 顶层浏览器事件
  const topEvent = eventTuple[0]
  
  const event = eventTuple[1]
  // 事件的优先级
  const eventPriority = eventTuple[2]
  // 驼峰式命名
  const capitalizedEvent = event[0].toUpperCase() + event.slice(1)
  // 转换成对应的Html绑定属性
  const onEvent = 'on' + capitalizedEvent
  const config = {
    // 在捕获阶段和冒泡阶段的事件名称
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture'
    },
    dependencies: [ topEvent ], // 这个的目的不明
    eventPriority
  }
  // 填入数据
  eventTypes[event] = config

  // 通过浏览器事件名称对应config的版本
  topLevelEventsToDispatchConfig[topEvent] = config
}

const SimpleEventPlugin: PluginModule<MouseEvent> & {
  getEventPriority: (topLevelType: DOMTopLevelEventType) => EventPriority
} = {
  eventTypes: eventTypes,

  // 根据浏览器事件名称获取其优先级
  getEventPriority (topLevelType: DOMTopLevelEventType): EventPriority {
    const config = topLevelEventsToDispatchConfig[topLevelType]
    // 如果没有，默认返回最高优先级（连续事件）
    return (config ? config.eventPriority : ContinuousEvent)
  },

  // 从原生事件中提取合成事件
  extractEvents (
    topLevelType: DOMTopLevelEventType,
    eventSystemFlags: EventSystemFlags,
    targetInst: Fiber | null,
    nativeEvent: MouseEvent,
    nativeEventTarget: EventTarget
  ): ReactSyntheticEvent | null {
    // 获取该事件对应的 dispatch config
    const dispatchConfig = topLevelEventsToDispatchConfig[topLevelType]
    if (!dispatchConfig) {
      return null
    }
    // 事件构造函数
    let EventConstructor

    switch (topLevelType) {
      case DOMTopLevelEventTypes.TOP_CLICK: {
        if (nativeEvent.button === 2) {
          return null // ?
        }
      }
      // 省略，想要自己加→_→
      default: {
        // 默认使用合成事件的构造函数
        EventConstructor = SyntheticEvent
        break
      }
    }
    const event = EventConstructor.getPooled(
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeEventTarget
    )
    // 将事件从根节点到目标节点 模拟 捕获过程、触发过程、冒泡过程
    accumulateTwoPhaseDispatches(event)
    return event
  },
}

export default SimpleEventPlugin