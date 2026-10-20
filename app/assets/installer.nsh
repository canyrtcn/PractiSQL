; Show the branded welcome sidebar on fresh installations.
; skipPageIfUpdated keeps automatic updates on their existing path.
!macro customWelcomePage
  !insertmacro skipPageIfUpdated
  !insertmacro MUI_PAGE_WELCOME
!macroend

; Launch from the installation directory without depending on a shortcut.
!macro customInstall
  StrCpy $launchLink "$appExe"
!macroend
