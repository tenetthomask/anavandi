import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath('backend'))

# Load .env
from backend.ocr_engine import load_env, get_api_key
load_env()
print("API KEY:", get_api_key()[:5] if get_api_key() else None)

from backend.ocr_engine import extract_with_ai
try:
    # We need an image. Let's create a dummy image or use an existing one if there is one.
    # Since we just want to test if it times out, we can create a simple image.
    from PIL import Image
    img = Image.new('RGB', (100, 100), color = 'red')
    img.save('test.jpg')
    print("Sending to Vision AI...")
    data = extract_with_ai('test.jpg')
    print("Success!", data)
except Exception as e:
    print("Error:", e)
