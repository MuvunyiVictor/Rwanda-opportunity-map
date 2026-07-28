import json

with open('data.txt', 'r') as file:
    data = json.load(file)

print("File loaded successfully!")
print(f"Total elements: {len(data['elements'])}")