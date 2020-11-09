// 可以转换成 string 的类型
export type ToStringValue = 
  | boolean
  | number
  | object
  | string
  | null
  | void

// TrustedValue 可以被放心的当做 string 来使用
// 因为它自身自带了 toString 或者 valueOf 方法
export type TrustedValue = { toString(): string, valueOf(): string }