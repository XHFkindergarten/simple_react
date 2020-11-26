# 懒人调试 React 仓库

> ✨ React 16.8

用于服务公众号文章 [React入门儿](https://mp.weixin.qq.com/s/OBE1dIF7QSgRuaAkwaFwxQ)

## 启动

```linux
yarn
yarn run build
yarn start
```

## _

使用 `Snowpack` 打包，支持动态调试。喜欢调试源码请参考 [React技术解密: 代码调试](https://react.iamkasong.com/preparation/source.html#%E6%8B%89%E5%8F%96%E6%BA%90%E7%A0%81)

PS: 因为 `Snowpack` 的 bug，在引入类型变量时必须写成 

```
import type { Doc } from './doc'
```

这篇文章是我自己学习 React 的时候，根据目前在看的功能，把对应的代码复制过来，补全了一些 TS 类型。但是应该漏了不少代码，所以只能跑通两个简单的样例。

有兴趣的话可以一边对照着源码一边自己补全，还是很有意思的一件事情 ^ ^.
