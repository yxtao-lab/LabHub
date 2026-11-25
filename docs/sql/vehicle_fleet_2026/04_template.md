# 车辆点检模板（inserttemplate）

在 PC「巡检模板」中新增，或使用接口 `POST /inserttemplate`：

| 字段 | 值 |
|------|-----|
| name | 车辆点检 |
| details | 车辆点检（司机自检） |
| description | 武汉中铁伊通钢铁物流事业部车辆日检，对照司机自检确认表执行；适用于各线路道路运输车辆，异常即时上报。 |
| region | 车辆点检 |
| status | 1 |
| files | 上传封面图 URL（pic-serve /upload） |

模板编码建议：`tpl-vehicle-driver-check`（与种子常量一致）。

区域导入后 `attribute` / `locationtype` 建议填 **车辆点检**，与模板 region 一致，便于列表筛选。
