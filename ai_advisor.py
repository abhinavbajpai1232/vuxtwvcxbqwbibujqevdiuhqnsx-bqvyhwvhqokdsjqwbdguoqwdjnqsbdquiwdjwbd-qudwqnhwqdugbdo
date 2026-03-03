import google.generativeai as genai
import os

# Configure Gemini
# Note: In this environment, the API key is handled via environment variables
api_key = os.environ.get("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-1.5-flash')

def get_exploit_advice(vuln_type, target):
    prompt = f"""
    You are a professional penetration tester. 
    I found a {vuln_type} vulnerability on {target}.
    Provide a concise:
    1. Potential Impact
    2. Possible Exploit Vector (for educational purposes)
    3. Remediation steps.
    Keep it in a hacker-terminal style.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"ERROR: AI_ADVISOR_FAILED -> {str(e)}"
