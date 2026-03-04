import os
from datetime import datetime
from supabase import create_client

# Supabase Configuration
# Bhai, ye wahi keys hain jo aapne di thi
URL = "https://kewbyppxdgxkwtelcxed.supabase.co"
KEY = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD" 

supabase = create_client(URL, KEY)

def init_db():
    # Cloud mein table pehle se bani honi chahiye (SQL Editor use karein)
    print("[!] Cloud Database (Supabase) Connection Initialized.")

<<<<<<< HEAD

import os
from datetime import datetime
from supabase import create_client, Client # Fix for Import Error

# Supabase Credentials (Ensure these are correct)
url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_KEY"
supabase: Client = create_client(url, key)

def save_loot(target, status, sqli_risk):
    # 1. PEHLE DATA DEFINE KAREIN (Ye missing tha)
=======
def save_loot(target, status, sqli_risk):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Data structure jo Supabase table mein jayega
>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
    data = {
        "target": target,
        "status": status,
        "sqli_risk": sqli_risk,
<<<<<<< HEAD
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # 2. AB INSERT KAREIN
        supabase.table("loot").insert(data).execute()
        print(f"[+] Data Sent to Cloud: {target}")
    except Exception as e:
        print(f"[-] Supabase Error: {e}")
=======
        "timestamp": timestamp
    }
    
    try:
        # 'loot' table mein data insert karna
        supabase.table("loot").insert(data).execute()
        print(f"DATABASE_SAVED_CLOUD:{target}|RISK:{sqli_risk}")
    except Exception as e:
        print(f"[-] Supabase Error: {e}")

def self_destruct():
    # Cloud data delete karne ke liye
    try:
        supabase.table("loot").delete().neq("target", "null").execute()
        print("SYSTEM_CLEANED: Cloud loot evidence destroyed.")
    except Exception as e:
        print(f"[-] Delete Error: {e}")

>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
if __name__ == "__main__":
    init_db()