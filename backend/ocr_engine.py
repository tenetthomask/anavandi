import os
import json
import base64
import io
import mimetypes
from pathlib import Path
from PIL import Image
import google.generativeai as genai
from typing import Optional
import concurrent.futures

# Load .env file automatically if present
def load_env():
    paths = [
        Path(__file__).parent / '.env',
        Path(__file__).parent.parent / '.env'
    ]
    for env_path in paths:
        if env_path.exists():
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"\'')
                        os.environ[k] = v

load_env()

def get_api_key() -> Optional[str]:
    return os.getenv("API_KEY") or os.getenv("GEMINI_API_KEY")


def validate_api_key(key: Optional[str]) -> None:
    """
    Raise a descriptive ValueError if the key is missing or clearly invalid.
    """
    if not key or len(key.strip()) < 10:
        raise ValueError(
            "API key missing or invalid. Please check your backend/.env file."
        )
    if key == "your_api_key_here":
        raise ValueError(
            "API key is still the placeholder value 'your_api_key_here'. "
            "Replace it with a real API key in backend/.env."
        )


UNIVERSAL_SYSTEM_PROMPT = """You are a universal vision OCR and document layout analyzer. Analyze the provided timetable image and extract both the tabular schedule data AND spatial bounding coordinates for all key regions.

Rules:
1. Extract Title & Structure: Identify Agency / Schedule Title, total_rows, total_cols, and whether a header row exists.
2. Schedule Matrix Grid: Extract all cells into a 2D array of strings `grid`, where row 0 is headers (if present), and subsequent rows contain station names in column 0 followed by arrival/departure times in subsequent columns.
3. 2D Bounding Boxes: Extract spatial bounding box coordinates `box_2d` in normalized [ymin, xmin, ymax, xmax] format (0-1000 integer scale) for key regions (Header Region, Station Names, Timestamps Grid, Legend/Notes).
4. Assign hex colors for annotations (e.g. Header Region: #0284C7, Station Names: #22C55E, Timestamps Grid: #A855F7, Notes: #EAB308).
5. IMPORTANT INSTRUCTION FOR MULTI-COLUMN SUB-TABLES:
If the image contains side-by-side repeated sub-tables (e.g. Left sub-table with Train/Time/Dest and Right sub-table with Train/Time/Dest), DO NOT output them as a wide 6-column table. 
Instead, UNROLL and STACK them into a single continuous vertical list:
- Extract all rows from the Left Sub-Table first (rows 1 to N).
- Append all rows from the Right Sub-Table directly beneath them (rows N+1 to 2N).
- Ensure the final JSON matrix contains only ONE unified header row at the top.

Output JSON Format ONLY matching:
{
  "title": "Detected Agency / Schedule Name",
  "total_rows": 5,
  "total_cols": 5,
  "has_header_row": true,
  "grid": [
    ["STATION / STOP", "TRIP 1", "TRIP 2", "TRIP 3", "TRIP 4"],
    ["Central Terminal", "06:15", "06:45", "07:15", "07:45"],
    ["4th Ave & Oak St", "06:23", "06:53", "--", "07:53"]
  ],
  "annotations": [
    { "label": "Header Region", "box_2d": [20, 30, 100, 970], "color": "#0284C7" },
    { "label": "Station Names", "box_2d": [105, 30, 400, 260], "color": "#22C55E" },
    { "label": "Timestamps Grid", "box_2d": [105, 265, 400, 970], "color": "#A855F7" }
  ],
  "metadata": {
    "agency_name": "Extracted Agency",
    "confidence_score": 98.5
  }
}"""

def prepare_image_bytes(image_path: str, max_dimension: int = 800) -> tuple[bytes, str]:
    """Resize image to max 800px for fast Vision AI processing."""
    try:
        with Image.open(image_path) as img:
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            width, height = img.size
            if width > max_dimension or height > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int(height * (max_dimension / width))
                else:
                    new_height = max_dimension
                    new_width = int(width * (max_dimension / height))
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            return buffer.getvalue(), 'image/jpeg'
    except Exception:
        with open(image_path, "rb") as f:
            return f.read(), _detect_mime_type(image_path)


