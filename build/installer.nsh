; 仅当安装路径是盘符根目录（如 D:\ 或 D:）时，补上产品目录名。
; 选 D:\Tools 等普通目录时不追加，避免「无论选哪都再套一层」。
; 注意：NSIS 标签全局唯一，必须使用 labhub_ 前缀，避免与模板冲突。
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

; 卸载 / 覆盖安装时：保留安装目录下的用户项目文件夹。
; - 保留 projects\（推荐托管位置）
; - 以及与 LabHub.exe 同级的其它目录（如 safetymanagement\），排除程序自带的 resources / locales
!macro customRemoveFiles
  CreateDirectory "$PLUGINSDIR\labhub-user-keep"
  ClearErrors
  FindFirst $R0 $R1 "$INSTDIR\*.*"
  IfErrors labhub_keep_wipe
labhub_keep_loop:
  StrCmp $R1 "" labhub_keep_done
  StrCmp $R1 "." labhub_keep_next
  StrCmp $R1 ".." labhub_keep_next
  StrCmp $R1 "resources" labhub_keep_next
  StrCmp $R1 "locales" labhub_keep_next
  ; 仅保留目录（含空目录）；根下的 exe/dll 等程序文件照删
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
