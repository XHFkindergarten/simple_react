/**
 * 事件监听函数
 */

// 监听冒泡事件
export function addEventBubbleListener (
  element: Document | Element | Node,
  eventType: string,
  listener: EventListener
): void {
  element.addEventListener(eventType, listener, false)
}


// 监听事件捕获
export function addEventCaptureListener (
  element: Document | Element | Node,
  eventType: string,
  listener: EventListener
): void {
  element.addEventListener(eventType, listener, true)
}