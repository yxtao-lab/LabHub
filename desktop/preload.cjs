/**
 * 预加载脚本：向页面暴露有限桌面能力（选目录），其余管理仍走 /api。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('labhubDesktop', {
  /**
   * 弹出系统目录选择框。
   *
   * @returns 选中的绝对路径；取消则为 null
   */
  selectDirectory: () => ipcRenderer.invoke('labhub:select-directory'),
});
