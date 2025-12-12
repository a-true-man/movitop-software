import csv
import os
import zipfile
import shutil

# הגדרות נתיבים
data_dir = os.path.join(os.getcwd(), "data")
zip_path = os.path.join(data_dir, "gtfs.zip")
extract_dir = os.path.join(data_dir, "temp_gtfs_final_fix")

print(f"--- STARTING ULTIMATE FIX ---")
print(f"Working on: {zip_path}")

# 1. חילוץ ה-ZIP
if os.path.exists(extract_dir):
    shutil.rmtree(extract_dir)
os.makedirs(extract_dir)

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_dir)

# מחיקת קבצים מיותרים שגורמים לצרות
for bad_file in ["translations.txt", "attributions.txt"]:
    bad_path = os.path.join(extract_dir, bad_file)
    if os.path.exists(bad_path):
        os.remove(bad_path)
        print(f"Deleted: {bad_file}")

# ==========================================
# תיקון 1: קובץ הקווים (routes.txt)
# ==========================================
routes_file = os.path.join(extract_dir, "routes.txt")
temp_routes = os.path.join(extract_dir, "routes_temp.txt")
routes_fixed = 0

if os.path.exists(routes_file):
    with open(routes_file, 'r', encoding='utf-8-sig') as infile, \
         open(temp_routes, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        # ניקוי שמות עמודות
        reader.fieldnames = [f.strip() for f in reader.fieldnames]
        writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames)
        writer.writeheader()

        for row in reader:
            rtype = row.get('route_type', '').strip()
            # המרת כל סוג לא מוכר לאוטובוס (3)
            if rtype not in ['0', '1', '2', '3']:
                row['route_type'] = '3'
                routes_fixed += 1
            writer.writerow(row)
    
    os.replace(temp_routes, routes_file)
    print(f"Routes fixed (type correction): {routes_fixed}")

# ==========================================
# תיקון 2: קובץ התחנות (stops.txt) - התיקון החדש!
# ==========================================
stops_file = os.path.join(extract_dir, "stops.txt")
temp_stops = os.path.join(extract_dir, "stops_temp.txt")
stops_fixed = 0

if os.path.exists(stops_file):
    print("Fixing stops.txt...")
    with open(stops_file, 'r', encoding='utf-8-sig') as infile, \
         open(temp_stops, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        reader.fieldnames = [f.strip() for f in reader.fieldnames]
        writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames)
        writer.writeheader()

        for row in reader:
            # הבעיה: location_type=1 (תחנה מרכזית/אזור) בשימוש בלו"ז
            # פתרון: נהפוך הכל ל-0 (תחנה רגילה) כדי למנוע קריסות
            loc_type = row.get('location_type', '0').strip()
            
            if loc_type == '1':
                row['location_type'] = '0'
                stops_fixed += 1
            
            writer.writerow(row)
            
    os.replace(temp_stops, stops_file)
    print(f"Stops fixed (location_type 1->0): {stops_fixed}")

# ==========================================
# 3. אריזה מחדש
# ==========================================
if os.path.exists(zip_path):
    os.remove(zip_path)

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(extract_dir):
        for file in files:
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, extract_dir)
            zipf.write(file_path, arcname)

shutil.rmtree(extract_dir)
print("\nSUCCESS: gtfs.zip is fully patched (Routes + Stops).")