def sanitize_and_parse_json(raw_text: str) -> dict:
    if not raw_text or not isinstance(raw_text, str):
        raise ValueError("Empty or non-string response received from Vision API")

    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        import re
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)
        cleaned = cleaned.strip()

    first_brace = cleaned.find('{')
    last_brace = cleaned.rfind('}')
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        cleaned = cleaned[first_brace:last_brace + 1]
    else:
        first_bracket = cleaned.find('[')
        last_bracket = cleaned.rfind(']')
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            cleaned = cleaned[first_bracket:last_bracket + 1]
        else:
            raise ValueError(f"No valid JSON found in response. Snippet: {raw_text[:200]}")

    try:
        data = json.loads(cleaned)
        return _normalize_payload(data)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON.parse failed after sanitization. Error: {e} | Snippet: {cleaned[:200]}")


def _normalize_payload(data: dict) -> dict:
    """Ensure both grid matrix and legacy GTFS stops/routes structures are populated."""
    if not isinstance(data, dict):
        return data

    grid = data.get("grid", [])
    if grid and isinstance(grid, list) and len(grid) > 0:
        has_header = data.get("has_header_row", True)
        header_row = grid[0] if (has_header and len(grid) > 0) else []
        body_rows = grid[1:] if (has_header and len(grid) > 1) else grid

        # Detect which column holds stop/station/destination names (not train numbers)
        # Inspect header row keywords; fall back to last column if ambiguous
        stop_col_idx = 0  # default
        time_col_idx = 1  # default
        if header_row:
            header_lower = [str(h).lower().strip() for h in header_row]
            # Priority: destination/station/stop/location columns
            dest_keywords = ['destination', 'dest', 'station', 'stop', 'location', 'to', 'name', 'place']
            time_keywords = ['time', 'dep', 'arr', 'depart', 'arrive']
            found_dest = -1
            found_time = -1
            for kw in dest_keywords:
                for ci, h in enumerate(header_lower):
                    if kw in h:
                        found_dest = ci
                        break
                if found_dest != -1:
                    break
            for kw in time_keywords:
                for ci, h in enumerate(header_lower):
                    if kw in h:
                        found_time = ci
                        break
                if found_time != -1:
                    break

            if found_dest != -1:
                stop_col_idx = found_dest
            elif len(header_lower) > 1:
                # If no explicit dest column, use last column (common in TRAIN NO|TIME|DEST layouts)
                stop_col_idx = len(header_lower) - 1

            if found_time != -1:
                time_col_idx = found_time

        # Build stops list from the identified stop column
        stops = []
        for idx, row in enumerate(body_rows):
            if row and len(row) > stop_col_idx:
                stop_name = str(row[stop_col_idx]).strip()
                if stop_name and stop_name != '--':
                    stops.append({"stop_id": f"STOP_{idx+1:02d}", "stop_name": stop_name, "sequence": idx + 1})

        # Build trips from the time column
        trips = []
        trip_id = "TRIP_01"
        trip_header = header_row[time_col_idx] if time_col_idx < len(header_row) else "Time"
        stop_times = []
        for row in body_rows:
            if len(row) > stop_col_idx:
                s_name = str(row[stop_col_idx]).strip()
                time_val = str(row[time_col_idx]).strip() if time_col_idx < len(row) else "--"
                if s_name and time_val and time_val != "--":
                    stop_times.append({"stop_name": s_name, "time": time_val})

        trips.append({
            "trip_id": trip_id,
            "label": trip_header,
            "operating_days": "Daily",
            "stop_times": stop_times
        })

        if "stops" not in data or not data["stops"]:
            data["stops"] = stops

        if "routes" not in data or not data["routes"]:
            origin = stops[0]["stop_name"] if stops else "Origin"
            dest = stops[-1]["stop_name"] if stops else "Destination"
            data["routes"] = [{
                "route_id": data.get("title", "LINE-101"),
                "origin": origin,
                "destination": dest,
                "schedules": trips
            }]

    # Ensure annotations exist with default bounding boxes if AI didn't provide any
    if "annotations" not in data or not isinstance(data.get("annotations"), list) or len(data["annotations"]) == 0:
        data["annotations"] = [
            { "label": "Header Region", "box_2d": [30, 40, 140, 960], "color": "#0284C7" },
            { "label": "Station Names", "box_2d": [150, 40, 850, 320], "color": "#22C55E" },
            { "label": "Timestamps Grid", "box_2d": [150, 330, 850, 960], "color": "#A855F7" }
        ]

    return data



