import os
from datetime import datetime, timezone
from typing import Optional

try:
    from supabase import create_client, Client
    from supabase.lib.client_options import ClientOptions
except ImportError:
    raise ImportError("Supabase library not installed. Run: pip install supabase")


# ==============================
# Hardcoded Credentials (As Requested)
# ==============================

SUPABASE_URL: str = "https://kewbyppxdgxkwtelcxed.supabase.co"
SUPABASE_KEY: str = "sb_publishable_vCN82fw_sIyUTqwjjNV36Q_Gs-u7bXD"


# ==============================
# Supabase Client Initialization
# ==============================

try:
    supabase: Client = create_client(
        SUPABASE_URL,
        SUPABASE_KEY,
        options=ClientOptions(
            auto_refresh_token=True,
            persist_session=False,
        ),
    )
except Exception as e:
    raise RuntimeError(f"Failed to initialize Supabase client: {e}")


# ==============================
# Database Operation
# ==============================

def save_loot(target: str, status: str, sqli_risk: str) -> dict:
    """
    Inserts scan result into 'loot' table.
    """

    payload = {
        "target": target.strip(),
        "status": status.strip(),
        "sqli_risk": sqli_risk.strip(),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    try:
        response = supabase.table("loot").insert(payload).execute()

        if not response.data:
            raise RuntimeError("Insertion returned empty response.")

        return response.data

    except Exception as e:
        raise RuntimeError(f"Supabase insertion failed: {e}")