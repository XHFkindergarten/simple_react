// React根节点类型
export enum RootTag {
  LegacyRoot = 0,
  BatchedRoot = 1,
  ConcurrentRoot = 2
}

export type RootOptions = {
  hydrate?: boolean,
  hydrateOptions?: any
}