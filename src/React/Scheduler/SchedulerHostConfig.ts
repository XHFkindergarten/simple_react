/**
 * Schedule 适配 native 环境
 */

// 原则上这些函数的函数体要根据是否处于浏览器环境来判断
// 目前姑且只讨论浏览器环境好了

let taskTimeoutID: NodeJS.Timeout | -1 = -1

// 当前被计划好的回调
// 接收两个参数
// 1. 是否还有时间剩余 hasTimeRemaining
// 2. 当前的时间      currentTime
export let scheduledHostCallback: 
  ((hasTimeRemaining: boolean, currentTime: number) => boolean) | null = null

// 获取当前线程运行时间(webkit 环境)
export let getCurrentTime: () => number = () => performance.now()

// 此时是否是 【时间片阻塞】区间
export function shouldYieldToHost () {
  return getCurrentTime() >= deadline
}

// 在没有 navigator.scheduling.isInputPending 的环境里，这个函数是木大哒
export function requestPaint () {}


// 在拥有 Message Channel 的环境下
const channel = new MessageChannel()
// 发送端
const port = channel.port2
// 接收端
channel.port1.onmessage = performWorkUntilDeadline

// 信道通信是异步状态，在发送过程中需要阻塞
let isMessageLoopRunning = false

// 在若干个事件循环后执行这个回调，保证多个 callback 有序的执行
export function requestHostCallback (cb) {
  scheduledHostCallback = cb
  if (!isMessageLoopRunning) {
    // 更改
    isMessageLoopRunning = true
    port.postMessage(null)
  }
}

// 取消回调
// 将一个已经计划好的回调取消
export function cancelHostCallback () {
  scheduledHostCallback = null
}

// 设定一个计时任务
export function requestHostTimeout (cb, ms) {
  taskTimeoutID = setTimeout(() => {
    cb(getCurrentTime())
  }, ms)
}
// 取消一个计时任务
export function cancelHostTimeout () {
  clearTimeout(taskTimeoutID as NodeJS.Timeout)
  taskTimeoutID = -1
}

// 源码还判断了浏览器环境有没有 navigator.scheduling.isInputPending 函数
// 查了下是 facebook 19年8月 和 chrome 联合推出的 API
// 目前大部分浏览器都没有支持


// 记录任一时间片的过期时刻
let deadline = 0

// 单位时间切片长度
let yieldInterval = 5

// 执行任务直到用尽当前帧空闲时间
function performWorkUntilDeadline () {
  if (scheduledHostCallback !== null) {
    // 如果有计划任务，那么需要执行
    
    // 当前时间
    const currentTime = getCurrentTime()

    // 在每个时间片之后阻塞(5ms)
    // deadline 为这一次时间片的结束时间
    deadline = currentTime + yieldInterval

    // 既然能执行这个函数，就代表着还有时间剩余
    const hasTimeRemaining = true

    try {
      // 将当前阻塞的任务计划执行
      const hasMoreWork = scheduledHostCallback(
        hasTimeRemaining,
        currentTime
      )
      
      if (!hasMoreWork) {
        // 如果没有任务了, 清空数据
        isMessageLoopRunning = false
        scheduledHostCallback = null
      } else {
        // 如果还有任务，在当前时间片的结尾发送一个 message event
        port.postMessage(null)
      }
    } catch (error) {
      port.postMessage(null)
      throw(error)
    }
  } else {
    // 压根没有任务，不执行
    isMessageLoopRunning = false
  }
}
