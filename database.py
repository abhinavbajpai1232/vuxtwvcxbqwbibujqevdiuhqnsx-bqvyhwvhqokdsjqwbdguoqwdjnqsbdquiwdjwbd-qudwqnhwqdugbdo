import os
from datetime import datetime

# 1. Sabse pehle try-except lagao taaki Pylance error na de
try:
    from supabase import create_client, Client
except ImportError:
    print("[-] Error: supabase library not installed. Run 'pip install supabase'")

# 2. Setup Credentials
url = "https://kewbyppxdgxkwtelcxed.supabase.co"
key = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD"

# 3. Client Initialize karein
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"[-] Supabase initialization failed: {e}")

def save_loot(target, status, sqli_risk):
    """
    Saves scan results to Supabase 'loot' table.
    """
    # 4. 'data' variable define karna zaroori hai (Fixes "data is not defined")
    data = {
        "target": str(target),
        "status": str(status),
        "sqli_risk": str(sqli_risk),
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # 5. Proper Indentation (Exactly 4 spaces inside try)
        response = supabase.table("loot").insert(data).execute()
        print(f"[+] Loot successfully saved for: {target}")
        return response
    except Exception as e:
        print(f"[-] Supabase Insertion Error: {e}")
        return None