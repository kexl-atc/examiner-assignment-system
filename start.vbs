' ?????????? (??????)
' Version: v8.0.15

Option Explicit

Dim WshShell, FSO, RootDir
Dim RetryCount, MaxRetry
Dim IsBackendReady

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

RootDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = RootDir

If Not FSO.FileExists(RootDir & "\java-runtime\bin\java.exe") Then
    WshShell.Popup "Error: Java runtime not found!" & vbCrLf & "Please check deployment package.", 0, "Start Failed", 16
    WScript.Quit 1
End If

If Not FSO.FileExists(RootDir & "\supervisor\backend\app\quarkus-run.jar") Then
    WshShell.Popup "Error: Backend service not found!" & vbCrLf & "Please check deployment package.", 0, "Start Failed", 16
    WScript.Quit 1
End If

If Not FSO.FolderExists(RootDir & "\logs") Then
    FSO.CreateFolder RootDir & "\logs"
End If

Call KillJavaProcesses()
WScript.Sleep 1000

If Not FSO.FileExists(RootDir & "\SimpleHttpServer.class") Then
    Call CompileSimpleHttpServer(RootDir)
End If

Dim BackendCmd
BackendCmd = """" & RootDir & "\java-runtime\bin\javaw.exe"" -Xmx1g -Dquarkus.http.port=8082 -jar """ & RootDir & "\supervisor\backend\app\quarkus-run.jar"""""
WshShell.Run BackendCmd, 0, False

WScript.Sleep 3000

RetryCount = 0
MaxRetry = 30
IsBackendReady = False

Do While RetryCount < MaxRetry And Not IsBackendReady
    RetryCount = RetryCount + 1
    WScript.Sleep 2000
    If CheckBackendHealth() Then
        IsBackendReady = True
        Exit Do
    End If
Loop

Dim FrontendCmd
FrontendCmd = """" & RootDir & "\java-runtime\bin\javaw.exe"" -cp . SimpleHttpServer 8081 """ & RootDir & "\supervisor\frontend\dist"""""
WshShell.Run FrontendCmd, 0, False

WScript.Sleep 1500

WshShell.Popup "Service Started!" & vbCrLf & vbCrLf & "Frontend: http://127.0.0.1:8081" & vbCrLf & "Backend: http://127.0.0.1:8082", 0, "v8.0.15", 64
WshShell.Run "http://127.0.0.1:8081", 1, False

Set WshShell = Nothing
Set FSO = Nothing
WScript.Quit 0

Function CheckBackendHealth()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.XMLHTTP")
    http.Open "GET", "http://127.0.0.1:8082/q/health/ready", False
    http.setRequestHeader "Content-Type", "application/json"
    http.Send
    If http.Status = 200 Then
        CheckBackendHealth = True
    Else
        CheckBackendHealth = False
    End If
    Set http = Nothing
    On Error GoTo 0
End Function

Sub CompileSimpleHttpServer(RootDir)
    On Error Resume Next
    Dim JavaCPath, CompileCmd
    JavaCPath = """" & RootDir & "\java-runtime\bin\javac.exe""""
    If FSO.FileExists(RootDir & "\java-runtime\bin\javac.exe") Then
        CompileCmd = JavaCPath & " -encoding UTF-8 """ & RootDir & "\SimpleHttpServer.java"""""
        WshShell.Run CompileCmd, 0, True
    End If
    On Error GoTo 0
End Sub

Sub KillJavaProcesses()
    On Error Resume Next
    Dim WMI, processes, process
    Set WMI = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
    Set processes = WMI.ExecQuery("Select * From Win32_Process Where Name='java.exe' OR Name='javaw.exe'")
    For Each process in processes
        process.Terminate
    Next
    Set processes = Nothing
    Set WMI = Nothing
    On Error GoTo 0
End Sub