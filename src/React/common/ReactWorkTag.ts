export enum WorkTag {
  FunctionComponent = 0,
  ClassComponent = 1,
  IndeterminateComponent = 2, // 还不知道是Funciton还是Class
  HostRoot = 3, // 根节点
  HostPortal = 4,
  HostComponent = 5,
  HostText = 6,
  Fragment = 7,
  Mode = 8,
  ContextConsumer = 9,
  ContextProvider = 10,
  ForwardRef = 11,
  Profiler = 12,
  SuspenseComponent = 13,
  MemoComponent = 14,
  SimpleMemoComponent = 15,
  LazyComponent = 16,
  IncompleteClassComponent = 17,
  DehydratedFragment = 18,
  SuspenseListComponent = 19,
  FundamentalComponent = 20,
  ScopeComponent = 21,
}