@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "FFMPEG=%~dp0node_modules\ffmpeg-static\ffmpeg.exe"
if not exist "%FFMPEG%" (
  echo ffmpeg.exe not found:
  echo %FFMPEG%
  echo.
  echo Please ask Codex to reinstall ffmpeg-static first.
  pause
  exit /b 1
)

set "SRC=%~1"
if "%SRC%"=="" (
  echo Drag a video folder onto this bat file.
  echo Example: E:\HXT-video\Traffic-course
  echo.
  pause
  exit /b 1
)

if not exist "%SRC%\" (
  echo Please choose a folder, not a single file.
  echo.
  pause
  exit /b 1
)

for %%I in ("%SRC%") do (
  set "PARENT=%%~dpI"
  set "NAME=%%~nxI"
)
set "DEST=!PARENT!!NAME!-smooth"
mkdir "!DEST!" >nul 2>nul

echo Source: %SRC%
echo Output: !DEST!
echo.
echo Transcoding to browser-friendly MP4. This may take a long time.
echo Original videos will not be deleted or overwritten.
echo.

for /r "%SRC%" %%F in (*.mp4 *.m4v *.mov *.webm *.ogg) do (
  set "OUT=!DEST!\%%~nF.mp4"
  if exist "!OUT!" (
    echo Skip existing: !OUT!
  ) else (
    echo Processing: %%~nxF
    "%FFMPEG%" -hide_banner -y -i "%%F" -vf "scale='min(1280,iw)':-2,fps=25" -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "!OUT!"
  )
)

echo.
echo Done.
echo The output folder name ends with "-smooth".
pause
