/**
 * 浏览器顶层事件的类型
 */


// 源码写的非常规范，这里稍微偷个懒
// 事实上像animation这些属性还需要做处理
// export const TOP_ABORT = unsafeCastStringToDOMTopLevelType('abort');
// export function unsafeCastStringToDOMTopLevelType(
//   topLevelType: string,
// ): DOMTopLevelEventType {
//   return topLevelType;
// }

// 仅列举一些常用的吧

export const TOP_BLUR = 'blur'
export const TOP_CANCEL = 'cancel'
export const TOP_CHANGE = 'change'
export const TOP_CLICK = 'click'
export const TOP_CLOSE = 'close'
export const TOP_CONTEXT_MENU = 'contextmenu'
export const TOP_COPY = 'copy'
export const TOP_CUT = 'cut'
export const TOP_DOUBLE_CLICK = 'dblclick'
export const TOP_AUX_CLICK = 'auxclick'
export const TOP_DRAG = 'drag'
export const TOP_DRAG_END = 'dragend'
export const TOP_DRAG_ENTER = 'dragenter'
export const TOP_FOCUS = 'focus'
export const TOP_INPUT = 'input'
export const TOP_KEY_DOWN = 'keydown'
export const TOP_KEY_PRESS = 'keypress'
export const TOP_KEY_UP = 'keyup'
export const TOP_LOAD = 'load'
export const TOP_MOUSE_DOWN = 'mousedown'
export const TOP_MOUSE_MOVE = 'mousemove'
export const TOP_MOUSE_OUT = 'mouseout'
export const TOP_MOUSE_OVER = 'mouseover'
export const TOP_MOUSE_UP = 'mouseup'

/**
 * 不会冒泡的媒体类型的事件
 * 略
 */
