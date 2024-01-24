@echo off
virtualenv python_embeded

call python_embeded\Scripts\activate.bat
pip install -r requirements.txt 
pip install git+https://github.com/kodalli/pydensecrf.git
pip install certifi==2023.07.22
pip install opencv-python<=4.6.0.66
pip install protobuf<=3.20.2

call deactivate