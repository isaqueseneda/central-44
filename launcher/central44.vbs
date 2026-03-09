' Central 44 - Silent Launcher
' Double-click this file to start Central 44 without showing a terminal window.
' The server runs in the background. Use stop.bat to stop it.

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName) & "\.."

' Run the bat file minimized (1 = normal, 7 = minimized no focus)
WshShell.Run "launcher\central44.bat", 7, False
