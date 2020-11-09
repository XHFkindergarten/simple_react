/**
 * 一些事件模块类型
 */

import { DOMTopLevelEventType } from "./BrowserEventEmitter"
import { EventPriority } from "./EventPriority"

export type DispatchConfig = {
  dependencies: DOMTopLevelEventType[],
  phasedRegistrationNames?: {
    bubbled: string,
    captured: string
  },
  registrationName?: string,
  eventPriority: EventPriority
}

export type EventTypes = { [key: string]: DispatchConfig }

// 任何原生事件类型
export type AnyNativeEvent = Event | KeyboardEvent | MouseEvent | Touch

export type PluginName = string

export type PluginModule<NativeEvent> = {
  eventTypes: EventTypes,
  extractEvents: any,
  tapMoveThreshold?: number
}