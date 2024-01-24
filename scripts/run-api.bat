@echo off
call python_embeded\Scripts\activate.bat
python -m manga_translator -v --mode api --use-gpu
call deactivate