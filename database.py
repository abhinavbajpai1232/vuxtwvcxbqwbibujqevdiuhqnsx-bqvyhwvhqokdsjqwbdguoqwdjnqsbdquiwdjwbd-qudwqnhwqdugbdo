from datetime import datetime, timezone

try:
    from supabase import create_client
except ImportError:
    raise ImportError("Install supabase first: pip install supabase")


# ==============================
# Hardcoded Credentials
# ==============================

SUPABASE_URL = "https://kewbyppxdgxkwtelcxed.supabase.co"
SUPABASE_KEY = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD"


# ==============================
# Initialize Client
# ==============================

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    raise RuntimeError(f"Supabase initialization failed: {e}")


# ==============================
# Save Function
# ==============================

def save_loot(target, status, sqli_risk):
    payload = {
        "target": str(target).strip(),
        "status": str(status).strip(),
        "sqli_risk": str(sqli_risk).strip(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    try:
        response = supabase.table("loot").insert(payload).execute()

        if response.data:
            return response.data
        else:
            raise RuntimeError("Insert failed. Empty response returned.")

    except Exception as e:
        raise RuntimeError(f"Supabase insertion failed: {e}")