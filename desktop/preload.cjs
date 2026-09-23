/**
 * 预加载脚本：向页面暴露有限桌面能力（选目录 / 持久化数据目录 / 重启）。
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('labhubDesktop', {
  /**
   * 弹出系统目录选择框。
   *
   * @param options - 可选标题
   * @returns 选中的绝对路径；取消则为 null
   */
  selectDirectory: (options) => ipcRenderer.invoke('labhub:select-directory', options ?? {}),

  /**
   * 将数据目录写入注册表与安装目录指针，供下次启动读取。
   *
   * @param dataDir - 新数据根
   * @returns 结果
   */
  persistDataDir: (dataDir) => ipcRenderer.invoke('labhub:persist-data-dir', dataDir),

  /**
   * 重启应用以使新数据目录生效。
   *
   * @returns {void}
   */
  relaunch: () => ipcRenderer.invoke('labhub:relaunch'),
});
