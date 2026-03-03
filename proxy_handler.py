import requests
import random

def get_free_proxies():
    url = "https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all"
    try:
        response = requests.get(url, timeout=10)
        proxies = response.text.split('\r\n')
        return [p for p in proxies if p] # Clean list
    except Exception as e:
        print(f"[!] Error fetching proxies: {e}")
        return []

def get_random_proxy(proxy_list):
    if not proxy_list:
        return None
    proxy = random.choice(proxy_list)
    return {
        "http": f"http://{proxy}",
        "https": f"http://{proxy}"
    }
