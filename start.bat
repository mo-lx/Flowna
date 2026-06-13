@echo off
cd /d "%~dp0"
echo Starting Flowna...
if exist "node_modules\.bin\electron.cmd" (
  call "node_modules\.bin\electron.cmd" out/main/index.js
) else (
  npx electron out/main/index.js
)
