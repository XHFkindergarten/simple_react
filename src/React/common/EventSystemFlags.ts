/**
 * 标识事件系统处于哪一状态
 */

export enum EventSystemFlags {
  PLUGIN_EVENT_SYSTEM = 1,
  RESPONDER_EVENT_SYSTEM = 1 << 1,
  IS_PASSIVE = 1 << 2,
  IS_ACTIVE = 1 << 3,
  PASSIVE_NOT_SOPPORTED = 1 << 4,
  IS_REPLAYED = 1 << 5
}