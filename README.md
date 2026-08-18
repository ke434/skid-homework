# Skid-Homework｜智启高效学习新范式

> 以技术重构学习流程，打造轻量化 AI 作业与错题管理云平台，让每一次练习，都成为能力跃升的基石。

访问地址：**http://111.229.11.169:3000**

[ENGLISH README](/README-EN.md)

## 平台简介

Skid-Homework 是一款面向学生与自学者的开源 AI 学习工作台。它摒弃笨重客户端，无需安装、注册即用，把作业解析、错题归档与知识复盘汇入同一个云端空间，将错题、习题与解题思路统一收纳，沉淀为你的个人数字学习知识库。

平台不止输出答案，更注重引导思考：通过智能识别与分步解析，帮你看清解题逻辑、定位知识漏洞，告别机械抄题与低效刷题，形成“发现问题—分析错因—巩固强化”的完整学习闭环。

## 核心能力亮点

✅ **多源智能识别录入** — 图片 / PDF 拖拽上传，OCR 识别试题，快速导入习题与错题，告别手抄整理。

✅ **AI 深度解题推演** — 接入大模型，既可输出完整标准步骤，也可生成思路提示与启发式引导，适配自学、作业自查、错题复盘等场景，鼓励主动思考而非照搬答案。

✅ **云端错题本体系** — 错题云端存储、永久留存，随时调取复盘，精准定位薄弱知识点。

✅ **极致流畅操作体验** — 纯浏览器运行、无多余遥测，守护学习数据隐私；完整快捷键体系、暗色模式与响应式布局，适配各类屏幕。

✅ **轻量化开源架构** — 简洁高效、开箱即用，去除冗余花哨功能，把算力留给真正的学习。

## 适合人群

🎓 中小学生：作业自查、错题整理，梳理知识漏洞
📖 自学备考者：刷题复盘，沉淀个人习题知识库
👨‍👩‍👧‍👦 家长辅导：辅助分析题目，引导孩子建立解题思维

## 立即体验

🌐 访问地址：http://111.229.11.169:3000

开启你的专属错题本，即刻开始高效学习。

> 把重复交给工具，把思考留给自己 —— Skid-Homework，你的云端 AI 学习工作台。

## 默认快捷键说明

> 注: 如果浏览器占用了某个快捷键或者感觉快捷键不顺手, 可以在设置中进行修改!

| 快捷键              | 说明                    |
| ------------------- | ----------------------- |
| Ctrl+1              | 上传文件                |
| Ctrl+2              | 拍照                    |
| Ctrl+3              | 将文件提交给AI          |
| Ctrl+4              | 删除所有文件            |
| Ctrl+5              | 打开设置页面            |
| Ctrl+X              | 打开全局提示词编辑器    |
| ESC                 | 关闭设置页面/当前对话框 |
| 空格                | 下一个题目              |
| Shift+空格          | 上一个题目              |
| Tab/RightArrow      | 下一个文件              |
| Shift+Tab/LeftArrow | 上一个文件              |
| /                   | 改进答案                |

### 工具快捷键说明

- [JSXGraph](docs/zh/shortcuts/jsxgraph.md)

## 常见问题

### 画图工具支持情况

> 注: 部分 AI 有时会输出错误的工具调用, 若遇到问题请反馈

- [JSXGraph](https://github.com/jsxgraph/jsxgraph) (unstable)
- [Mermaid](https://mermaid.js.org/)
- [function-plot](https://github.com/mauriciopoppe/function-plot)
  (逐步弃用, 后续将替换为 JSXGraph)
- [SVG](https://www.w3.org/Graphics/SVG/)

### 为什么如此之慢

本软件使用 LLM 而并非题库

LLM 响应耗费时间通常比题库长

没有什么特别好的优化方法

不过可以尝试缩小 Thinking Budget, 太小的值可能会让 AI 输出错误结果

同时, 如果不需要详细的解析可以尝试如下 prompt (Ctrl+X 提示词编辑器输入即可)

```text
用中文输出答案
只需要输出答案即可，选择题不需要输出解析(留白即可)
```

### 为什么总是失败

- 检查 API 是否放开了 Cors 限制
- 检查你的 IP 是否被服务商拉黑
- 检查 API Key 是否有效
- 检查 Devtools (F12) 日志

### 我的电脑上没有摄像头, 请帮帮我

我们支持 ADB, 可以连接你的安卓手机进行屏幕截图, 需要浏览器支持 WebUSB

此过程在本地进行, 不会窃取隐私。

如果使用苹果手机/postmarketOS 可以尝试 [KDE Connect](https://kdeconnect.kde.org/)

### 老师不喜欢我的答案风格/答案风格不符合我的预期

本站点默认不自带默认的答案风格, 和传统题库相比开箱即用没那么强, 但可自定义性高

你可以点击界面中的`编辑全局Prompt` (Ctrl+X) 来编辑提示词

可以写你特殊的需求, 例如答案风格

如果只是对某一道题目的解答不满意可以按`/` (改进答案) 来提出改进需求让AI重写

### 我没有API Key

Gemini API Key 是免费的, 可以去申请

如果环境不允许没办法, 不过可以用 Cloudflare 搞反向代理, 方法请自行查找

### 请求失败

如果你的 API 密钥和地址都正确的话, 大概率是 Cors 干的

这是浏览器的问题, 你可以尝试本地搭建反向代理.

如果是其他问题请携带 Devtools (F12) 日志开 issue.

### OCR 是怎么实现的

现在站点会将图片直接发送给 AI

如果你有更好的方案请开 pr/issues

### 比传统软件(例如作业帮)强大在哪里

- 电脑可用
- 有针对写作业场景设计的人体工程学
- 支持绘图
- 开源, 无广告

### 我还是觉得其他搜题软件好用怎么办

那就接着用你喜欢的工具就可以了, 工具是为人服务的, 用得顺手才适合

### Dev mode 是什么

我们在软件里写了一些功能方便我们调试

如果使用没有问题, 请不要打开该选项

功能如下

- 查看原始 Markdown

### 我还有其他问题

> 如果你发现了 Bug, 请到 [issues](https://github.com/ke434/skid-homework/issues) 反馈, 否则请移步讨论区.

请移步 [讨论区](https://github.com/ke434/skid-homework/discussions)

## 和我们一起交流

- [GitHub Issues](https://github.com/ke434/skid-homework/issues) (反馈 Bug、提出建议)
- [GitHub 讨论区](https://github.com/ke434/skid-homework/discussions)

## 安全提示

本平台不会要求你下载任何桌面软件，一切功能都在浏览器内运行。

如果某个站点要求你下载软件来使用本平台，可能为病毒。

我们只有一个地址和一个仓库：

- 地址：[http://111.229.11.169:3000](http://111.229.11.169:3000)
- 仓库：[https://github.com/ke434/skid-homework](https://github.com/ke434/skid-homework)

## 开发

- Clone 本存储库
- 运行 `pnpm i`
- 运行 `pnpm run dev` 来预览

欢迎 PR

### 快速部署(使用 Vercel)

请点击下方按钮

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fke434%2Fskid-homework)

### 构建 Docker 映像并运行

容器开放 `3000` 端口.

```shell
docker build -t skid-homework .
docker run -p 3000:3000 skid-homework
```

```yaml
services:
  skidhw:
    build: .
    ports:
      - 3000:3000
```

### I18N 类型报错

请在修改 i18n 文件之后运行如下命令更新类型

```shell
pnpx i18next-cli types
```

## License

This work is licensed under GPL-3.0

You're allowed to use, share and modify.
