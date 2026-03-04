<<<<<<< HEAD
import sqlite3
import os
import datetime

def generate_html_report():
=======
from fpdf import FPDF
import sqlite3
import os

def generate_pdf_report():
>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
    db_path = os.path.join(os.path.dirname(__file__), 'predator_loot.db')
    if not os.path.exists(db_path):
        print("ERROR:Database not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM loot")
    rows = cursor.fetchall()

<<<<<<< HEAD
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PREDATOR VULNERABILITY REPORT</title>
        <style>
            body {{
                font-family: 'Courier New', Courier, monospace;
                background-color: #0a0a0a;
                color: #00ff00;
                margin: 0;
                padding: 20px;
            }}
            h1 {{
                text-align: center;
                border-bottom: 1px solid #00ff00;
                padding-bottom: 10px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th, td {{
                border: 1px solid #00ff00;
                padding: 10px;
                text-align: left;
            }}
            th {{
                background-color: #1a1a1a;
            }}
            .timestamp {{
                text-align: right;
                font-size: 0.8em;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <h1>PREDATOR VULNERABILITY REPORT</h1>
        <table>
            <thead>
                <tr>
                    <th>Target URL</th>
                    <th>Status</th>
                    <th>SQLi Risk</th>
                    <th>Timestamp</th>
                </tr>
            </thead>
            <tbody>
    """

    for row in rows:
=======
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
>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
        target = str(row[1])
        status = str(row[2])
        risk = str(row[3])
        ts = str(row[4])
        
<<<<<<< HEAD
        html_content += f"""
                <tr>
                    <td>{target}</td>
                    <td>{status}</td>
                    <td>{risk}</td>
                    <td>{ts}</td>
                </tr>
        """

    html_content += f"""
            </tbody>
        </table>
        <div class="timestamp">Report generated on: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>
    </body>
    </html>
    """

    report_name = "vulnerability_report.html"
    with open(report_name, "w") as f:
        f.write(html_content)
        
=======
        # Multi-cell for target if it's too long? 
        # For simplicity we just truncate or use a smaller font
        pdf.cell(80, 10, (target[:45] + '..') if len(target) > 45 else target, 1)
        pdf.cell(25, 10, status, 1)
        pdf.cell(25, 10, risk, 1)
        pdf.cell(50, 10, ts, 1)
        pdf.ln()

    report_name = "vulnerability_report.pdf"
    pdf.output(report_name)
>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
    print(f"REPORT_GENERATED:{report_name}")
    conn.close()

if __name__ == "__main__":
<<<<<<< HEAD
    generate_html_report()

=======
    generate_pdf_report()
>>>>>>> 1aaf0d9de456e45b6d0102d35ef9f9dceb34bf00
