/* device — 每区域一台主车（牵引/单车）；半挂车见 devicedetails */
DECLARE @hasDeviceType BIT = CASE WHEN COL_LENGTH('dbo.device', 'devicetype') IS NULL THEN 0 ELSE 1 END;
IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AAA663'
  WHERE d.devicename = N'鄂AAA663'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAA663', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAA663';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAA663', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAA663';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AUZ656'
  WHERE d.devicename = N'鄂AUZ656'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUZ656', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUZ656';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUZ656', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUZ656';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AEY611'
  WHERE d.devicename = N'鄂AEY611'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AEY611', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AEY611';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AEY611', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AEY611';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AZA236'
  WHERE d.devicename = N'鄂AZA236'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZA236', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZA236';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZA236', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZA236';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ATV567'
  WHERE d.devicename = N'鄂ATV567'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATV567', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATV567';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATV567', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATV567';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AKA556'
  WHERE d.devicename = N'鄂AKA556'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKA556', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKA556';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKA556', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKA556';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AKE162'
  WHERE d.devicename = N'鄂AKE162'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKE162', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKE162';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKE162', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKE162';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABR021'
  WHERE d.devicename = N'鄂ABR021'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABR021', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABR021';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABR021', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABR021';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ARZ299'
  WHERE d.devicename = N'鄂ARZ299'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ARZ299', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ARZ299';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ARZ299', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ARZ299';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AKK605'
  WHERE d.devicename = N'鄂AKK605'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKK605', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKK605';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKK605', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKK605';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADP251'
  WHERE d.devicename = N'鄂ADP251'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADP251', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADP251';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADP251', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADP251';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABZ538'
  WHERE d.devicename = N'鄂ABZ538'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABZ538', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4170H5AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABZ538';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABZ538', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4170H5AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABZ538';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AQJ238'
  WHERE d.devicename = N'鄂AQJ238'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQJ238', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQJ238';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQJ238', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQJ238';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYD271'
  WHERE d.devicename = N'鄂AYD271'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYD271', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYD271';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYD271', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYD271';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANT506'
  WHERE d.devicename = N'鄂ANT506'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANT506', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ5250XYKH5CC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANT506';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANT506', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ5250XYKH5CC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANT506';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A30057D'
  WHERE d.devicename = N'鄂A30057D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A30057D', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A30057D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A30057D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A30057D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A33369D'
  WHERE d.devicename = N'鄂A33369D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A33369D', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A33369D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A33369D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A33369D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A32365D'
  WHERE d.devicename = N'鄂A32365D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A32365D', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A32365D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A32365D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A32365D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A35708D'
  WHERE d.devicename = N'鄂A35708D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A35708D', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A35708D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A35708D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A35708D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A35768D'
  WHERE d.devicename = N'鄂A35768D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A35768D', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A35768D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A35768D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFD5180XYKLBEV1', N'华神牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A35768D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADZ067'
  WHERE d.devicename = N'鄂ADZ067'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADZ067', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADZ067';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADZ067', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADZ067';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYB328'
  WHERE d.devicename = N'鄂AYB328'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYB328', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYB328';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYB328', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYB328';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AST007'
  WHERE d.devicename = N'鄂AST007'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AST007', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4170H5AC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AST007';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AST007', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4170H5AC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AST007';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANB683'
  WHERE d.devicename = N'鄂ANB683'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANB683', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANB683';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANB683', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANB683';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANX588'
  WHERE d.devicename = N'鄂ANX588'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANX588', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANX588';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANX588', 1, N'陶永鑫', GETDATE(), GETDATE(), N'DFH4250D19', N'东风牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANX588';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ASD681'
  WHERE d.devicename = N'鄂ASD681'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASD681', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASD681';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASD681', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4150M3AB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASD681';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AZY821'
  WHERE d.devicename = N'鄂AZY821'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZY821', N'重型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ5250XYKH5CC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZY821';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZY821', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ5250XYKH5CC1', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZY821';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AHS501'
  WHERE d.devicename = N'鄂AHS501'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AHS501', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AHS501';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AHS501', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AHS501';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACH059'
  WHERE d.devicename = N'鄂ACH059'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACH059', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACH059';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACH059', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACH059';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACH087'
  WHERE d.devicename = N'鄂ACH087'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACH087', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACH087';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACH087', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4250MC4B', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACH087';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AMP810'
  WHERE d.devicename = N'鄂AMP810'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AMP810', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4257N3247E1H', N'豪沃牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AMP810';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AMP810', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4257N3247E1H', N'豪沃牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AMP810';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AMP368'
  WHERE d.devicename = N'鄂AMP368'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AMP368', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4257N3247E1H', N'豪沃牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AMP368';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AMP368', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4257N3247E1H', N'豪沃牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AMP368';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AFR528'
  WHERE d.devicename = N'鄂AFR528'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AFR528', N'重型普通货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HFC1311P1K2H45S3V', N'江淮牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AFR528';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AFR528', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HFC1311P1K2H45S3V', N'江淮牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AFR528';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABG170'
  WHERE d.devicename = N'鄂ABG170'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABG170', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABG170';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABG170', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABG170';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYH625'
  WHERE d.devicename = N'鄂AYH625'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYH625', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYH625';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYH625', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYH625';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANH795'
  WHERE d.devicename = N'鄂ANH795'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANH795', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANH795';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANH795', 1, N'陶永鑫', GETDATE(), GETDATE(), N'ZZ4256V324HF1B', N'汕德卡牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANH795';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AZC979'
  WHERE d.devicename = N'鄂AZC979'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZC979', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZC979';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZC979', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZC979';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AHF228'
  WHERE d.devicename = N'鄂AHF228'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AHF228', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AHF228';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AHF228', 1, N'陶永鑫', GETDATE(), GETDATE(), N'LZ4250H5DB', N'乘龙牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AHF228';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABG2809'
  WHERE d.devicename = N'鄂ABG2809'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABG2809', N'轻型厢式货车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'CA5048XXYP40L2BEVA85', N'解放牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABG2809';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABG2809', 1, N'陶永鑫', GETDATE(), GETDATE(), N'CA5048XXYP40L2BEVA85', N'解放牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABG2809';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADZ735'
  WHERE d.devicename = N'鄂ADZ735'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADZ735', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADZ735';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADZ735', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADZ735';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AVV520'
  WHERE d.devicename = N'鄂AVV520'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVV520', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVV520';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVV520', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVV520';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANW238'
  WHERE d.devicename = N'鄂ANW238'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANW238', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANW238';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANW238', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANW238';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AQN921'
  WHERE d.devicename = N'鄂AQN921'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQN921', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQN921';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQN921', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQN921';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ATD852'
  WHERE d.devicename = N'鄂ATD852'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATD852', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATD852';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATD852', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATD852';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYS941'
  WHERE d.devicename = N'鄂AYS941'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYS941', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYS941';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYS941', 1, N'陶永鑫', GETDATE(), GETDATE(), N'BJ4259Y6DAM-01', N'欧曼牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYS941';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACZ996'
  WHERE d.devicename = N'鄂ACZ996'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACZ996', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACZ996';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACZ996', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACZ996';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ARV813'
  WHERE d.devicename = N'鄂ARV813'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ARV813', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ARV813';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ARV813', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ARV813';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADB852'
  WHERE d.devicename = N'鄂ADB852'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADB852', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADB852';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADB852', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADB852';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AEW705'
  WHERE d.devicename = N'鄂AEW705'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AEW705', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AEW705';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AEW705', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AEW705';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂APV264'
  WHERE d.devicename = N'鄂APV264'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APV264', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APV264';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APV264', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APV264';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACR825'
  WHERE d.devicename = N'鄂ACR825'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACR825', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACR825';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACR825', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACR825';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AFG246'
  WHERE d.devicename = N'鄂AFG246'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AFG246', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AFG246';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AFG246', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AFG246';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ATQ579'
  WHERE d.devicename = N'鄂ATQ579'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATQ579', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATQ579';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATQ579', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATQ579';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂APT939'
  WHERE d.devicename = N'鄂APT939'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APT939', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APT939';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APT939', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APT939';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACR788'
  WHERE d.devicename = N'鄂ACR788'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACR788', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACR788';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACR788', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACR788';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AUZ187'
  WHERE d.devicename = N'鄂AUZ187'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUZ187', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUZ187';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUZ187', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUZ187';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADS237'
  WHERE d.devicename = N'鄂ADS237'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADS237', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADS237';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADS237', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADS237';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AST044'
  WHERE d.devicename = N'鄂AST044'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AST044', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AST044';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AST044', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AST044';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AAS697'
  WHERE d.devicename = N'鄂AAS697'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAS697', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAS697';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAS697', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAS697';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AER118'
  WHERE d.devicename = N'鄂AER118'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AER118', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AER118';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AER118', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AER118';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AZB047'
  WHERE d.devicename = N'鄂AZB047'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZB047', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZB047';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AZB047', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AZB047';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADW070'
  WHERE d.devicename = N'鄂ADW070'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADW070', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADW070';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADW070', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADW070';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AAD182'
  WHERE d.devicename = N'鄂AAD182'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAD182', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAD182';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAD182', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAD182';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYT716'
  WHERE d.devicename = N'鄂AYT716'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYT716', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYT716';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYT716', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYT716';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ASS948'
  WHERE d.devicename = N'鄂ASS948'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASS948', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASS948';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASS948', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASS948';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂APD890'
  WHERE d.devicename = N'鄂APD890'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APD890', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APD890';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APD890', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APD890';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂APG245'
  WHERE d.devicename = N'鄂APG245'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APG245', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APG245';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APG245', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APG245';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANJ036'
  WHERE d.devicename = N'鄂ANJ036'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANJ036', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANJ036';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANJ036', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANJ036';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AQV297'
  WHERE d.devicename = N'鄂AQV297'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQV297', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQV297';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQV297', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQV297';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACX891'
  WHERE d.devicename = N'鄂ACX891'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACX891', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACX891';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACX891', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACX891';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AJV375'
  WHERE d.devicename = N'鄂AJV375'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AJV375', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AJV375';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AJV375', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AJV375';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ANR025'
  WHERE d.devicename = N'鄂ANR025'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANR025', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANR025';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ANR025', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ANR025';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACA470'
  WHERE d.devicename = N'鄂ACA470'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACA470', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACA470';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACA470', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACA470';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AAX248'
  WHERE d.devicename = N'鄂AAX248'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAX248', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAX248';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAX248', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAX248';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AER012'
  WHERE d.devicename = N'鄂AER012'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AER012', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AER012';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AER012', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AER012';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂APY849'
  WHERE d.devicename = N'鄂APY849'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APY849', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APY849';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂APY849', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂APY849';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ATD973'
  WHERE d.devicename = N'鄂ATD973'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATD973', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATD973';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ATD973', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ATD973';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYF665'
  WHERE d.devicename = N'鄂AYF665'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYF665', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYF665';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYF665', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYF665';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AUL387'
  WHERE d.devicename = N'鄂AUL387'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUL387', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUL387';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUL387', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUL387';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AVV478'
  WHERE d.devicename = N'鄂AVV478'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVV478', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVV478';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVV478', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVV478';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AQS961'
  WHERE d.devicename = N'鄂AQS961'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQS961', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQS961';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AQS961', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AQS961';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AJT776'
  WHERE d.devicename = N'鄂AJT776'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AJT776', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AJT776';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AJT776', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AJT776';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABW616'
  WHERE d.devicename = N'鄂ABW616'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABW616', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABW616';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABW616', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABW616';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACM673'
  WHERE d.devicename = N'鄂ACM673'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACM673', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACM673';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACM673', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACM673';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AKD721'
  WHERE d.devicename = N'鄂AKD721'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKD721', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKD721';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKD721', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKD721';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ASC054'
  WHERE d.devicename = N'鄂ASC054'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASC054', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASC054';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ASC054', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ASC054';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AVE264'
  WHERE d.devicename = N'鄂AVE264'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVE264', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVE264';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AVE264', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AVE264';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ACZ931'
  WHERE d.devicename = N'鄂ACZ931'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACZ931', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACZ931';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ACZ931', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ACZ931';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AYE558'
  WHERE d.devicename = N'鄂AYE558'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYE558', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYE558';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AYE558', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AYE558';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AUD259'
  WHERE d.devicename = N'鄂AUD259'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUD259', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUD259';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AUD259', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AUD259';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AAS246'
  WHERE d.devicename = N'鄂AAS246'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAS246', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAS246';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AAS246', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AAS246';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABT288'
  WHERE d.devicename = N'鄂ABT288'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABT288', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABT288';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABT288', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABT288';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ABA768'
  WHERE d.devicename = N'鄂ABA768'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABA768', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABA768';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ABA768', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ABA768';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂ADX992'
  WHERE d.devicename = N'鄂ADX992'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADX992', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADX992';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂ADX992', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂ADX992';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂AKH552'
  WHERE d.devicename = N'鄂AKH552'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKH552', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKH552';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂AKH552', 1, N'陶永鑫', GETDATE(), GETDATE(), N'SX4259XD4Q6', N'陕汽牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂AKH552';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A38418D'
  WHERE d.devicename = N'鄂A38418D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A38418D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A38418D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A38418D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A38418D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A44952D'
  WHERE d.devicename = N'鄂A44952D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A44952D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A44952D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A44952D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A44952D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A14216D'
  WHERE d.devicename = N'鄂A14216D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A14216D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A14216D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A14216D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A14216D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A47146D'
  WHERE d.devicename = N'鄂A47146D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A47146D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A47146D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A47146D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A47146D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A47775D'
  WHERE d.devicename = N'鄂A47775D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A47775D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A47775D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A47775D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A47775D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A10450D'
  WHERE d.devicename = N'鄂A10450D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A10450D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A10450D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A10450D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A10450D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A34428D'
  WHERE d.devicename = N'鄂A34428D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A34428D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A34428D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A34428D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A34428D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A44126D'
  WHERE d.devicename = N'鄂A44126D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A44126D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A44126D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A44126D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A44126D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A45528D'
  WHERE d.devicename = N'鄂A45528D'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A45528D', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A45528D';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A45528D', 1, N'陶永鑫', GETDATE(), GETDATE(), N'XGA4252BEVWC3A', N'徐工牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A45528D';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A16379F'
  WHERE d.devicename = N'鄂A16379F'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A16379F', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A16379F';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A16379F', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A16379F';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A15905F'
  WHERE d.devicename = N'鄂A15905F'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A15905F', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A15905F';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A15905F', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A15905F';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A17287F'
  WHERE d.devicename = N'鄂A17287F'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A17287F', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A17287F';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A17287F', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A17287F';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A12976F'
  WHERE d.devicename = N'鄂A12976F'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A12976F', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A12976F';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A12976F', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A12976F';
END

IF NOT EXISTS (
  SELECT 1 FROM dbo.device d
  INNER JOIN dbo.location l ON l.id = d.Locationid AND l.locationcode = N'鄂A11026F'
  WHERE d.devicename = N'鄂A11026F'
)
BEGIN
  IF @hasDeviceType = 1
    INSERT INTO dbo.device (Locationid, devicename, devicetype, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A11026F', N'重型半挂牵引车', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A11026F';
  ELSE
    INSERT INTO dbo.device (Locationid, devicename, status, creator, creationtime, updatetime, field1, Field2)
    SELECT l.id, N'鄂A11026F', 1, N'陶永鑫', GETDATE(), GETDATE(), N'HN4250MX45C9SHEVY', N'远程牌'
    FROM dbo.location l WHERE l.locationcode = N'鄂A11026F';
END
