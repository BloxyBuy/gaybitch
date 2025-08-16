#Persistent            ; Keeps the script running
SetTitleMatchMode, 2   ; Allows partial matches in window titles

; Path to your Run button (text version check)
checkInterval := 5000  ; Check every 5 seconds

SetTimer, AutoRun, %checkInterval%

AutoRun:
    ; Look for Chrome/Edge window with Replit open
    IfWinExist, Replit
    {
        WinActivate  ; Bring Replit window to front (optional)
        
        ; Move mouse to the Run button position and click
        ; !!! Adjust coordinates once (see step 3 below) !!!
        ControlGetText, btnText, Chrome_RenderWidgetHostHWND1, A
        
        ; Example: if the Run button is always at fixed coordinates
        MouseMove, 942, 53   ; X,Y coordinates of Run button inside browser
        Click
        Sleep 100
    }
return
