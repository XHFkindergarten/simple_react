
/**
 * 合成事件 Class
 */

// 事件池的容量
const EVENT_POOL_SIZE = 10

function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

/**
 * 原生 -> 合成的接口
 */
const EventInterface = {
  type: null,
  target: null,
  currentTarget: function () {
    return null
  },
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: function (event) {
    return event.timeStamp || Date.now()
  },
  defaultPrevented: null,
  isTrusted: null
}


function SyntheticEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeEventTarget,
) {
  // 触发配置
  this.dispatchConfig = dispatchConfig;
  // 对应的 fiber 实例
  this._targetInst = targetInst;
  // 对应的原生事件
  this.nativeEvent = nativeEvent;

  // 随意赋值
  const Interface = this.constructor.Interface;
  for (const propName in Interface) {
    if (!Interface.hasOwnProperty(propName)) {
      continue;
    }
    const normalize = Interface[propName];
    if (normalize) {
      this[propName] = normalize(nativeEvent);
    } else {
      if (propName === 'target') {
        this.target = nativeEventTarget;
      } else {
        this[propName] = nativeEvent[propName];
      }
    }
  }

  // 原生事件的 defaultPrevented 属性（还有这个东西吗 0 0）
  const defaultPrevented =
    nativeEvent.defaultPrevented != null
      ? nativeEvent.defaultPrevented
      : nativeEvent.returnValue === false;

  if (defaultPrevented) {
    this.isDefaultPrevented = functionThatReturnsTrue;
  } else {
    this.isDefaultPrevented = functionThatReturnsFalse;
  }
  // 冒泡始终返回 false
  this.isPropagationStopped = functionThatReturnsFalse;
  return this;
}

// 接口
SyntheticEvent.Interface = EventInterface

// pollyfill 继承
SyntheticEvent.extend = function(Interface) {
  const Super = this;

  const E = function() {};
  E.prototype = Super.prototype;
  const prototype = new E();

  function Class() {
    return Super.apply(this, arguments);
  }
  Object.assign(prototype, Class.prototype);
  Class.prototype = prototype;
  Class.prototype.constructor = Class;

  Class.Interface = Object.assign({}, Super.Interface, Interface);
  Class.extend = Super.extend;
  addEventPoolingTo(Class);

  return Class;
};

Object.assign(SyntheticEvent.prototype, {
  // 代理原生事件的 preventDefault
  preventDefault: function() {
    this.defaultPrevented = true;
    const event = this.nativeEvent;
    if (!event) {
      return;
    }

    if (event.preventDefault) {
      event.preventDefault();
    } else {
      event.returnValue = false;
    }
    this.isDefaultPrevented = functionThatReturnsTrue;
  },

  // 代理原生的 stopPropagation
  stopPropagation: function() {
    const event = this.nativeEvent;
    if (!event) {
      return;
    }

    if (event.stopPropagation) {
      event.stopPropagation();
    } else {
      // The ChangeEventPlugin registers a "propertychange" event for
      // IE. This event does not support bubbling or cancelling, and
      // any references to cancelBubble throw "Member not found".  A
      // typeof check of "unknown" circumvents this issue (and is also
      // IE specific).
      event.cancelBubble = true;
    }

    this.isPropagationStopped = functionThatReturnsTrue;
  },

  /**
   * 在每次事件循环之后，所有被 dispatch 过的合成事件都会被释放
   * 这个函数能够允许一个引用使用事件不会被GC回收
   */
  persist: function() {
    this.isPersistent = functionThatReturnsTrue;
  },

  /**
   * 这个 event 是否会被 GC 回收
   */
  isPersistent: functionThatReturnsFalse,

  /**
   * 销毁实例
   */
  destructor: function() {
    const Interface = this.constructor.Interface;
    for (const propName in Interface) {
      this[propName] = null;
    }
    this.dispatchConfig = null;
    this._targetInst = null;
    this.nativeEvent = null;
    this.isDefaultPrevented = functionThatReturnsFalse;
    this.isPropagationStopped = functionThatReturnsFalse;
    this._dispatchListeners = null;
    this._dispatchInstances = null;
  },
});

// 为合成事件构造函数添加静态属性
// 事件池为所有实例所共用
function addEventPoolingTo (EventConstructor) {
  EventConstructor.eventPool = []
  EventConstructor.getPooled = getPooledEvent
  EventConstructor.release = releasePooledEvent
}

// 为合成事件构造事件池
addEventPoolingTo(SyntheticEvent)

// 获取事件池中的事件
// eg: nativeInst 就是 nativeEventTarget
function getPooledEvent(dispatchConfig, targetInst, nativeEvent, nativeInst) {
  const EventConstructor = this
  if (EventConstructor.eventPool.length) {
    // 从事件池中取出最后一个
    const instance = EventConstructor.eventPool.pop()
    EventConstructor.call(
      instance,
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeInst
    )
    return instance
  }
  return new EventConstructor (
    dispatchConfig,
    targetInst,
    nativeEvent,
    nativeInst
  )
}

// 将事件释放
// 事件池有容量的话，放进事件池
function releasePooledEvent (event) {
  const EventConstructor = this
  event.destructor()
  if (EventConstructor.eventPool.length < EVENT_POOL_SIZE) {
    EventConstructor.eventPool.push(event)
  }
}

export default SyntheticEvent