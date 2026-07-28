import http.server
import socketserver
import webbrowser
import threading
import os
import sys
import json
import urllib.request
import urllib.parse
import datetime

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
OSM_CACHE_PATH = os.path.join(DIRECTORY, "data", "osm_cache.json")
CROWDSOURCED_PATH = os.path.join(DIRECTORY, "data", "crowdsourced.json")
AGRICULTURE_PATH = os.path.join(DIRECTORY, "data", "agriculture_data.json")
MAJOR_PROJECTS_PATH = os.path.join(DIRECTORY, "major_projects.json")

class LocalMVPHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == "/api/osm":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(OSM_CACHE_PATH):
                with open(OSM_CACHE_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"elements": []}).encode("utf-8"))
        elif self.path == "/api/crowdsourced":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(CROWDSOURCED_PATH):
                with open(CROWDSOURCED_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps([]).encode("utf-8"))
        elif self.path == "/api/agriculture":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(AGRICULTURE_PATH):
                with open(AGRICULTURE_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"districts": {}}).encode("utf-8"))
        elif self.path == "/api/major-projects":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(MAJOR_PROJECTS_PATH):
                with open(MAJOR_PROJECTS_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"projects": []}).encode("utf-8"))
        else:
            super().do_GET()

    def do_POST(self):
        # ============================================================
        # ADD CROWDSOURCED REPORT
        # ============================================================
        if self.path == "/api/crowdsourced":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_report = json.loads(post_data.decode('utf-8'))
                
                existing_data = []
                if os.path.exists(CROWDSOURCED_PATH):
                    with open(CROWDSOURCED_PATH, "r") as f:
                        try:
                            existing_data = json.load(f)
                        except json.JSONDecodeError:
                            existing_data = []
                
                if "id" not in new_report:
                    new_report["id"] = f"report_{len(existing_data) + 1:03d}"
                
                if "timestamp" not in new_report:
                    new_report["timestamp"] = datetime.datetime.utcnow().isoformat() + "Z"
                
                existing_data.append(new_report)
                
                with open(CROWDSOURCED_PATH, "w") as f:
                    json.dump(existing_data, f, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "data": new_report}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

        # ============================================================
        # REFRESH OSM DATA FROM OVERPASS API
        # ============================================================
        elif self.path == "/api/osm/refresh":
            try:
                print("[INFO] Fetching fresh OSM construction data from Overpass API...")
                osm_data = fetch_osm_from_overpass()
                
                with open(OSM_CACHE_PATH, "w") as f:
                    json.dump(osm_data, f, indent=2)
                
                elements_count = len(osm_data.get("elements", []))
                print(f"[INFO] Successfully updated cache with {elements_count} elements from Overpass.")
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "elements_count": elements_count}).encode("utf-8"))
            except Exception as e:
                print(f"[ERROR] Failed to fetch from Overpass API: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": f"Failed to fetch from OSM: {str(e)}"}).encode("utf-8"))

        # ============================================================
        # ADD MAJOR PROJECT (NEW)
        # ============================================================
        elif self.path == "/api/major-projects/add":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_project = json.loads(post_data.decode('utf-8'))
                
                # Load existing projects
                existing = {"projects": []}
                if os.path.exists(MAJOR_PROJECTS_PATH):
                    with open(MAJOR_PROJECTS_PATH, "r") as f:
                        existing = json.load(f)
                        if "projects" not in existing:
                            existing = {"projects": []}
                
                # Generate ID if not present
                if "id" not in new_project:
                    max_id = 0
                    for p in existing.get("projects", []):
                        if p.get("id", 0) > max_id:
                            max_id = p.get("id", 0)
                    new_project["id"] = max_id + 1
                
                # Add timestamp
                new_project["date_added"] = datetime.datetime.utcnow().isoformat() + "Z"
                
                existing["projects"].append(new_project)
                
                with open(MAJOR_PROJECTS_PATH, "w") as f:
                    json.dump(existing, f, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "project": new_project}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

        # ============================================================
        # ADD OSM ELEMENT (NEW)
        # ============================================================
        elif self.path == "/api/osm/add":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_element = json.loads(post_data.decode('utf-8'))
                
                # Load existing OSM cache
                existing = {"elements": []}
                if os.path.exists(OSM_CACHE_PATH):
                    with open(OSM_CACHE_PATH, "r") as f:
                        existing = json.load(f)
                        if "elements" not in existing:
                            existing = {"elements": []}
                
                # Generate ID
                max_id = 0
                for el in existing.get("elements", []):
                    if el.get("id", 0) > max_id:
                        max_id = el.get("id", 0)
                new_element["id"] = max_id + 1
                
                # Add timestamp
                new_element["date_added"] = datetime.datetime.utcnow().isoformat() + "Z"
                
                existing["elements"].append(new_element)
                
                with open(OSM_CACHE_PATH, "w") as f:
                    json.dump(existing, f, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "element": new_element}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))

        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def fetch_osm_from_overpass():
    cities = [
        {"name": "Kigali", "lat": -1.9441, "lng": 30.0619, "radius": 15000},
        {"name": "Musanze", "lat": -1.5028, "lng": 29.6350, "radius": 8000},
        {"name": "Rubavu", "lat": -1.6829, "lng": 29.2573, "radius": 8000},
        {"name": "Muhanga", "lat": -2.0800, "lng": 29.7584, "radius": 8000},
        {"name": "Nyagatare", "lat": -1.2996, "lng": 30.3243, "radius": 8000},
        {"name": "Rusizi", "lat": -2.4896, "lng": 28.8961, "radius": 8000},
        {"name": "Kayonza", "lat": -1.9366, "lng": 30.5214, "radius": 8000}
    ]
    
    query_parts = []
    for city in cities:
        lat, lng, rad = city["lat"], city["lng"], city["radius"]
        query_parts.append(f'way(around:{rad},{lat},{lng})["landuse"="construction"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["building"="construction"];')
        query_parts.append(f'way(around:{rad},{lat},{lng})["building"="construction"];')
        query_parts.append(f'way(around:{rad},{lat},{lng})["building"~"^(residential|commercial|industrial|warehouse|retail)$"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["shop"~"^(hardware|doityourself)$"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["building"="warehouse"];')
        query_parts.append(f'way(around:{rad},{lat},{lng})["building"="warehouse"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["landuse"="quarry"];')
        query_parts.append(f'way(around:{rad},{lat},{lng})["landuse"="quarry"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["power"="substation"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["amenity"="fuel"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["amenity"~"^(bank|atm)$"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["amenity"~"^(school|college)$"];')
        query_parts.append(f'node(around:{rad},{lat},{lng})["man_made"="water_works"];')

    full_query = "[out:json][timeout:90];(\n" + "\n".join(query_parts) + "\n);\nout body;\n>;\nout skel qt;"
    
    url = "https://overpass-api.de/api/interpreter"
    data = urllib.parse.urlencode({"data": full_query}).encode("utf-8")
    
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "AntigravityRwandaMap/1.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))

def start_browser():
    webbrowser.open(f"http://localhost:{PORT}")

def main():
    print("=" * 60)
    print("        RWANDA CONSTRUCTION INTELLIGENCE MAP - SERVER")
    print("=" * 60)
    print(f"Serving files from: {DIRECTORY}")
    print(f"Server URL:         http://localhost:{PORT}")
    print("To stop the server, press Ctrl+C or close this window.")
    print("=" * 60)

    threading.Timer(1.0, start_browser).start()

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), LocalMVPHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Server stopped by user request.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()