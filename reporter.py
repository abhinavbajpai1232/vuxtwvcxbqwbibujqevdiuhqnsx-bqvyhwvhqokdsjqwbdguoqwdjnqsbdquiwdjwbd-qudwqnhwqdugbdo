from fpdf import FPDF
import sqlite3
import os

def generate_pdf_report():
    db_path = os.path.join(os.path.dirname(__file__), 'predator_loot.db')
    if not os.path.exists(db_path):
        print("ERROR:Database not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM loot")
    rows = cursor.fetchall()

    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="PREDATOR VULNERABILITY REPORT", ln=True, align='C')
    pdf.ln(10)

    # Table Headers
    pdf.set_font("Arial", 'B', 10)
    pdf.cell(80, 10, "Target URL", 1)
    pdf.cell(25, 10, "Status", 1)
    pdf.cell(25, 10, "SQLi Risk", 1)
    pdf.cell(50, 10, "Timestamp", 1)
    pdf.ln()

    # Data Rows
    pdf.set_font("Arial", size=8)
    for row in rows:
        # row[1] is target, row[2] is status, row[3] is sqli_risk, row[4] is timestamp
        target = str(row[1])
        status = str(row[2])
        risk = str(row[3])
        ts = str(row[4])
        
        # Multi-cell for target if it's too long? 
        # For simplicity we just truncate or use a smaller font
        pdf.cell(80, 10, (target[:45] + '..') if len(target) > 45 else target, 1)
        pdf.cell(25, 10, status, 1)
        pdf.cell(25, 10, risk, 1)
        pdf.cell(50, 10, ts, 1)
        pdf.ln()

    report_name = "vulnerability_report.pdf"
    pdf.output(report_name)
    print(f"REPORT_GENERATED:{report_name}")
    conn.close()

if __name__ == "__main__":
    generate_pdf_report()
