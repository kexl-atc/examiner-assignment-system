' ========================================================n' Examiner Assignment System - Silent Start
' Version: 8.0.0
' Compatible: Windows 7 SP1 / Windows 10 / Windows 11
' Description: Start services without showing command window
' ========================================================

Option Explicit

Dim WshShell, FSO, ScriptDir, BATFile

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' Path to the start.bat file
BATFile = ScriptDir & "\start.bat"

' Check if start.bat exists
If Not FSO.FileExists(BATFile) Then
    WshShell.PopUp "Error: start.bat not found!" & vbCrLf & vbCrLf & "Expected: " & BATFile, 0, "Examiner System - Error", 16
    WScript.Quit 1
End If

' Change to script directory
WshShell.CurrentDirectory = ScriptDir

' Run start.bat in hidden mode (0 = hidden window)
' This avoids showing the command prompt window
WshShell.Run "cmd /c """ & BATFile & """", 0, False

' Show success message
WshShell.PopUp "Examiner Assignment System is starting..." & vbCrLf & vbCrLf & _
               "Backend:  http://127.0.0.1:8082" & vbCrLf & _
               "Frontend: http://127.0.0.1:8081" & vbCrLf & vbCrLf & _
               "Services will continue running in the background.", _
               3, "Examiner System - Starting", 64

Set WshShell = Nothing
Set FSO = Nothing
