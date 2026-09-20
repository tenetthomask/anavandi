import urllib.request
from urllib.error import HTTPError

try:
    response = urllib.request.urlopen('https://anavandi.onrender.com/api/config')
    print(response.read().decode())
except HTTPError as e:
    print(e.read().decode())
