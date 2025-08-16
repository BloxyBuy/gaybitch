#Persistent
SetTitleMatchMode, 2
SetTimer, AutoRun, 5000 ; check every 5 seconds

AutoRun:
    IfWinExist, Replit
    {
        WinActivate
        CoordMode, Mouse, Window
        CoordMode, Pixel, Window

        ; Read the color at Run/Stop button location
        PixelGetColor, color, 942, 53, RGB

        ; Example check: Run button is usually green, Stop button is usually red
        if (color = 0x3EB489) ; replace with actual Run button color
        {
            MouseMove, 942, 53
            Click
            Sleep, 100
            ToolTip, ▶️ Project restarted
        }
        else
        {
            ToolTip, ⏸ Project still running
        }
    }
return
