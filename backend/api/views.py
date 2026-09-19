import os
import logging
import concurrent.futures
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ocr_engine import extract_timetable_data, get_api_key, generate_fallback_timetable

logger = logging.getLogger(__name__)

VIEW_TIMEOUT_SECONDS = 300  # Increased from 75s to allow for laptop sleep/pauses


@csrf_exempt
@require_http_methods(["GET"])
def check_config(request):
    """Health-check: tells the frontend whether a valid API key is configured."""
    key = get_api_key()
    is_valid = bool(key and len(key.strip()) >= 10 and key != "your_api_key_here")
    return JsonResponse({
        "api_key_configured": is_valid,
        "key_prefix": key[:4] if key else "None",
        "message": (
            "API key configured correctly."
            if is_valid
            else (
                "API key is missing or invalid. Please check your backend/.env file."
            )
        )
    })


@csrf_exempt
@require_http_methods(["POST"])
def extract_data(request):
    """
    POST /api/extract
    Accepts a multipart image upload, runs it through Gemini Vision AI,
    and returns a structured JSON timetable payload.
    """
    if "file" not in request.FILES:
        return JsonResponse({"detail": "No file provided. POST a file under the key 'file'."}, status=400)

    uploaded_file = request.FILES["file"]

    if not uploaded_file.content_type.startswith("image/"):
        return JsonResponse(
            {"detail": f"Unsupported file type '{uploaded_file.content_type}'. Please upload an image (JPEG, PNG, WEBP, etc.)"},
            status=400,
        )

    # Write upload to a temp file so PIL / Gemini can read it
    temp_path = f"temp_upload_{uploaded_file.name}"
    try:
        with open(temp_path, "wb+") as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)

        file_size_kb = uploaded_file.size // 1024
        logger.info("[extract] Processing: %s (%d KB)", uploaded_file.name, file_size_kb)
        print(f"[extract] Processing: {uploaded_file.name} ({file_size_kb} KB)")

        # Run Vision AI extraction inside a thread so Django can enforce a wall-clock timeout.
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(extract_timetable_data, temp_path)
            try:
                data = future.result(timeout=VIEW_TIMEOUT_SECONDS)
            except concurrent.futures.TimeoutError:
                future.cancel()
                msg = (
                    f"Vision AI timed out after {VIEW_TIMEOUT_SECONDS}s. "
                    "Try a smaller / clearer image or check your network connection."
                )
                logger.warning("[extract] %s", msg)
                print(f"[extract] {msg}")
                return JsonResponse({"detail": msg}, status=504)

        if not data or not isinstance(data, dict):
            return JsonResponse(
                {"detail": "Vision AI returned an empty or malformed payload."},
                status=502,
            )

        print(f"[extract] Done. Keys in payload: {list(data.keys())}")
        return JsonResponse({"status": "success", "data": data})

    except Exception as exc:
        logger.error("[extract] Unhandled error: %s", exc, exc_info=True)
        print(f"[extract] Error: {exc}")
        return JsonResponse({"detail": str(exc)}, status=500)

    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@csrf_exempt
@require_http_methods(["POST"])
def extract_demo(request):
    """
    POST /api/extract-demo
    Returns the built-in sample timetable (Majerhat Circular Railway) for UI demos
    without needing a real API key or image upload.
    """
    from ocr_engine import generate_fallback_timetable
    data = generate_fallback_timetable("demo")
    return JsonResponse({"status": "demo", "data": data})

# Force reload for AQ key
