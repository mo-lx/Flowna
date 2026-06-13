Option Explicit

Dim shell, fso, appDir, desktopDir, shortcutPath, shortcut, launcherPath, iconPath, electronIcon

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopDir = shell.SpecialFolders("Desktop")
shortcutPath = desktopDir & "\Flowna.lnk"
launcherPath = appDir & "\Flowna.vbs"
iconPath = appDir & "\resources\icon.ico"
electronIcon = appDir & "\node_modules\electron\dist\electron.exe"

Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = launcherPath
shortcut.WorkingDirectory = appDir
shortcut.Description = "Flowna desktop notes"

If fso.FileExists(iconPath) Then
  shortcut.IconLocation = iconPath
ElseIf fso.FileExists(electronIcon) Then
  shortcut.IconLocation = electronIcon & ",0"
End If

shortcut.Save

MsgBox "Flowna desktop shortcut created." & vbCrLf & shortcutPath, vbInformation, "Flowna"
