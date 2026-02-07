' 考官排班系统启动器
' 双击运行此文件启动服务

Option Explicit

Dim WshShell, FSO, ScriptDir, MainScript

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
MainScript = ScriptDir & "\start.vbs"

If Not FSO.FileExists(MainScript) Then
    MsgBox "Error: start.vbs not found!" & vbCrLf & "Please check deployment package.", vbCritical, "Start Failed"
    WScript.Quit 1
End If

' Run main script in hidden mode
WshShell.Run "wscript //nologo """ & MainScript & """", 0, False

Set WshShell = Nothing
Set FSO = Nothing
