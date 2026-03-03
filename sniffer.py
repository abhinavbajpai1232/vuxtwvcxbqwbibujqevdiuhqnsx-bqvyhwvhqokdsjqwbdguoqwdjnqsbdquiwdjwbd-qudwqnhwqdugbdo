import sys
import random
import time
import threading
import json

# Try to import scapy, fallback to simulation if missing
try:
    from scapy.all import sniff, IP, TCP, UDP, Raw, DNS, DNSQR
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

# Yeh code packets mein se passwords dhoondega
def find_credentials(packet):
    if not SCAPY_AVAILABLE:
        return
    if packet.haslayer(TCP) and packet.haslayer(Raw):
        payload = str(packet[Raw].load).lower()
        keywords = ["user", "pass", "login", "pwd"]
        if any(word in payload for word in keywords):
            print(f"[*] POTENTIAL CREDENTIAL FOUND: {payload}")
            sys.stdout.flush()

def process_dns_packet(packet):
    if not SCAPY_AVAILABLE:
        return
    if packet.haslayer(DNS) and packet.getlayer(DNS).qr == 0 and packet.haslayer(IP):
        try:
            raw_qname = packet[DNSQR].qname
            clean_name = raw_qname.decode('utf-8').rstrip('.')
            dns_data = {
                "type": "DNS_HIT",
                "timestamp": packet.time,
                "src": packet[IP].src,
                "query": clean_name,
                "category": "Social Media" if "instagram" in clean_name else "Search"
            }
            print(f"DNS_HIT|{json.dumps(dns_data)}")
            sys.stdout.flush()
        except Exception as e:
            pass

def packet_callback(packet):
    if not SCAPY_AVAILABLE:
        return
    
    process_dns_packet(packet)
    
    if packet.haslayer(IP):
        ip_src = packet[IP].src
        ip_dst = packet[IP].dst
        protocol = "TCP" if packet.haslayer(TCP) else "UDP" if packet.haslayer(UDP) else "Other"
        
        payload_ascii = "NO_READABLE_DATA"
        if packet.haslayer(Raw):
            raw_data = packet[Raw].load
            payload_ascii = ''.join([chr(b) if 32 <= b < 127 else '.' for b in raw_data])
            
        print(f"PACKET|{ip_src}|{ip_dst}|{protocol}|{len(packet)} bytes|{payload_ascii}")
        sys.stdout.flush()
        find_credentials(packet)

def simulate_sniffing():
    """Generates simulated network traffic for demo purposes when scapy is unavailable."""
    print("[!] Scapy not found. Entering Simulation Mode...")
    sys.stdout.flush()
    
    protocols = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "ICMP"]
    common_ips = [
        "192.168.1.1", "192.168.1.15", "10.0.0.1", "8.8.8.8", 
        "1.1.1.1", "172.16.0.5", "142.250.190.46", "31.13.71.36"
    ]
    
    while True:
        src = random.choice(common_ips)
        dst = random.choice(common_ips)
        if src == dst: continue
        
        proto = random.choice(protocols)
        size = random.randint(40, 1500)
        
        payload_ascii = "NO_READABLE_DATA"
        if proto in ["HTTP", "TCP"]:
            payload_ascii = "GET / HTTP/1.1..Host: example.com.."
            
        print(f"PACKET|{src}|{dst}|{proto}|{size} bytes|{payload_ascii}")
        sys.stdout.flush()
        
        # Simulate DNS hits
        if proto == "DNS" and random.random() < 0.3:
            domains = ["youtube.com", "instagram.com", "google.com", "facebook.com", "github.com"]
            domain = random.choice(domains)
            dns_data = {
                "type": "DNS_HIT",
                "timestamp": time.time(),
                "src": src,
                "query": domain,
                "category": "Social Media" if "instagram" in domain or "facebook" in domain else "Search"
            }
            print(f"DNS_HIT|{json.dumps(dns_data)}")
            sys.stdout.flush()
        
        # Simulate finding credentials occasionally
        if proto in ["HTTP", "TCP"] and random.random() < 0.05:
            simulated_payloads = [
                "user=admin&pass=password123",
                "login_username=root&login_password=toor",
                "pwd=secret&email=test@example.com"
            ]
            payload = random.choice(simulated_payloads)
            print(f"[*] POTENTIAL CREDENTIAL FOUND: {payload}")
            print(f"PACKET|{src}|{dst}|{proto}|{size} bytes|POST /login.php HTTP/1.1 ... Content-Type: application/x-www-form-urlencoded ... {payload}")
            sys.stdout.flush()
            
        time.sleep(random.uniform(0.2, 1.5))

def start_sniffing(interface=None):
    print(f"[*] Starting Predator Eye...")
    sys.stdout.flush()
    
    if SCAPY_AVAILABLE:
        try:
            sniff(iface=interface, prn=packet_callback, store=0)
        except Exception as e:
            print(f"[!] Scapy Error: {e}. Falling back to simulation.")
            sys.stdout.flush()
            simulate_sniffing()
    else:
        simulate_sniffing()

if __name__ == "__main__":
    start_sniffing()
