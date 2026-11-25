/* location 区域 — 仅牵引车/单车；locationtype=排放标准；attribute=车辆点检 */
DECLARE @hasAttribute BIT = CASE WHEN COL_LENGTH('dbo.location', 'attribute') IS NULL THEN 0 ELSE 1 END;
IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AAA663')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AAA663', N'鄂AAA663', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AAA663', N'鄂AAA663', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AUZ656')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AUZ656', N'鄂AUZ656', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AUZ656', N'鄂AUZ656', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AEY611')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AEY611', N'鄂AEY611', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AEY611', N'鄂AEY611', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AZA236')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AZA236', N'鄂AZA236', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AZA236', N'鄂AZA236', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ATV567')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ATV567', N'鄂ATV567', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ATV567', N'鄂ATV567', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AKA556')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AKA556', N'鄂AKA556', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AKA556', N'鄂AKA556', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AKE162')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AKE162', N'鄂AKE162', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AKE162', N'鄂AKE162', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABR021')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABR021', N'鄂ABR021', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABR021', N'鄂ABR021', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ARZ299')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ARZ299', N'鄂ARZ299', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ARZ299', N'鄂ARZ299', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AKK605')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AKK605', N'鄂AKK605', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AKK605', N'鄂AKK605', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADP251')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADP251', N'鄂ADP251', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADP251', N'鄂ADP251', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABZ538')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABZ538', N'鄂ABZ538', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABZ538', N'鄂ABZ538', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AQJ238')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AQJ238', N'鄂AQJ238', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AQJ238', N'鄂AQJ238', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYD271')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYD271', N'鄂AYD271', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYD271', N'鄂AYD271', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANT506')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANT506', N'鄂ANT506', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANT506', N'鄂ANT506', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A30057D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A30057D', N'鄂A30057D', N'纯电动', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A30057D', N'鄂A30057D', N'纯电动', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A33369D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A33369D', N'鄂A33369D', N'纯电动', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A33369D', N'鄂A33369D', N'纯电动', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A32365D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A32365D', N'鄂A32365D', N'纯电动', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A32365D', N'鄂A32365D', N'纯电动', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A35708D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A35708D', N'鄂A35708D', N'纯电动', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A35708D', N'鄂A35708D', N'纯电动', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A35768D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A35768D', N'鄂A35768D', N'纯电动', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A35768D', N'鄂A35768D', N'纯电动', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADZ067')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADZ067', N'鄂ADZ067', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADZ067', N'鄂ADZ067', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYB328')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYB328', N'鄂AYB328', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYB328', N'鄂AYB328', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AST007')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AST007', N'鄂AST007', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AST007', N'鄂AST007', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANB683')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANB683', N'鄂ANB683', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANB683', N'鄂ANB683', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANX588')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANX588', N'鄂ANX588', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANX588', N'鄂ANX588', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ASD681')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ASD681', N'鄂ASD681', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ASD681', N'鄂ASD681', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AZY821')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AZY821', N'鄂AZY821', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AZY821', N'鄂AZY821', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AHS501')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AHS501', N'鄂AHS501', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AHS501', N'鄂AHS501', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACH059')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACH059', N'鄂ACH059', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACH059', N'鄂ACH059', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACH087')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACH087', N'鄂ACH087', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACH087', N'鄂ACH087', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AMP810')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AMP810', N'鄂AMP810', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AMP810', N'鄂AMP810', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AMP368')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AMP368', N'鄂AMP368', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AMP368', N'鄂AMP368', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AFR528')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AFR528', N'鄂AFR528', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AFR528', N'鄂AFR528', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABG170')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABG170', N'鄂ABG170', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABG170', N'鄂ABG170', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYH625')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYH625', N'鄂AYH625', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYH625', N'鄂AYH625', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANH795')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANH795', N'鄂ANH795', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANH795', N'鄂ANH795', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AZC979')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AZC979', N'鄂AZC979', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AZC979', N'鄂AZC979', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AHF228')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AHF228', N'鄂AHF228', N'国五标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AHF228', N'鄂AHF228', N'国五标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABG2809')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABG2809', N'鄂ABG2809', N'新能源', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABG2809', N'鄂ABG2809', N'新能源', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADZ735')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADZ735', N'鄂ADZ735', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADZ735', N'鄂ADZ735', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AVV520')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AVV520', N'鄂AVV520', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AVV520', N'鄂AVV520', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANW238')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANW238', N'鄂ANW238', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANW238', N'鄂ANW238', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AQN921')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AQN921', N'鄂AQN921', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AQN921', N'鄂AQN921', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ATD852')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ATD852', N'鄂ATD852', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ATD852', N'鄂ATD852', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYS941')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYS941', N'鄂AYS941', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYS941', N'鄂AYS941', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACZ996')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACZ996', N'鄂ACZ996', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACZ996', N'鄂ACZ996', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ARV813')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ARV813', N'鄂ARV813', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ARV813', N'鄂ARV813', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADB852')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADB852', N'鄂ADB852', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADB852', N'鄂ADB852', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AEW705')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AEW705', N'鄂AEW705', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AEW705', N'鄂AEW705', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂APV264')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂APV264', N'鄂APV264', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂APV264', N'鄂APV264', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACR825')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACR825', N'鄂ACR825', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACR825', N'鄂ACR825', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AFG246')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AFG246', N'鄂AFG246', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AFG246', N'鄂AFG246', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ATQ579')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ATQ579', N'鄂ATQ579', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ATQ579', N'鄂ATQ579', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂APT939')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂APT939', N'鄂APT939', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂APT939', N'鄂APT939', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACR788')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACR788', N'鄂ACR788', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACR788', N'鄂ACR788', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AUZ187')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AUZ187', N'鄂AUZ187', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AUZ187', N'鄂AUZ187', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADS237')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADS237', N'鄂ADS237', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADS237', N'鄂ADS237', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AST044')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AST044', N'鄂AST044', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AST044', N'鄂AST044', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AAS697')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AAS697', N'鄂AAS697', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AAS697', N'鄂AAS697', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AER118')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AER118', N'鄂AER118', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AER118', N'鄂AER118', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AZB047')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AZB047', N'鄂AZB047', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AZB047', N'鄂AZB047', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADW070')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADW070', N'鄂ADW070', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADW070', N'鄂ADW070', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AAD182')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AAD182', N'鄂AAD182', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AAD182', N'鄂AAD182', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYT716')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYT716', N'鄂AYT716', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYT716', N'鄂AYT716', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ASS948')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ASS948', N'鄂ASS948', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ASS948', N'鄂ASS948', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂APD890')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂APD890', N'鄂APD890', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂APD890', N'鄂APD890', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂APG245')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂APG245', N'鄂APG245', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂APG245', N'鄂APG245', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANJ036')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANJ036', N'鄂ANJ036', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANJ036', N'鄂ANJ036', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AQV297')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AQV297', N'鄂AQV297', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AQV297', N'鄂AQV297', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACX891')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACX891', N'鄂ACX891', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACX891', N'鄂ACX891', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AJV375')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AJV375', N'鄂AJV375', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AJV375', N'鄂AJV375', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ANR025')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ANR025', N'鄂ANR025', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ANR025', N'鄂ANR025', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACA470')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACA470', N'鄂ACA470', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACA470', N'鄂ACA470', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AAX248')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AAX248', N'鄂AAX248', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AAX248', N'鄂AAX248', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AER012')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AER012', N'鄂AER012', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AER012', N'鄂AER012', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂APY849')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂APY849', N'鄂APY849', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂APY849', N'鄂APY849', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ATD973')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ATD973', N'鄂ATD973', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ATD973', N'鄂ATD973', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYF665')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYF665', N'鄂AYF665', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYF665', N'鄂AYF665', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AUL387')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AUL387', N'鄂AUL387', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AUL387', N'鄂AUL387', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AVV478')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AVV478', N'鄂AVV478', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AVV478', N'鄂AVV478', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AQS961')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AQS961', N'鄂AQS961', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AQS961', N'鄂AQS961', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AJT776')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AJT776', N'鄂AJT776', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AJT776', N'鄂AJT776', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABW616')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABW616', N'鄂ABW616', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABW616', N'鄂ABW616', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACM673')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACM673', N'鄂ACM673', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACM673', N'鄂ACM673', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AKD721')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AKD721', N'鄂AKD721', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AKD721', N'鄂AKD721', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ASC054')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ASC054', N'鄂ASC054', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ASC054', N'鄂ASC054', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AVE264')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AVE264', N'鄂AVE264', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AVE264', N'鄂AVE264', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ACZ931')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ACZ931', N'鄂ACZ931', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ACZ931', N'鄂ACZ931', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AYE558')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AYE558', N'鄂AYE558', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AYE558', N'鄂AYE558', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AUD259')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AUD259', N'鄂AUD259', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AUD259', N'鄂AUD259', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AAS246')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AAS246', N'鄂AAS246', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AAS246', N'鄂AAS246', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABT288')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABT288', N'鄂ABT288', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABT288', N'鄂ABT288', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ABA768')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ABA768', N'鄂ABA768', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ABA768', N'鄂ABA768', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂ADX992')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂ADX992', N'鄂ADX992', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂ADX992', N'鄂ADX992', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂AKH552')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂AKH552', N'鄂AKH552', N'国六标准', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂AKH552', N'鄂AKH552', N'国六标准', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A38418D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A38418D', N'鄂A38418D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A38418D', N'鄂A38418D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A44952D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A44952D', N'鄂A44952D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A44952D', N'鄂A44952D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A14216D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A14216D', N'鄂A14216D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A14216D', N'鄂A14216D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A47146D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A47146D', N'鄂A47146D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A47146D', N'鄂A47146D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A47775D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A47775D', N'鄂A47775D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A47775D', N'鄂A47775D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A10450D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A10450D', N'鄂A10450D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A10450D', N'鄂A10450D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A34428D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A34428D', N'鄂A34428D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A34428D', N'鄂A34428D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A44126D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A44126D', N'鄂A44126D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A44126D', N'鄂A44126D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A45528D')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A45528D', N'鄂A45528D', N'电车', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A45528D', N'鄂A45528D', N'电车', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A16379F')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A16379F', N'鄂A16379F', N'甲醇/电', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A16379F', N'鄂A16379F', N'甲醇/电', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A15905F')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A15905F', N'鄂A15905F', N'甲醇/电', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A15905F', N'鄂A15905F', N'甲醇/电', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A17287F')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A17287F', N'鄂A17287F', N'甲醇/电', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A17287F', N'鄂A17287F', N'甲醇/电', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A12976F')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A12976F', N'鄂A12976F', N'甲醇/电', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A12976F', N'鄂A12976F', N'甲醇/电', N'陶永鑫', GETDATE());
END

IF NOT EXISTS (SELECT 1 FROM dbo.location WHERE locationcode = N'鄂A11026F')
BEGIN
  IF @hasAttribute = 1
    INSERT INTO dbo.location (locationname, locationcode, locationtype, attribute, creator, creationtime)
    VALUES (N'鄂A11026F', N'鄂A11026F', N'甲醇/电', N'车辆点检', N'陶永鑫', GETDATE());
  ELSE
    INSERT INTO dbo.location (locationname, locationcode, locationtype, creator, creationtime)
    VALUES (N'鄂A11026F', N'鄂A11026F', N'甲醇/电', N'陶永鑫', GETDATE());
END
