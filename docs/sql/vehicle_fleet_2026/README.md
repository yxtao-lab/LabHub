# 2026 车辆台账导入包（仅新增）

来源：
- `1.车辆及驾驶员台账2026(1)(1).xlsx` 工作表 **自有台账**（仅自有台账）
- 建模：**牵引车/单车 = 1 区域 + 1 主设备**；**半挂车 = 牵引车的设备明细**（不占区域）
- 区域「管理员」= 台账 **车辆所属**（如车管部）；「分类」= **排放标准**
- `_tmp_checklist.xlsx`（点检规则 × 通用 + 各车辆类型）

统计：{'ledger_rows': 189, 'locations_main': 109, 'trailer_details': 80, 'orphan_trailers': 6, 'emission_categories': 6, 'checklist_items': 1, 'device_types': 9}

## 推荐执行顺序

1. **模板**：按 `04_template.md` 在 PC 新增「车辆点检」模板（或代码种子落库）。
2. **字典**：在库执行 `01_device_types.sql`（或 PC 字典管理 `device_type` 逐条新增）。
3. **区域**：执行 `03_locations.sql`，或 PC 导入 `locations_import.csv`（**仅主车**，约 109 条）。
4. **设备**：执行 `04_devices.sql`，或 PC 导入 `devices_import.csv`。
5. **挂车明细**：PC 导入 `device_details_import.csv`（80 条挂车绑定牵引车 devicecode）。
6. **规则**：执行 `02_inspection_rules.sql`，或在 PC「规则管理」按设备类型维护。
7. **清理旧数据**（若曾按「挂车也建区域」导入过）：执行 `05_cleanup_trailer_locations.sql`（**先备份**）。

一键入库（配置 pic-serve `.env.local` 的 MSSQL 后）：

```bash
node scripts/import-vehicle-fleet/run_vehicle_fleet_import.cjs
```

若曾按「一线路一区域」导入过，可在 PC 删除名称以 `车辆点检-` 开头的旧区域（23 条），或保留后手工清理；新编码按车号生成，不会覆盖旧线路区域。

## 注意

- 全部脚本 **NOT EXISTS / 判重插入**，不修改、不删除既有数据。
- 规则表需含 `devicetype`、`class`、`rulecontent`（与 PC 规则管理一致）；旧表仅 `deviceid+content` 时请走 PC 界面导入。
- 设备「类型」列与 `sys_dict_data.dict_value` 一致，扫码点检按设备类型匹配规则；`车辆点检-通用` 为共用规则集。

重新生成：

```bash
python scripts/import-vehicle-fleet/generate_vehicle_import.py \
  --ledger "E:/Desktop/1.车辆及驾驶员台账2026(1).xlsx" \
  --checklist "E:/Desktop/车辆点检表（司机自检用）.xlsx"
```
