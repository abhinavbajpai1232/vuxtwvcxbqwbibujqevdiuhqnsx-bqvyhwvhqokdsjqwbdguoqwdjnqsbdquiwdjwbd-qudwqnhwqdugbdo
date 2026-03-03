import sqlite3
import os
import datetime

def generate_html_report():
    db_path = os.path.join(os.path.dirname(__file__), 'predator_loot.db')
    if not os.path.exists(db_path):
        print("ERROR:Database not found")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM loot")
    rows = cursor.fetchall()

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
        target = str(row[1])
        status = str(row[2])
        risk = str(row[3])
        ts = str(row[4])
        
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
        
    print(f"REPORT_GENERATED:{report_name}")
    conn.close()

if __name__ == "__main__":
    generate_html_report()

