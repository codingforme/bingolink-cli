# bui-weex-toolkit

> bui-weex-toolkit 是 配合 bui-weex 框架使用的命令行工具

# 命令行使用

## 安装

```bash
npm install -g bui-weex-toolkit
```

## 使用

```bash
bui-weex -v // 查看当前toolkit版本

bui-weex -h // 命令帮助信息

bui-weex create <projectName> [version] // 创建bui-weex示例工程，可以指定版本

bui-weex list // 显示可用的版本

bui-weex list-template // 显示模版工程里可用的模版

```

# API 使用

## 安装

```bash
npm install bui-weex-toolkit --save
```

## 使用

除了全局安装在命令行使用，你也可以在代码中调用 API 使用，例如

```js
const TemplateRelease = require('bui-weex-toolkit').TemplateRelease;
const templateRelease = new TemplateRelease('bui-weex', 'https://api.github.com/repos/bingo-oss/bui-weex-template/releases');
// templateRelease.fetchRelease(...)
```
