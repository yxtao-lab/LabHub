; LabHub NSIS 扩展：
; 1) 盘符根目录时补产品名
; 2) 安装时选择「数据目录」（与程序目录分离）
; 3) 卸载时尽量保留安装目录内的用户文件夹
;
; 注意：electron-builder 会分别编译安装包与卸载包；
; 安装页相关 Function 必须包在 !ifndef BUILD_UNINSTALLER 内，
; 否则卸载包会报 warning 0010（未引用函数）并因 warning-as-error 失败。

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

; 安装初始化：数据目录默认读注册表，否则 %LOCALAPPDATA%\LabHubData
; （卸载包编译时 BUILD_UNINSTALLER 已定义，此处整段跳过，避免未用变量告警）
!macro customInit
  !ifndef BUILD_UNINSTALLER
    ReadRegStr $labhubDataDir HKCU "Software\LabHub" "DataDir"
    ${If} $labhubDataDir == ""
      StrCpy $labhubDataDir "$LOCALAPPDATA\LabHubData"
    ${EndIf}
  !endif
!macroend

!ifndef BUILD_UNINSTALLER

Var labhubDataDir
Var labhubDataDialog
Var labhubDataDirRequest
Var labhubDataBrowseBtn

; 仅当安装路径是盘符根目录（如 D:\ 或 D:）时，补上产品目录名。
Function .onVerifyInstDir
  StrLen $0 $INSTDIR
  IntCmp $0 2 labhub_v_len2 labhub_v_len2 labhub_v_gt2
labhub_v_len2:
  StrCpy $1 $INSTDIR 1 1
  StrCmp $1 ":" labhub_v_root labhub_v_done
labhub_v_gt2:
  IntCmp $0 3 labhub_v_len3 labhub_v_done labhub_v_done
labhub_v_len3:
  StrCpy $1 $INSTDIR 1 1
  StrCmp $1 ":" 0 labhub_v_done
  StrCpy $2 $INSTDIR 1 -1
  StrCmp $2 "\" labhub_v_root labhub_v_done
labhub_v_root:
  StrCpy $2 $INSTDIR 1 -1
  StrCmp $2 "\" 0 labhub_v_addsep
  StrCpy $INSTDIR "$INSTDIR${PRODUCT_FILENAME}"
  Goto labhub_v_done
labhub_v_addsep:
  StrCpy $INSTDIR "$INSTDIR\${PRODUCT_FILENAME}"
labhub_v_done:
FunctionEnd

; 程序目录页之后：选择数据目录
!macro customPageAfterChangeDir
  Page custom labhubDataDirPageCreate labhubDataDirPageLeave
!macroend

Function labhubDataDirPageCreate
  ; 不用 MUI_HEADER_TEXT（本文件被 include 时尚无该宏）
  GetDlgItem $0 $HWNDPARENT 1037
  SendMessage $0 ${WM_SETTEXT} 0 "STR:选择数据目录"
  GetDlgItem $0 $HWNDPARENT 1038
  SendMessage $0 ${WM_SETTEXT} 0 "STR:清单、登录态与代码仓库保存在此（与程序安装目录分离，重装程序默认不删）"

  nsDialogs::Create 1018
  Pop $labhubDataDialog
  ${If} $labhubDataDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 36u "请选择数据目录的父文件夹，浏览后会自动带上 LabHubData 子目录。仓库将写入「数据目录\projects」，应用内不可再改。"
  Pop $0

  ${NSD_CreateLabel} 0 48u 100% 12u "数据目录："
  Pop $0

  ${NSD_CreateDirRequest} 0 64u 78% 12u "$labhubDataDir"
  Pop $labhubDataDirRequest

  ${NSD_CreateBrowseButton} 80% 62u 20% 14u "浏览…"
  Pop $labhubDataBrowseBtn
  ${NSD_OnClick} $labhubDataBrowseBtn labhubBrowseDataDir

  ${NSD_CreateLabel} 0 90u 100% 40u "提示：禁止选择程序安装目录或其子目录。默认路径为用户 AppData\Local\LabHubData。"
  Pop $0

  nsDialogs::Show
FunctionEnd

; 规范化数据目录：去掉多余的 LabHubData 套娃后，只保留一层
; （LabHubData 长度为 10；旧逻辑误用 11 会导致每次浏览都再套一层）
Function labhubEnsureDataSubdir
  Exch $R0
  Push $R1
  Push $R2
