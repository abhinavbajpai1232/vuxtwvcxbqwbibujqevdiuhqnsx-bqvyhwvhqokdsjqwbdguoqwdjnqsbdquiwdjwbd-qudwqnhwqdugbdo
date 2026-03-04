import os
from datetime import datetime
from supabase import create_client, Client

# Credentials
url = "https://kewbyppxdgxkwtelcxed.supabase.co"
key = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD"
supabase: Client = create_client(url, key)

def save_loot(target, status, sqli_risk):
    # Dictionary banana zaroori hai (Fixes "data not defined")
    data = {
        "target": target,
        "status": status,
        "sqli_risk": sqli_risk,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Proper indentation (4 spaces)
        response = supabase.table("loot").insert(data).execute()
        print(f"[+] Loot Saved: {target}")
        return response
    except Exception as e:
        print(f"[-] Supabase Error: {e}")
        return None