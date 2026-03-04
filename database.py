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


import os
from datetime import datetime
from supabase import create_client, Client # Fix for Import Error

# Supabase Credentials (Ensure these are correct)
url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_KEY"
supabase: Client = create_client(url, key)

def save_loot(target, status, sqli_risk):
    # 1. PEHLE DATA DEFINE KAREIN (Ye missing tha)
    data = {
        "target": target,
        "status": status,
        "sqli_risk": sqli_risk,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # 2. AB INSERT KAREIN
        supabase.table("loot").insert(data).execute()
        print(f"[+] Data Sent to Cloud: {target}")
    except Exception as e:
        print(f"[-] Supabase Error: {e}")
if __name__ == "__main__":
    init_db()