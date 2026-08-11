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
ASSETS_PATH = os.path.join(DIRECTORY, "data", "assets.json")

CURATED_NEWS_PATH = os.path.join(DIRECTORY, "data", "curated_news.json")
SCHOOLS_PATH = os.path.join(DIRECTORY, "data", "schools_directory.json")
LAND_CENTER_PATH = os.path.join(DIRECTORY, "data", "land_center_data.json")


# ============================================================
# SCORING ENGINE
# ============================================================
def calculate_intrinsic_score(asset):
    score = 50  # base score
    
    asset_type = asset.get('type', '').lower()
    capacity = asset.get('capacity', '')
    
    if asset_type == 'hospital':
        try:
            if 'bed' in capacity.lower():
                beds = int(''.join(filter(str.isdigit, capacity)) or 0)
                score = min(100, 30 + beds * 0.7)
            else:
                score = 60
        except:
            score = 60
    elif asset_type == 'school':
        try:
            if 'classroom' in capacity.lower() or 'room' in capacity.lower():
                rooms = int(''.join(filter(str.isdigit, capacity)) or 0)
                score = min(100, 30 + rooms)
            else:
                score = 60
        except:
            score = 60
    elif asset_type == 'farm':
        try:
            if 'ha' in capacity.lower():
                ha = float(''.join(filter(str.isdigit, capacity)) or 0)
                score = min(100, 20 + ha * 0.5)
            else:
                score = 55
        except:
            score = 55
    elif asset_type == 'market':
        score = 65
    elif asset_type == 'factory':
        score = 70
    elif asset_type == 'bank':
        score = 75
    elif asset_type == 'hotel':
        score = 68
    elif asset_type == 'construction':
        score = 55
    elif asset_type == 'major-project':
        score = 88
    else:
        score = 50
    
    # Boost if operational
    if asset.get('status') == 'operational':
        score = min(100, score + 10)
    elif asset.get('status') == 'under-construction':
        score = min(100, score + 5)
    
    return round(score)


class LocalMVPHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

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
            return
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
            return
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
            return
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
            return
        elif self.path == "/api/assets":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(ASSETS_PATH):
                with open(ASSETS_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"assets": []}).encode("utf-8"))
            return
        elif self.path == "/api/curated-news":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(CURATED_NEWS_PATH):
                with open(CURATED_NEWS_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"curated_news": []}).encode("utf-8"))
            return
        elif self.path == "/api/schools":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(SCHOOLS_PATH):
                with open(SCHOOLS_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"schools": []}).encode("utf-8"))
            return
        elif self.path == "/api/land-center":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(LAND_CENTER_PATH):
                with open(LAND_CENTER_PATH, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(json.dumps({"districts": {}}).encode("utf-8"))
            return

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
            return

        # ============================================================
        # INGEST CURATED NEWS (DATA CURATOR ENGINE INTERFACE)
        # ============================================================
        elif self.path == "/api/curated-news/ingest":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                news_item = json.loads(post_data.decode('utf-8'))
                existing = {"curated_news": []}
                if os.path.exists(CURATED_NEWS_PATH):
                    with open(CURATED_NEWS_PATH, "r") as f:
                        try:
                            existing = json.load(f)
                            if "curated_news" not in existing:
                                existing = {"curated_news": []}
                        except:
                            existing = {"curated_news": []}
                if "id" not in news_item:
                    news_item["id"] = f"news_{len(existing['curated_news']) + 1:03d}"
                if "published_at" not in news_item:
                    news_item["published_at"] = datetime.datetime.utcnow().isoformat() + "Z"
                existing["curated_news"].insert(0, news_item)  # Prepend newest
                with open(CURATED_NEWS_PATH, "w") as f:
                    json.dump(existing, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "news_id": news_item["id"]}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
            return

        # ============================================================
        # REFRESH OSM DATA
        # ============================================================
        elif self.path == "/api/osm/refresh":
            try:
                print("[INFO] Fetching fresh OSM construction data from Overpass API...")
                osm_data = fetch_osm_from_overpass()
                with open(OSM_CACHE_PATH, "w") as f:
                    json.dump(osm_data, f, indent=2)
                elements_count = len(osm_data.get("elements", []))
                print(f"[INFO] Successfully updated cache with {elements_count} elements.")
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
            return

        # ============================================================
        # ADD MAJOR PROJECT
        # ============================================================
        elif self.path == "/api/major-projects/add":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_project = json.loads(post_data.decode('utf-8'))
                existing = {"projects": []}
                if os.path.exists(MAJOR_PROJECTS_PATH):
                    with open(MAJOR_PROJECTS_PATH, "r") as f:
                        existing = json.load(f)
                        if "projects" not in existing:
                            existing = {"projects": []}
                if "id" not in new_project:
                    max_id = 0
                    for p in existing.get("projects", []):
                        if p.get("id", 0) > max_id:
                            max_id = p.get("id", 0)
                    new_project["id"] = max_id + 1
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
            return

        # ============================================================
        # ADD OSM ELEMENT
        # ============================================================
        elif self.path == "/api/osm/add":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_element = json.loads(post_data.decode('utf-8'))
                existing = {"elements": []}
                if os.path.exists(OSM_CACHE_PATH):
                    with open(OSM_CACHE_PATH, "r") as f:
                        existing = json.load(f)
                        if "elements" not in existing:
                            existing = {"elements": []}
                max_id = 0
                for el in existing.get("elements", []):
                    if el.get("id", 0) > max_id:
                        max_id = el.get("id", 0)
                new_element["id"] = max_id + 1
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
            return

        # ============================================================
        # UPLOAD ASSET DATA
        # ============================================================
        elif self.path == "/api/assets/upload":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            print("Received:", post_data)
            try:
                asset_data = json.loads(post_data.decode('utf-8'))
                print("Parsed:", asset_data)

                # Load existing with error handling
                if os.path.exists(ASSETS_PATH):
                    try:
                        with open(ASSETS_PATH, "r") as f:
                            existing = json.load(f)
                            if "assets" not in existing:
                                existing = {"assets": []}
                    except:
                        existing = {"assets": []}
                else:
                    existing = {"assets": []}

                # Generate ID
                max_id = 0
                for a in existing.get("assets", []):
                    if a.get("id", 0) > max_id:
                        max_id = a.get("id", 0)
                asset_data["id"] = max_id + 1
                asset_data["uploaded_at"] = datetime.datetime.utcnow().isoformat()

                # Calculate scores
                asset_data["scores"] = {
                    "intrinsic": calculate_intrinsic_score(asset_data),
                    "proximity": 0,
                    "demographic": 0,
                    "composite": 0
                }

                existing["assets"].append(asset_data)

                with open(ASSETS_PATH, "w") as f:
                    json.dump(existing, f, indent=2)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "asset_id": asset_data["id"]}).encode())
            except Exception as e:
                print("Error:", e)
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
            return

        # ============================================================
        # ADD SCHOOL TO DIRECTORY
        # ============================================================
        elif self.path == "/api/schools/add":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                new_school = json.loads(post_data.decode('utf-8'))
                existing = {"schools": []}
                if os.path.exists(SCHOOLS_PATH):
                    with open(SCHOOLS_PATH, "r") as f:
                        try:
                            existing = json.load(f)
                            if "schools" not in existing:
                                existing = {"schools": []}
                        except:
                            existing = {"schools": []}
                existing["schools"].append(new_school)
                with open(SCHOOLS_PATH, "w") as f:
                    json.dump(existing, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "school": new_school}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
            return

        # ============================================================
        # UPDATE LAND CENTER DATA
        # ============================================================
        elif self.path == "/api/land-center/update":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                district_name = payload.get("district")
                scores = payload.get("scores", {})
                existing = {"districts": {}}
                if os.path.exists(LAND_CENTER_PATH):
                    with open(LAND_CENTER_PATH, "r") as f:
                        try:
                            existing = json.load(f)
                            if "districts" not in existing:
                                existing = {"districts": {}}
                        except:
                            existing = {"districts": {}}
                if district_name:
                    existing["districts"][district_name] = scores
                with open(LAND_CENTER_PATH, "w") as f:
                    json.dump(existing, f, indent=2)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "district": district_name, "scores": scores}).encode("utf-8"))
            except Exception as e:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode("utf-8"))
            return


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
    print("        RWANDA OPPORTUNITY MAP - COMPLETE SERVER")
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