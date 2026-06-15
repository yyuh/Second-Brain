#!/bin/bash
SOURCE="$(pwd)"
DEST1="$HOME/.qclaw/skills/智者"
DEST2="$HOME/.claude/skills/智者"

cp "$SOURCE/SKILL.md" "$DEST1/"
cp -r "$SOURCE/core" "$DEST1/"
cp -r "$SOURCE/memory" "$DEST1/"
cp -r "$SOURCE/meta" "$DEST1/"

cp "$SOURCE/SKILL.md" "$DEST2/"
cp -r "$SOURCE/core" "$DEST2/"
cp -r "$SOURCE/memory" "$DEST2/"
cp -r "$SOURCE/meta" "$DEST2/"

echo "同步完成"
