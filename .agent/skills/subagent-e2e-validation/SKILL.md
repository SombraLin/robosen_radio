---
name: subagent-e2e-validation
description: 指导如何安全且正确地使用 browser_subagent 进行端到端（E2E）UI测试，重点总结了不要过度 Mock 原生浏览器 API（如 Audio, fetch）以防止出现假阳性（False Positive）测试结果的经验教训。
---

# 浏览器前端端到端 (E2E) 测试规范与自测指南

在使用 `browser_subagent` 对基于 React/Vue 等框架的前端应用进行自动化端到端测试时，我们极其容易因为追求“跑通流程”和“非阻塞”而落入**过度模拟 (Over-Mocking)** 的陷阱。

本 Skill 旨在总结过往开发中踩过的“血的教训”，作为以后每次执行 UI 测试和自测任务时的必读参考规范。

## 一、 核心反面教材：Audio Mock 导致假阳性 (False Positive)

### 🚨 事故回放
在过去测试频道音频播放（需要验证 TTS 模式和物理音频模式是否能正确切换发声）时，测试机器人为了防止由于无法加载物理音频卡死流程，注入了以下 Mock 脚本：

```javascript
// 【错误示范】过度 Mock 掩盖了真实的异常！
window.origAudio = window.Audio;
window.Audio = function(url) {
  window.testLogs.push({ type: 'audio_play', url });
  const a = new window.origAudio(url);
  a.play = async () => {}; // 强行将真实的播放动作替换为永远成功的空 Promise
  return a;
};
```

### 💣 导致的严重后果
1. **隐藏了 404/网络异常**：物理音频实际上加载失败了（404），但因为 `play()` 被修改为了自动成功的空 `Promise`，前端的 `.catch()` 错误捕捉回调永远不会被执行。
2. **隐藏了回退逻辑 Bug**：因为没有抛出异常，React 代码里的 `audio.onerror` 永远无法触发。原本前端在 `onerror` 时会错误地回退调用 `/tts/preview` 接口（导致选了物理音频却播报 TTS 的严重业务异常）。
3. **测试报告“虚假繁荣”**：测试结果认为“发出了正确的音频 URL，测试通过”，但真实的物理音频不仅没发声，还串台播出了错误的数据。

## 二、 Browser Subagent 测试黄金法则

### 法则 1：决不可 Mock 被测路径的“失败边界”
如果你需要验证一个组件在某种特定操作下的反馈，绝对不能修改浏览器原生的 `fetch`, `Audio`, `Video`, `XMLHttpRequest` 接口返回成功状态。
- **推荐做法**：使用**纯侦听（Spy）模式**，不要干预执行结果。

```javascript
// 【正确示范】只侦听，不篡改
window.testLogs = [];
// 1. 侦听 Fetch
const origFetch = window.fetch;
window.fetch = async (...args) => {
  const url = args[0];
  if(typeof url === 'string' && url.includes('/api/')) {
    window.testLogs.push({ url, timestamp: Date.now() });
  }
  return origFetch(...args); // 原样返回，保留 404、500 等真实情况
};

// 2. 侦听 Audio
window.origAudio = window.Audio;
window.Audio = function(url) {
  window.testLogs.push({ event: 'audio_created', url });
  const a = new window.origAudio(url);
  
  // 必须监听真实的错误，收集到 testLogs 中！
  a.addEventListener('error', (e) => {
    window.testLogs.push({ event: 'audio_error', url });
  });
  // 注意：不要覆盖 a.play() !
  return a;
};
```

### 法则 2：UI 测试必须基于“真实 DOM 交互”优先
尽量使用原生事件来模拟用户点击和输入，确保 React/Vue 能够正确捕获到合成事件。
```javascript
// 触发文本框更新的正确姿势
const ta = document.querySelector('textarea');
const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
nativeSetter.call(ta, '真实的测试文本');
// 触发 React 状态绑定
ta.dispatchEvent(new Event('input', { bubbles: true }));
ta.dispatchEvent(new Event('change', { bubbles: true }));
```

### 法则 3：核验结果必须包含错误日志断言
每次测试不仅要断言“期待的请求发出了”，还必须**断言“不期待的错误/请求没有发出”**。

在分析 `window.testLogs` 时：
1. 检查 `audio_error` 是否发生。
2. 检查**控制台 (console.error)** 是否存在未捕获的报错。你可以劫持 `console.error` 并写入 log 中返回给 Subagent。
3. 检查是否有“意料之外”的后备请求（Fallback Requests）被悄悄发出。

## 三、 自测 Checklist

下次接收到类似 `/goal 测试某页面所有按钮` 或 `测试播放功能` 的指令时，使用本 Skill 指南：
- [ ] 我是否只使用了 Spy（间谍侦听）而非 Mock（功能篡改）？
- [ ] 如果该操作失败（例如网络不通、资产不存在），测试脚本会如何体现？是否会被吃掉异常？
- [ ] 按钮点击是否触发了正确的状态同步？
- [ ] 测试后是否验证了 `console.error` 内没有意外的红字堆栈？
