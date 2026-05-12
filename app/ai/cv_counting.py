"""
cv_counting.py — Conveyor Belt QR Scanner

Simulates a warehouse conveyor-belt camera system using a webcam.
Detects QR codes in real time, extracts SKU strings, and posts
stock transactions (IN or OUT) to the warehouse API.

Usage:
    python -m app.ai.cv_counting IN
    python -m app.ai.cv_counting OUT

Press 'q' to quit the webcam session.
"""

import sys
import time
import threading
import requests
import cv2

# ---------------------------------------------------------------------------
# Configuration — adjust these to match your environment
# ---------------------------------------------------------------------------
API_BASE_URL = "http://localhost:8000"
STOCK_ENDPOINT = f"{API_BASE_URL}/stock/scan"   # SKU-based endpoint
AUTH_TOKEN = ""                                  # Set via login, or leave blank for dev
COOLDOWN_SECONDS = 2                             # Per-SKU scan cooldown

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
last_scan_time: dict[str, float] = {}   # SKU -> last timestamp
total_scanned = 0
scan_lock = threading.Lock()


def _post_transaction(sku: str, mode: str):
    """Send the stock transaction to the API in a background thread."""
    global total_scanned

    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"

    payload = {
        "sku": sku,
        "quantity": 1,
        "type": mode,
        "source": "Auto via CV",
    }

    try:
        resp = requests.post(STOCK_ENDPOINT, json=payload, headers=headers, timeout=5)
        if resp.status_code == 200:
            with scan_lock:
                total_scanned += 1
            print(f"[OK] {mode} x1  SKU={sku}  (total: {total_scanned})")
        else:
            print(f"[ERR] API {resp.status_code}: {resp.text[:120]}")
    except requests.RequestException as e:
        print(f"[ERR] Request failed: {e}")


def run(mode: str):
    """Main loop: open webcam, detect QR codes, post transactions."""
    global total_scanned

    mode = mode.upper()
    if mode not in ("IN", "OUT"):
        print("Error: mode must be IN or OUT")
        sys.exit(1)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: could not open webcam")
        sys.exit(1)

    detector = cv2.QRCodeDetector()
    print(f"Scanner started in {mode} mode. Press 'q' to quit.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # ------------------------------------------------------------------
        # QR Detection
        # ------------------------------------------------------------------
        data, bbox, _ = detector.detectAndDecode(frame)

        if data and bbox is not None:
            sku = data.strip()
            pts = bbox[0].astype(int)

            # Draw bounding box (green)
            for i in range(len(pts)):
                cv2.line(frame, tuple(pts[i]), tuple(pts[(i + 1) % len(pts)]),
                         (0, 255, 0), 3)

            # Show SKU next to the QR code
            cv2.putText(frame, f"SKU: {sku}", (pts[0][0], pts[0][1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            # Cooldown check
            now = time.time()
            last = last_scan_time.get(sku, 0)
            if now - last >= COOLDOWN_SECONDS:
                last_scan_time[sku] = now
                threading.Thread(
                    target=_post_transaction,
                    args=(sku, mode),
                    daemon=True,
                ).start()

        # ------------------------------------------------------------------
        # HUD overlay
        # ------------------------------------------------------------------
        cv2.putText(frame, f"Mode: {mode}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 200, 0), 2)
        cv2.putText(frame, f"Scanned: {total_scanned}", (10, 65),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 200, 0), 2)

        cv2.imshow("Conveyor Belt Scanner", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"\nSession ended. Total items processed: {total_scanned}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.ai.cv_counting <IN|OUT>")
        sys.exit(1)
    run(sys.argv[1])
