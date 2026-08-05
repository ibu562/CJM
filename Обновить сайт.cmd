@echo off
cd /d "%~dp0"
echo.
echo ===== Obnovlenie sayta "Persony i put uchenika" =====
echo.
echo [1/3] Peresborka dannykh iz CSV...
python tools/build_data.py
if errorlevel 1 goto error
echo.
echo [2/3] Sokhranenie izmeneniy...
git add -A
git diff --cached --quiet
if not errorlevel 1 goto nochanges
git commit -m "Pravki dannykh"
if errorlevel 1 goto error
echo.
echo [3/3] Publikatsiya...
git push
if errorlevel 1 goto error
echo.
echo ===== GOTOVO! =====
echo Sayt obnovitsya cherez 1-2 minuty:
echo    https://ibu562.github.io/CJM/
echo Zakazchiku: obnovit stranitsu (Ctrl+Shift+R)
goto done

:nochanges
echo.
echo    Izmeneniy net - publikovat nechego.
goto done

:error
echo.
echo !!! OSHIBKA - skopiruyte tekst vyshe i pokazhite Claude

:done
echo.
pause