def generate_fallback_timetable(image_path: str) -> dict:
    """Generate a clean, structured schedule payload if Vision API fails or times out."""
    fallback_data = {
        "title": "CIRCULAR RAILWAY TIMETABLE MAJERHAT",
        "total_rows": 24,
        "total_cols": 3,
        "has_header_row": True,
        "grid": [
          ["TRAIN NO.", "TIME", "DESTINATION"],
          ["30321", "9.15", "HASNABAD"],
          ["30412", "9.40", "B.B.D BAG"],
          ["30414", "10.05", "B.B.D BAG"],
          ["30121", "11.05", "NAIHATI"],
          ["30011", "11.48", "BIMANBANDAR"],
          ["30452", "15.55", "KOLKATA"],
          ["30317", "16.37", "DUTTAPUKUR"],
          ["30331", "17.30", "HABRA"],
          ["30416", "17.42", "B.B.D BAG"],
          ["30135", "18.14", "RANAGHAT"],
          ["30111", "18.42", "BARRACKPORE"],
          ["30123", "19.43", "NAIHATI"],
          ["30013", "20.10", "BIMANBANDAR"],
          ["30051", "8.56", "BIMANBANDAR"],
          ["30712", "9.40", "NAMKHANA"],
          ["30351", "10.12", "BARASAT"],
          ["30411", "11.20", "SEALDAH"],
          ["30413", "11.56", "SEALDAH"],
          ["30361", "12.38", "HANSNABAD"],
          ["31053", "14.24", "NAIHATI"],
          ["30053", "16.30", "BIMANBANDAR"],
          ["30312", "17.55", "BALLYGUNGE"],
          ["30612", "18.11", "NAIHATI"],
          ["30451", "18.25", "BARUIPUR"],
          ["30552", "18.47", "SEALDAH"],
          ["", "19.08", "GHUTIARI SHARIFF"]
        ],
        "annotations": [
          { "label": "Header Region", "box_2d": [43, 62, 142, 936], "color": "#0284C7" },
          { "label": "Station Names", "box_2d": [144, 303, 763, 492], "color": "#22C55E" },
          { "label": "Timestamps Grid", "box_2d": [144, 62, 763, 936], "color": "#A855F7" }
        ],
        "metadata": {
          "agency_name": "Indian Railways (Eastern)",
          "confidence_score": 96.5
        }
    }
    return _normalize_payload(fallback_data)


def _detect_mime_type(image_path: str) -> str:
    mime, _ = mimetypes.guess_type(image_path)
    if mime and mime.startswith("image/"):
        return mime
    ext = Path(image_path).suffix.lower()
    fallback = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.tiff': 'image/tiff',
    }
    return fallback.get(ext, 'image/jpeg')


import requests

def _call_groq_vision_model(api_key: str, model_name: str, image_bytes: bytes, mime_type: str, prompt_text: str) -> dict:
    """Single model call for Groq Vision API."""
    print(f"[OCR] Trying Groq model: {model_name}")
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": UNIVERSAL_SYSTEM_PROMPT + "\n\n" + prompt_text
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"}
    }
    response = requests.post(url, headers=headers, json=payload, timeout=55)
    
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        error_msg = response.text
        try:
            error_json = response.json()
            if "error" in error_json and "message" in error_json["error"]:
                error_msg = error_json["error"]["message"]
        except Exception:
            pass
        raise ValueError(f"Groq API Error ({response.status_code}): {error_msg}")

    data = response.json()
    raw_text = data["choices"][0]["message"]["content"]
    print(f"[OCR] Got response ({len(raw_text)} chars) from {model_name}")
    return sanitize_and_parse_json(raw_text)



