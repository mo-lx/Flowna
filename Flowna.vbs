Option Explicit

Dim shell, fso, appDir, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = fso.GetParentFolderName(WScript.ScriptFullName)
command = """" & appDir & "\start.bat" & """"

' Window style 0 hides the console window. The final False means the launcher
' returns immediately and leaves Electron running as a normal desktop app.
shell.CurrentDirectory = appDir
shell.Run command, 0, False
