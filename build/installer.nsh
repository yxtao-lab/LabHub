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
