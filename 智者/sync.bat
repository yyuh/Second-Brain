@echo off
REM sync.bat — 从 Second Brain 同步 智者 到技能目录
REM 规范源: second-brain\智者\ → 部署到: ~\.qclaw\skills\智者\ 和 ~\.claude\skills\智者\

set SOURCE=%USERPROFILE%\Desktop\second-brain\智者
set TARGET_QCLAW=%USERPROFILE%\.qclaw\skills\智者
set TARGET_CLAUDE=%USERPROFILE%\.claude\skills\智者

echo === 智者 v4.1: Second Brain → Skill Dirs ===

echo.
echo [1/2] Syncing to QClaw...
xcopy "%SOURCE%\*" "%TARGET_QCLAW%\" /E /Y /I /EXCLUDE:.syncignore 2>nul
echo Done.

echo [2/2] Syncing to Claude Code...
xcopy "%SOURCE%\*" "%TARGET_CLAUDE%\" /E /Y /I /EXCLUDE:.syncignore 2>nul
echo Done.

echo.
echo === Sync Complete ===
echo Source: %SOURCE%
echo Targets: QClaw + Claude Code skills dirs
