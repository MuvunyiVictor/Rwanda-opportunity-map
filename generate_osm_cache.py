import json
import os
import random

def generate_default_osm_cache(output_path):
    print("Generating default rich OSM cache data...")
    
    # Target cities coords
    cities = {
        "Kigali": {"lat": -1.9441, "lng": 30.0619, "radius": 15000},
        "Musanze": {"lat": -1.5028, "lng": 29.6350, "radius": 8000},
        "Rubavu": {"lat": -1.6829, "lng": 29.2573, "radius": 8000},
        "Muhanga": {"lat": -2.0800, "lng": 29.7584, "radius": 8000},
        "Nyagatare": {"lat": -1.2996, "lng": 30.3243, "radius": 8000},
        "Rusizi": {"lat": -2.4896, "lng": 28.8961, "radius": 8000},
        "Kayonza": {"lat": -1.9366, "lng": 30.5214, "radius": 8000}
    }
    
    elements = []
    element_id = 100000000
    
    # Helper to add node
    def add_node(lat, lng, tags):
        nonlocal element_id
        element_id += 1
        elements.append({
            "type": "node",
            "id": element_id,
            "lat": lat,
            "lon": lng,
            "tags": tags
        })
        return element_id

    # Helper to add a polygon (way)
    def add_way(coords, tags):
        nonlocal element_id
        node_ids = []
        for lat, lng in coords:
            node_ids.append(add_node(lat, lng, {}))
        
        # Close the loop for polygon
        if coords[0] != coords[-1]:
            node_ids.append(node_ids[0])
            
        element_id += 1
        elements.append({
            "type": "way",
            "id": element_id,
            "nodes": node_ids,
            "tags": tags
        })
        return element_id

    # Seed data generation for each city
    for city_name, info in cities.items():
        lat = info["lat"]
        lng = info["lng"]
        
        # 1. Construction Sites
        # Kigali has more, others have some
        num_const = 5 if city_name == "Kigali" else 2
        for i in range(num_const):
            o_lat = lat + random.uniform(-0.04, 0.04)
            o_lng = lng + random.uniform(-0.04, 0.04)
            # Add a small square building footprint under construction
            coords = [
                (o_lat, o_lng),
                (o_lat + 0.001, o_lng),
                (o_lat + 0.001, o_lng + 0.001),
                (o_lat, o_lng + 0.001)
            ]
            add_way(coords, {
                "landuse": "construction",
                "construction": random.choice(["residential", "commercial", "retail", "industrial"]),
                "name": f"{city_name} Construction Project {i+1}",
                "operator": f"{city_name} Development Corp"
            })
            
        # 2. Hardware / Material Suppliers
        num_suppliers = 8 if city_name == "Kigali" else 3
        supplier_names = [
            "Nyabugogo Hardware Center", "Kigali Cement & Steel Depot", "Kicukiro Construction Materials",
            "Dufatanye Hardware Shop", "Ubumwe Hardware Store", "Abakoranamucyo Materials Ltd",
            "Hardware Solutions Rwanda", "Kigali Tool Rental & Supply"
        ] if city_name == "Kigali" else [
            f"{city_name} Central Hardware", f"Abizerwa Material Depot", f"{city_name} Tools & Pipes"
        ]
        
        for i in range(num_suppliers):
            o_lat = lat + random.uniform(-0.03, 0.03)
            o_lng = lng + random.uniform(-0.03, 0.03)
            name = supplier_names[i] if i < len(supplier_names) else f"{city_name} Material Supplier {i+1}"
            add_node(o_lat, o_lng, {
                "shop": "hardware",
                "name": name,
                "opening_hours": "08:00-18:00",
                "phone": f"+25078800{random.randint(1000, 9999)}"
            })

        # 3. Warehouses
        num_warehouses = 4 if city_name == "Kigali" else 2
        for i in range(num_warehouses):
            o_lat = lat + random.uniform(-0.05, 0.05)
            o_lng = lng + random.uniform(-0.05, 0.05)
            coords = [
                (o_lat, o_lng),
                (o_lat + 0.0015, o_lng),
                (o_lat + 0.0015, o_lng + 0.002),
                (o_lat, o_lng + 0.002)
            ]
            add_way(coords, {
                "building": "warehouse",
                "name": f"{city_name} Logistics Warehouse {chr(65+i)}",
                "storage": random.choice(["cement", "steel", "general_construction", "timber"])
            })

        # 4. Technical / Vocational Schools (Labor Pool)
        tvet_names = {
            "Kigali": ["IPRC Kigali", "Nyamirambo Technical School", "Kicukiro Vocational College"],
            "Musanze": ["IPRC Musanze", "Ruhengeri Technical Institute"],
            "Rubavu": ["Rubavu TVET Center", "Gisenyi Vocational Academy"],
            "Muhanga": ["Muhanga Technical College", "Kabgayi TVET School"],
            "Nyagatare": ["Nyagatare Technical Institute", "Eastern Province TVET"],
            "Rusizi": ["Rusizi Vocational Training Center", "Kamembe TVET School"],
            "Kayonza": ["Kayonza Technical School", "Mukarange TVET School"]
        }
        for name in tvet_names.get(city_name, [f"{city_name} TVET Center"]):
            o_lat = lat + random.uniform(-0.03, 0.03)
            o_lng = lng + random.uniform(-0.03, 0.03)
            add_node(o_lat, o_lng, {
                "amenity": "school",
                "school:type": "technical",
                "name": name,
                "operator": "Government / Private Partnership",
                "capacity": str(random.randint(200, 800))
            })

        # 5. Quarries and Mines (for Raw Materials)
        # Mainly in Musanze, Muhanga, Rwamagana (near Kayonza), Kigali (Gasabo)
        num_quarries = 3 if city_name in ["Musanze", "Muhanga", "Kayonza"] else (1 if city_name == "Kigali" else 0)
        quarry_types = {
            "Musanze": "volcanic_stone",
            "Muhanga": "clay_bricks",
            "Kayonza": "sand_gravel",
            "Kigali": "laterite_stones"
        }
        for i in range(num_quarries):
            o_lat = lat + random.uniform(-0.07, 0.07)
            o_lng = lng + random.uniform(-0.07, 0.07)
            coords = [
                (o_lat, o_lng),
                (o_lat + 0.002, o_lng),
                (o_lat + 0.002, o_lng + 0.002),
                (o_lat, o_lng + 0.002)
            ]
            q_type = quarry_types.get(city_name, "general_materials")
            add_way(coords, {
                "landuse": "quarry",
                "resource": q_type,
                "name": f"{city_name} Raw Materials Quarry {i+1}",
                "operator": f"{city_name} Minerals Ltd"
            })

        # 6. Support Infrastructure
        # Electricity substations
        num_sub = 3 if city_name == "Kigali" else 1
        for i in range(num_sub):
            o_lat = lat + random.uniform(-0.04, 0.04)
            o_lng = lng + random.uniform(-0.04, 0.04)
            add_node(o_lat, o_lng, {
                "power": "substation",
                "name": f"{city_name} Power Substation {i+1}",
                "voltage": "110kV"
            })
            
        # Water point / water treatment
        o_lat = lat + random.uniform(-0.04, 0.04)
        o_lng = lng + random.uniform(-0.04, 0.04)
        add_node(o_lat, o_lng, {
            "man_made": "water_works",
            "name": f"{city_name} Water Supply & Distribution Station",
            "operator": "WASAC"
        })

        # Fuel stations (for transport/machinery)
        num_fuel = 4 if city_name == "Kigali" else 2
        fuel_brands = ["SP", "Rubis", "Merez", "TotalEnergies", "Mount Meru"]
        for i in range(num_fuel):
            o_lat = lat + random.uniform(-0.03, 0.03)
            o_lng = lng + random.uniform(-0.03, 0.03)
            brand = random.choice(fuel_brands)
            add_node(o_lat, o_lng, {
                "amenity": "fuel",
                "name": f"{brand} {city_name}",
                "operator": brand,
                "fuel:diesel": "yes"
            })

        # Banks/ATMs (Financial access)
        num_banks = 8 if city_name == "Kigali" else 3
        bank_brands = ["Bank of Kigali", "BPR Bank", "I&M Bank", "Equity Bank", "Cogebanque", "Access Bank"]
        for i in range(num_banks):
            o_lat = lat + random.uniform(-0.02, 0.02)
            o_lng = lng + random.uniform(-0.02, 0.02)
            brand = random.choice(bank_brands)
            add_node(o_lat, o_lng, {
                "amenity": "bank",
                "name": f"{brand} - {city_name} Branch",
                "operator": brand,
                "atm": "yes"
            })

        # Add Special Economic Zones or Industrial Parks
        if city_name == "Kigali":
            # Kigali Special Economic Zone (KSEZ)
            coords = [
                (-1.9600, 30.1200),
                (-1.9500, 30.1200),
                (-1.9500, 30.1350),
                (-1.9600, 30.1350)
            ]
            add_way(coords, {
                "landuse": "industrial",
                "industrial": "special_economic_zone",
                "name": "Kigali Special Economic Zone (KSEZ)",
                "operator": "RDB"
            })
        elif city_name == "Muhanga":
            # Muhanga Industrial Area
            coords = [
                (-2.0720, 29.7480),
                (-2.0670, 29.7480),
                (-2.0670, 29.7550),
                (-2.0720, 29.7550)
            ]
            add_way(coords, {
                "landuse": "industrial",
                "name": "Muhanga Clay Products & Industrial Zone"
            })
        elif city_name == "Rusizi":
            # CIMERWA cement factory footprint
            coords = [
                (-2.4820, 28.9100),
                (-2.4720, 28.9100),
                (-2.4720, 28.9250),
                (-2.4820, 28.9250)
            ]
            add_way(coords, {
                "landuse": "industrial",
                "industrial": "cement_factory",
                "name": "CIMERWA Cement Plant",
                "operator": "CIMERWA Pls"
            })

    output_data = {
        "generator": "Antigravity Cache Generator 1.0",
        "elements": elements
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)
        
    print(f"OSM Cache generated and saved to {output_path} with {len(elements)} elements.")

if __name__ == "__main__":
    generate_default_osm_cache("C:/Users/pc/Desktop/my_folder_project/opportunity_map/data/osm_cache.json")
