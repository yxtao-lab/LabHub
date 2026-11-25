/* 车辆点检规则 inspectionrules — 仅 INSERT，按 devicetype+class+rulecontent 判重 */
/* 若库表仍为 deviceid+content 旧结构，请改走 PC 规则管理导入或扩展列后再执行 */

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'车辆点检-通用' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'车辆点检-通用', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型半挂牵引车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型半挂牵引车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型自卸半挂车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型自卸半挂车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型厢式半挂车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型厢式半挂车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型集装箱半挂车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型集装箱半挂车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型厢式货车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型厢式货车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型普通货车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型普通货车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'重型低平板半挂车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'重型低平板半挂车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO

IF COL_LENGTH('dbo.inspectionrules', 'devicetype') IS NOT NULL
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM dbo.inspectionrules
    WHERE devicetype = N'轻型厢式货车' AND [class] = N'点检项' AND rulecontent = N'身体无不适'
  )
  INSERT INTO dbo.inspectionrules (devicetype, [class], rulecontent, status, creator, creationtime, updatetime)
  VALUES (N'轻型厢式货车', N'点检项', N'身体无不适', 0, N'陶永鑫', GETDATE(), GETDATE());
END
GO
