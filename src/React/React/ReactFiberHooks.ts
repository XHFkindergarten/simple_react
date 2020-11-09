/**
 * Hooks
 */

// state 更新触发函数
type Dispatch<A> = (a: A) => void

// 生成 state 更新的参数 Action
type BasicStateAction<S> = ((s: S) => S) | S

export type Dispatcher = {
  useState<S>(initialState: (() => S) | S): [ S, Dispatch<BasicStateAction<S>>],
  useEffect (
    create: () => (() => void) | void,
    deps: any[] | void | null
  ): void
  // 余下省略
}