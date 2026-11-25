/* 车辆台账 device_type — 仅 INSERT 缺失项，不 UPDATE/DELETE 既有字典 */
DECLARE @types TABLE (dict_sort INT, dict_label NVARCHAR(200));
INSERT INTO @types VALUES (3000, N'车辆点检-通用');
INSERT INTO @types VALUES (3001, N'重型半挂牵引车');
INSERT INTO @types VALUES (3002, N'重型自卸半挂车');
INSERT INTO @types VALUES (3003, N'重型厢式半挂车');
INSERT INTO @types VALUES (3004, N'重型集装箱半挂车');
INSERT INTO @types VALUES (3005, N'重型厢式货车');
INSERT INTO @types VALUES (3006, N'重型普通货车');
INSERT INTO @types VALUES (3007, N'重型低平板半挂车');
INSERT INTO @types VALUES (3008, N'轻型厢式货车');

INSERT INTO dbo.sys_dict_data (
  dict_sort, dict_label, dict_value, dict_type, status, create_by, create_time, remark
)
SELECT t.dict_sort, t.dict_label, t.dict_label, N'device_type', 0, N'admin', GETDATE(),
  N'2026车辆台账导入'
FROM @types t
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.sys_dict_data d
  WHERE d.dict_type = N'device_type'
    AND (d.dict_label = t.dict_label OR d.dict_value = t.dict_label)
);