labhub_ensure_trim:
  StrLen $R1 $R0
  IntCmp $R1 0 labhub_ensure_append labhub_ensure_append 0
  IntOp $R1 $R1 - 1
  StrCpy $R2 $R0 1 $R1
  StrCmp $R2 "\" 0 labhub_ensure_strip_loop
  StrCpy $R0 $R0 $R1
  Goto labhub_ensure_trim
labhub_ensure_strip_loop:
  StrLen $R1 $R0
  IntCmp $R1 10 labhub_ensure_eq labhub_ensure_append labhub_ensure_gt
labhub_ensure_eq:
  StrCmp $R0 "LabHubData" 0 labhub_ensure_append
  StrCpy $R0 ""
  Goto labhub_ensure_append
labhub_ensure_gt:
  StrCpy $R2 $R0 "" -10
  StrCmp $R2 "LabHubData" 0 labhub_ensure_append
  IntOp $R1 $R1 - 10
  IntOp $R1 $R1 - 1
  StrCpy $R2 $R0 1 $R1
  StrCmp $R2 "\" 0 labhub_ensure_append
  ; 剥掉一层 \LabHubData，继续剥，避免套娃
  StrCpy $R0 $R0 $R1
  Goto labhub_ensure_trim
labhub_ensure_append:
  StrCmp $R0 "" 0 labhub_ensure_join
  StrCpy $R0 "$LOCALAPPDATA"
labhub_ensure_join:
  StrCpy $R0 "$R0\LabHubData"
  Pop $R2
  Pop $R1
  Exch $R0
FunctionEnd

Function labhubBrowseDataDir
  ${NSD_GetText} $labhubDataDirRequest $0
  nsDialogs::SelectFolderDialog "选择父文件夹（将自动加上 LabHubData）" $0
  Pop $0
  ${If} $0 != "error"
    ${If} $0 != ""
      Push $0
      Call labhubEnsureDataSubdir
      Pop $labhubDataDir
      ${NSD_SetText} $labhubDataDirRequest $labhubDataDir
    ${EndIf}
  ${EndIf}
FunctionEnd

Function labhubDataDirPageLeave
  ${NSD_GetText} $labhubDataDirRequest $labhubDataDir
  ${If} $labhubDataDir == ""
    MessageBox MB_ICONEXCLAMATION|MB_OK "请填写数据目录"
    Abort
  ${EndIf}

  Push $labhubDataDir
  Call labhubEnsureDataSubdir
  Pop $labhubDataDir
  ${NSD_SetText} $labhubDataDirRequest $labhubDataDir

  ; 拒绝盘符根（此时应已带上 LabHubData；若仍是根则拦截）
  StrLen $0 $labhubDataDir
  IntCmp $0 2 labhub_d_root labhub_d_root labhub_d_check3
labhub_d_root:
  MessageBox MB_ICONEXCLAMATION|MB_OK "数据目录不能是磁盘根目录，请选择具体文件夹"
  Abort
labhub_d_check3:
  IntCmp $0 3 0 labhub_d_ok labhub_d_ok
  StrCpy $1 $labhubDataDir 1 1
  StrCmp $1 ":" 0 labhub_d_ok
  StrCpy $2 $labhubDataDir 1 -1
  StrCmp $2 "\" 0 labhub_d_ok
  MessageBox MB_ICONEXCLAMATION|MB_OK "数据目录不能是磁盘根目录，请选择具体文件夹"
  Abort
labhub_d_ok:

  ; 禁止数据目录等于或位于程序安装目录之内（硬性拒绝，不可继续）
  Push $labhubDataDir
  Push $INSTDIR
  Call labhubNormalizeDir
  Pop $R8 ; INSTDIR normalized
  Call labhubNormalizeDir
  Pop $R9 ; DataDir normalized

  StrCmp $R9 $R8 labhub_d_in_inst 0
  StrLen $0 $R8
  StrCpy $1 $R9 $0
  StrCmp $1 $R8 0 labhub_d_pass
  ; DataDir 以 INSTDIR 为前缀时，下一段须为路径分隔符
  StrCpy $2 $R9 1 $0
  StrCmp $2 "\" labhub_d_in_inst labhub_d_pass
