@echo off
setlocal
set "NODE_HOME=D:\AI_ASSISSTANT\tools\node-v24.14.0-win-x64"
set "PATH=%NODE_HOME%;%PATH%"
cd /d D:\AI_ASSISSTANT\frontend
call "%NODE_HOME%\npm.cmd" run dev -- --host 0.0.0.0 --port 5173
