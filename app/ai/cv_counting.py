"""
cv_counting.py — Conveyor Belt QR Scanner

Simulates a warehouse conveyor-belt camera system using a webcam.
Detects QR codes in real time, extracts SKU strings, and posts
stock transactions (IN or OUT) to the warehouse API.

Usage:
    python -m app.ai.cv_counting IN
    python -m app.ai.cv_counting OUT
    python -m app.ai.cv_counting PO
    python -m app.ai.cv_counting SO

Press 'q' to quit the webcam session.
"""

import sys
import time
import threading
import requests
import cv2
import math

# ---------------------------------------------------------------------------
# Configuration — adjust these to match your environment
# ---------------------------------------------------------------------------
API_BASE_URL = "http://localhost:8000"
STOCK_ENDPOINT = f"{API_BASE_URL}/stock/scan"   # SKU-based endpoint
PO_ENDPOINT = f"{API_BASE_URL}/purchase-orders/scan-session" # PO Receiving endpoint
SO_ENDPOINT = f"{API_BASE_URL}/dispatch-orders/scan-session" # SO Dispatch endpoint
AUTH_TOKEN = ""                                  # Set via login, or leave blank for dev
COOLDOWN_SECONDS = 2                             # Per-SKU scan cooldown

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
tracked_objects = []
MAX_DISTANCE = 150  # pixels
EXPIRE_TIME = 2.0   # seconds
total_scanned = 0
scan_lock = threading.Lock()

def calculate_centroid(pts):
    x = sum(pt[0] for pt in pts) / len(pts)
    y = sum(pt[1] for pt in pts) / len(pts)
    return (x, y)

def distance(p1, p2):
    return math.hypot(p1[0] - p2[0], p1[1] - p2[1])


def _post_transaction(sku: str, mode: str):
    """Send the stock transaction to the API in a background thread."""
    global total_scanned

    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"

    if mode == "PO":
        target_url = PO_ENDPOINT
        payload = {
            "sku": sku,
            "quantity": 1
        }
    elif mode == "SO":
        target_url = SO_ENDPOINT
        payload = {
            "sku": sku,
            "quantity": 1
        }
    else:
        target_url = STOCK_ENDPOINT
        payload = {
            "sku": sku,
            "quantity": 1,
            "type": mode,
            "source": "Auto via CV",
        }

    try:
        resp = requests.post(target_url, json=payload, headers=headers, timeout=5)
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
    if mode not in ("IN", "OUT", "PO", "SO"):
        print("Error: mode must be IN, OUT, PO, or SO")
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
        retval, decoded_info, points, _ = detector.detectAndDecodeMulti(frame)
        
        current_time = time.time()
        
        # Expire old objects
        global tracked_objects
        tracked_objects = [obj for obj in tracked_objects if current_time - obj["last_seen"] < EXPIRE_TIME]

        if retval and len(decoded_info) > 0:
            for i, data in enumerate(decoded_info):
                if not data:
                    continue
                sku = data.strip()
                pts = points[i].astype(int)
                centroid = calculate_centroid(pts)

                # Draw bounding box (green)
                for j in range(len(pts)):
                    cv2.line(frame, tuple(pts[j]), tuple(pts[(j + 1) % len(pts)]),
                             (0, 255, 0), 3)

                # Show SKU next to the QR code
                cv2.putText(frame, f"SKU: {sku}", (pts[0][0], pts[0][1] - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

                # Match with tracked objects
                matched_obj = None
                for obj in tracked_objects:
                    if obj["sku"] == sku and distance(obj["centroid"], centroid) < MAX_DISTANCE:
                        matched_obj = obj
                        break
                
                if matched_obj:
                    # Update its position and time
                    matched_obj["centroid"] = centroid
                    matched_obj["last_seen"] = current_time
                else:
                    # New object detected!
                    new_obj = {
                        "sku": sku,
                        "centroid": centroid,
                        "last_seen": current_time,
                    }
                    tracked_objects.append(new_obj)
                    
                    # Post transaction
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
        print("Usage: python -m app.ai.cv_counting <IN|OUT|PO|SO>")
        sys.exit(1)
    run(sys.argv[1])