labhub_d_in_inst:
  MessageBox MB_ICONSTOP|MB_OK "数据目录不能选择程序安装目录，也不能放在安装目录内部。$\r$\n请另选独立文件夹（例如 $LOCALAPPDATA\LabHubData 或其它磁盘路径）。"
  Abort
labhub_d_pass:
FunctionEnd

; 去掉路径末尾反斜杠，便于比较
Function labhubNormalizeDir
  Exch $R0
  Push $R1
  StrLen $R1 $R0
  IntCmp $R1 0 labhub_norm_done labhub_norm_done 0
  IntOp $R1 $R1 - 1
  StrCpy $R1 $R0 1 $R1
  StrCmp $R1 "\" 0 labhub_norm_done
  StrLen $R1 $R0
  IntOp $R1 $R1 - 1
  StrCpy $R0 $R0 $R1
labhub_norm_done:
  Pop $R1
  Exch $R0
FunctionEnd

!endif ; BUILD_UNINSTALLER

; 安装完成后写入数据目录配置
!macro customInstall
  CreateDirectory "$labhubDataDir"
  CreateDirectory "$labhubDataDir\data"
  CreateDirectory "$labhubDataDir\projects"
  WriteRegStr HKCU "Software\LabHub" "DataDir" "$labhubDataDir"
  WriteRegStr HKCU "Software\LabHub" "InstallDir" "$INSTDIR"
  ; 供程序启动时快速读取（与注册表双保险）
  FileOpen $0 "$INSTDIR\labhub-data-dir.txt" w
  FileWrite $0 "$labhubDataDir"
  FileClose $0
  FileOpen $0 "$labhubDataDir\labhub-home.txt" w
  FileWrite $0 "$labhubDataDir"
  FileClose $0
!macroend

; 卸载：不删数据目录与 DataDir 注册表，避免用户代码丢失
!macro customUnInstall
  ; 仅清理安装目录旁的指针文件；DataDir 注册表保留，便于重装回填默认值
  Delete "$INSTDIR\labhub-data-dir.txt"
!macroend

; 卸载 / 覆盖安装时：保留安装目录下的用户项目文件夹（及数据指针文件）
!macro customRemoveFiles
  CreateDirectory "$PLUGINSDIR\labhub-user-keep"
  ; 先保住数据目录指针
  IfFileExists "$INSTDIR\labhub-data-dir.txt" 0 labhub_keep_scan
    ClearErrors
    Rename "$INSTDIR\labhub-data-dir.txt" "$PLUGINSDIR\labhub-user-keep\labhub-data-dir.txt"
labhub_keep_scan:
  ClearErrors
  FindFirst $R0 $R1 "$INSTDIR\*.*"
  IfErrors labhub_keep_wipe
labhub_keep_loop:
  StrCmp $R1 "" labhub_keep_done
  StrCmp $R1 "." labhub_keep_next
  StrCmp $R1 ".." labhub_keep_next
  StrCmp $R1 "resources" labhub_keep_next
  StrCmp $R1 "locales" labhub_keep_next
  IfFileExists "$INSTDIR\$R1\*.*" labhub_keep_move
  IfFileExists "$INSTDIR\$R1\." labhub_keep_move
  Goto labhub_keep_next
labhub_keep_move:
  ClearErrors
  Rename "$INSTDIR\$R1" "$PLUGINSDIR\labhub-user-keep\$R1"
labhub_keep_next:
  ClearErrors
  FindNext $R0 $R1
  IfErrors labhub_keep_done
  Goto labhub_keep_loop
labhub_keep_done:
  FindClose $R0
labhub_keep_wipe:
  RMDir /r "$INSTDIR"
  CreateDirectory "$INSTDIR"
  ClearErrors
  FindFirst $R0 $R1 "$PLUGINSDIR\labhub-user-keep\*.*"
  IfErrors labhub_rm_done
labhub_restore_loop:
  StrCmp $R1 "" labhub_restore_done
  StrCmp $R1 "." labhub_restore_next
  StrCmp $R1 ".." labhub_restore_next
  ClearErrors
  Rename "$PLUGINSDIR\labhub-user-keep\$R1" "$INSTDIR\$R1"
labhub_restore_next:
  ClearErrors
  FindNext $R0 $R1
  IfErrors labhub_restore_done
  Goto labhub_restore_loop
labhub_restore_done:
  FindClose $R0
labhub_rm_done:
!macroend