def _call_gemini_model(model_name: str, img, prompt_text: str) -> dict:
    """Single model call — runs inside a thread so we can enforce a hard timeout."""
    print(f"[OCR] Trying model: {model_name}")
    model = genai.GenerativeModel(model_name)
    response = model.generate_content([prompt_text, img])
    
    raw_text = response.text
    print(f"[OCR] Got response ({len(raw_text)} chars) from {model_name}")
    return sanitize_and_parse_json(raw_text)


def extract_with_ai(image_path: str) -> dict:
    """
    Send the image to Vision AI (Gemini or Groq) and return the parsed timetable dict.
    Raises ValueError for config problems, RuntimeError if all models fail.
    Never returns hardcoded/mock data — use generate_fallback_timetable() explicitly
    via the /api/extract-demo endpoint if you want sample data.
    """
    api_key = get_api_key()
    validate_api_key(api_key)   # Raises ValueError with clear message if key is bad

    is_groq = api_key.startswith("gsk_")

    try:
        image_bytes, mime_type = prepare_image_bytes(image_path)
        prompt_text = "Analyze this timetable image and return the structured JSON as instructed."

        last_error = None

        if is_groq:
            models_to_try = [
                "qwen/qwen3.8-27b",
            ]
            for model_name in models_to_try:
                try:
                    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                        future = executor.submit(
                            _call_groq_vision_model, api_key, model_name, image_bytes, mime_type, prompt_text
                        )
                        try:
                            parsed = future.result(timeout=300)
                        except concurrent.futures.TimeoutError:
                            print(f"[OCR] Model {model_name} timed out — trying next")
                            future.cancel()
                            last_error = TimeoutError(f"{model_name} timed out after 300s")
                            continue

                    if parsed and isinstance(parsed, dict) and "grid" in parsed:
                        print(f"[OCR] Success with model: {model_name}")
                        return parsed

                    print(f"[OCR] {model_name} returned payload without 'grid' — trying next")
                    last_error = ValueError(f"{model_name} returned no grid")

                except Exception as model_err:
                    print(f"[OCR] {model_name} failed: {model_err}")
                    last_error = model_err
                    continue
        else:
            genai.configure(api_key=api_key)
            img = Image.open(io.BytesIO(image_bytes))

            # Try models fastest-first; each call runs in a thread with a 120-second hard cap.
            models_to_try = [
                "gemini-3.1-flash-lite",
                "gemini-3.5-flash",
                "gemini-3.6-flash",
            ]

            for model_name in models_to_try:
                try:
                    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                    future = executor.submit(
                        _call_gemini_model, model_name, img, UNIVERSAL_SYSTEM_PROMPT + "\n\n" + prompt_text
                    )
                    try:
                        parsed = future.result(timeout=300)
                        executor.shutdown(wait=False)
                    except concurrent.futures.TimeoutError:
                        print(f"[OCR] Model {model_name} timed out — trying next")
                        future.cancel()
                        executor.shutdown(wait=False)
                        last_error = TimeoutError(f"{model_name} timed out after 300s")
                        continue

                    if parsed and isinstance(parsed, dict) and "grid" in parsed:
                        print(f"[OCR] Success with model: {model_name}")
                        return parsed

                    print(f"[OCR] {model_name} returned payload without 'grid' — trying next")
                    last_error = ValueError(f"{model_name} returned no grid")

                except Exception as model_err:
                    print(f"[OCR] {model_name} failed: {model_err}")
                    last_error = model_err
                    continue
    except ValueError:
        raise   # Re-raise API key validation errors as-is
    except Exception as outer_err:
        raise RuntimeError(f"Vision AI client initialisation failed: {outer_err}") from outer_err

    raise RuntimeError(
        f"All Vision AI models failed to parse the image. Last error: {last_error}. "
        "Check that your API key is valid and the image is a readable timetable."
    )


def extract_timetable_data(image_path: str) -> dict:
    """Entry point called by views.py."""
    return extract_with_ai(image_path)

