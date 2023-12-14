@echo off
echo Update Cosmetics Script for Swordbattle.io
echo This will delete cosmetics.json caches in client\\src\\game and api\\src
echo Press any key to continue...
pause >nul

echo Starting script...

echo Deleting client\\src\\game\\cosmetics.json...
if exist client\\src\\game\\cosmetics.json (
    del client\\src\\game\\cosmetics.json
    echo Deleted successfully.
) else (
    echo File not found.
)

echo Deleting server\\src\\cosmetics.json...
if exist server\\src\\cosmetics.json (
    del server\\src\\cosmetics.json
    echo Deleted successfully.
) else (
    echo File not found.
)

echo Deleting api\\src\\cosmetics.json...
if exist api\\src\\cosmetics.json (
    del api\\src\\cosmetics.json
    echo Deleted successfully.
) else (
    echo File not found.
)

echo Copying new cosmetics.json to client\\src\\game...
copy cosmetics.json client\\src\\game\\cosmetics.json
echo Copy complete.

echo Copying new cosmetics.json to server\\src...
copy cosmetics.json server\\src\\cosmetics.json
echo Copy complete.

echo Copying new cosmetics.json to api\\src...
copy cosmetics.json api\\src\\cosmetics.json
echo Copy complete.

echo Script completed.