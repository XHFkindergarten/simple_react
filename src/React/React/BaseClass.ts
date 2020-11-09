/**
 * 基础类React.Component
 */

import { isFunction, isNull, isObject } from "../utils"
import { ReactNoopUpdateQueue } from "./NoopUpdateQueue"

// 在DEV下这个obj应该被freeze
// (为什么生产不需要)
const emptyObject = {}

function Component<P, S> (props, context, updater) {
  // 挂载属性
  this.props = props
  this.context = context
  
  // 初始化refs
  this.refs = emptyObject

  // 我们初始化这个默认的update，真正的updater会被renderer注入
  this.updater = updater || ReactNoopUpdateQueue
}

// 当我们需要判断一个组件是Class还是FC的时候，就判断这个属性
// question: 为什么不是一个布尔值呢
Component.prototype.isReactComponent = {}


/**
 * @description 更新组件state
 * @param { object | Function } partialState 下个阶段的状态
 * @param { ?Function } callback 更新完毕之后的回调
 */
Component.prototype.setState = function (partialState, callback) {
  if (!(
    isObject(partialState) ||
    isFunction(partialState) ||
    isNull
  )) {
    console.warn('setState的第一个参数应为对象、函数或null')
    return
  }
  this.updater.enqueueSetState(this, partialState, callback, 'setState')
}

/**
 * @description 强制更新
 * @param { ?Function } callback 更新后回调
 * @final
 * @protected
 */
Component.prototype.forceUpdate = function (callback) {
  this.updater.enqueueForceUpdate(this.callback, 'forceUpdate')
}

// 经典组合寄生式继承
function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype

// 构造一个实例作为原型链对象
// 构造函数 - 原型对象 互相绑定
const pureComponentPrototypeObj = PureComponent.prototype = new ComponentDummy()
pureComponentPrototypeObj.constructor = PureComponent

/**
 * 纯纯的组件
 */
function PureComponent (props, context, updater) {
  // 挂载属性
  this.props = props
  this.context = context

  this.ref = emptyObject
  this.updater = updater || ReactNoopUpdateQueue
}

// 防止prototype jump(是什么？)
Object.assign(pureComponentPrototypeObj, Component.prototype)

// 标记为PureComponent
// 说明isReactComponent是个对象应该有什么用途?
pureComponentPrototypeObj.isPureComponent = true

export {
  Component,
  PureComponent
}
