import subprocess
import os
import sys

html_path = os.path.abspath('poster.html').replace('\\', '/')
out_path = os.path.abspath('poster_render.png')

edge_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

browser = chrome_path if os.path.exists(chrome_path) else edge_path
print('Using browser:', browser)

cmd = [
    browser,
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1200,1680',
    '--device-scale-factor=1.5',
    f'--screenshot={out_path}',
    f'file:///{html_path}'
]

print('Running command:', ' '.join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
print('Returncode:', res.returncode)
print('File exists:', os.path.exists(out_path))
if os.path.exists(out_path):
    print('Size:', os.path.getsize(out_path), 'bytes')
