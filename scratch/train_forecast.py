import urllib.request
import urllib.parse
import json

base_url = "http://localhost:8000"

def login():
    url = f"{base_url}/auth/login"
    payload = {
        "email": "admin@warehouse.com",
        "password": "admin123"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data["data"]["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def train_model(token):
    url = f"{base_url}/forecast/train"
    req = urllib.request.Request(url, method='POST', headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Train model response: {response.getcode()} {response.read().decode('utf-8')}")
    except Exception as e:
        print(f"Train model failed: {e}")

if __name__ == "__main__":
    token = login()
    if token:
        print("Logged in successfully.")
        train_model(token)
