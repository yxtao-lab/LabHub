/* 车辆点检：删除挂车独立区域及其设备（半挂改挂到牵引车明细后执行）
   建议先 re-import 牵引车+明细，再执行本脚本。 */
DECLARE @attr NVARCHAR(50) = N'车辆点检';

/* 1) 删除挂车区域下的设备 */
IF COL_LENGTH('dbo.device', 'locationcode') IS NOT NULL
BEGIN
  DELETE d
  FROM dbo.device d
  INNER JOIN dbo.location l ON l.locationcode = d.locationcode
  WHERE l.attribute = @attr
    AND (l.locationcode LIKE N'%挂' OR l.locationname LIKE N'%挂');
END

/* 2) 删除挂车区域（兼容无 attribute 列时按车牌判断） */
IF COL_LENGTH('dbo.location', 'attribute') IS NOT NULL
BEGIN
  DELETE FROM dbo.location
  WHERE attribute = @attr
    AND (locationcode LIKE N'%挂' OR locationname LIKE N'%挂');
END
ELSE
BEGIN
  DELETE FROM dbo.location
  WHERE locationcode LIKE N'%挂' OR locationname LIKE N'%挂';
END
