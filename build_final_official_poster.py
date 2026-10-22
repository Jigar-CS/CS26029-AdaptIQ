import base64
import os
import subprocess

def get_b64(path):
    with open(path, 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('utf-8')

logo_b64 = get_b64('logo_strip_clean_crop.png')
shot1_b64 = get_b64('poster_screenshots/1_student_dashboard.png')
shot2_b64 = get_b64('poster_screenshots/2_coding_arena.png')
shot3_b64 = get_b64('poster_screenshots/3_invigilation_console.png')

html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PROJECT-I (CEUP 301) - CLIAS (AdaptIQ Core Engine)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      width: 1200px;
      height: 1680px;
      background-color: #FFFFFF;
      font-family: 'Plus Jakarta Sans', Arial, Helvetica, sans-serif;
      color: #0F172A;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    .poster-canvas {{
      width: 1200px;
      height: 1680px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      padding: 10px 18px 12px 18px;
    }}

    /* 1. TOP LOGO STRIP */
    .top-logo-bar {{
      width: 100%;
      height: 84px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 2px solid #CBD5E1;
      padding-bottom: 4px;
    }}
    .top-logo-bar img {{
      height: 78px;
      max-width: 100%;
      object-fit: contain;
    }}

    /* 2. BLUE TITLE BANNER */
    .hero-banner {{
      background: #182B49;
      color: #FFFFFF;
      padding: 12px 24px 0 24px;
      display: flex;
      flex-direction: column;
      position: relative;
      margin-top: 6px;
    }}
    .hero-course-tag {{
      text-align: center;
      font-size: 15.5px;
      font-weight: 800;
      letter-spacing: 3.5px;
      color: #FFFFFF;
      text-transform: uppercase;
      margin-bottom: 6px;
    }}
    .hero-title-row {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 12px;
    }}
    .hero-title-row h1 {{
      font-size: 46px;
      font-weight: 900;
      letter-spacing: 0.5px;
      color: #FFFFFF;
      line-height: 1.1;
      text-transform: uppercase;
    }}
    .group-id-box {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 18px;
      font-weight: 800;
      padding: 8px 24px;
      letter-spacing: 0.5px;
      position: absolute;
      right: 0;
      bottom: 0;
    }}

    /* 3. TAGLINE BELOW TITLE BANNER */
    .tagline-bar {{
      padding: 4px 2px 2px 2px;
      font-size: 14.5px;
      font-weight: 700;
      font-style: italic;
      color: #0F172A;
      margin-top: 3px;
    }}

    /* SECTION CRIMSON HEADER */
    .crimson-header {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px 12px;
      text-align: center;
    }}

    /* 4. TEAM & MENTOR ROW */
    .team-row {{
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: 16px;
      margin-top: 4px;
    }}
    .team-table-card {{
      border: 1.5px solid #CBD5E1;
      display: flex;
      flex-direction: column;
    }}
    .team-table {{
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }}
    .team-table th {{
      background: #A51C30;
      color: #FFFFFF;
      padding: 6px 12px;
      font-size: 14.5px;
      font-weight: 800;
      text-align: left;
      letter-spacing: 0.5px;
      border-right: 1px solid #C53046;
    }}
    .team-table th:last-child {{
      border-right: none;
    }}
    .team-table td {{
      padding: 7px 12px;
      border-bottom: 1px solid #CBD5E1;
      border-right: 1px solid #E2E8F0;
      color: #0F172A;
      font-weight: 700;
    }}
    .team-table td:last-child {{
      border-right: none;
    }}
    .team-table tr:last-child td {{
      border-bottom: none;
    }}
    .team-table tr:nth-child(even) {{
      background: #EEF2F6;
    }}
    .roll-num {{
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #0F172A;
    }}

    .mentor-card {{
      border: 1.5px solid #CBD5E1;
      display: flex;
      flex-direction: column;
    }}
    .mentor-body {{
      background: #FFFFFF;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      justify-content: center;
    }}
    .mentor-name {{
      font-size: 16.5px;
      font-weight: 900;
      color: #0F172A;
    }}
    .mentor-desig {{
      font-size: 13px;
      color: #334155;
      font-weight: 600;
    }}

    /* 5. SYSTEM FLOW / ARCHITECTURE */
    .arch-card {{
      border: 1.5px solid #CBD5E1;
      display: flex;
      flex-direction: column;
      margin-top: 4px;
    }}
    .arch-body {{
      background: #EDF2F7;
      padding: 16px 20px 12px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }}
    .boxes-pipeline-row {{
      display: grid;
      grid-template-columns: 1fr 28px 1fr 28px 1fr 28px 1fr 28px 1fr;
      align-items: center;
    }}
    .pipeline-box {{
      border-radius: 8px;
      padding: 14px 10px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      min-height: 88px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      color: #FFFFFF;
    }}
    .box-blue {{
      background: #23527C;
    }}
    .box-green {{
      background: #00A859;
    }}
    .p-title {{
      font-size: 14.5px;
      font-weight: 900;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }}
    .p-desc {{
      font-size: 11px;
      color: #FFFFFF;
      font-weight: 600;
      line-height: 1.35;
      opacity: 0.95;
    }}
    .arrow-icon {{
      text-align: center;
      color: #3B82F6;
      font-size: 20px;
      font-weight: 900;
    }}

    .arch-footnote {{
      font-size: 12px;
      font-style: italic;
      color: #1E293B;
      font-weight: 600;
      line-height: 1.4;
      text-align: center;
      border-top: 1px dashed #CBD5E1;
      padding-top: 8px;
    }}

    /* 6. THREE CARDS (TECH STACK, KEY FEATURES, APPLICATIONS) */
    .three-cards-row {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-top: 4px;
    }}
    .info-card {{
      border: 1.5px solid #CBD5E1;
      display: flex;
      flex-direction: column;
    }}
    .info-body {{
      background: #EDF2F7;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }}
    .info-bullet {{
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13.5px;
      color: #0F172A;
      font-weight: 600;
      line-height: 1.4;
    }}
    .bullet-dot {{
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #0F172A;
      margin-top: 7px;
      flex-shrink: 0;
    }}

    /* 7. APPLICATION SCREENSHOTS */
    .screenshots-card {{
      border: 1.5px solid #CBD5E1;
      display: flex;
      flex-direction: column;
      margin-top: 4px;
    }}
    .screenshots-body {{
      background: #EDF2F7;
      padding: 14px 16px 12px 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }}
    .screen-item {{
      background: #FFFFFF;
      border: 2px dashed #D97706;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }}
    .screen-img {{
      width: 100%;
      height: 200px;
      object-fit: cover;
      object-position: top;
      display: block;
      border: 1px solid #CBD5E1;
      border-radius: 3px;
    }}
    .screen-caption {{
      text-align: center;
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      padding-top: 8px;
    }}

    /* 8. TARGET INDUSTRY / SECTOR BANNER */
    .target-bar {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 14.5px;
      font-weight: 800;
      text-align: center;
      padding: 9px 16px;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }}

    /* 9. FOOTER BAR */
    .footer-bar {{
      background: #182B49;
      color: #FFFFFF;
      text-align: center;
      padding: 11px 16px;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 4px;
    }}
  </style>
</head>
<body>
  <div class="poster-canvas">

    <!-- 1. TOP LOGO STRIP -->
    <div class="top-logo-bar">
      <img src="{logo_b64}" alt="CHARUSAT, CIVF, CII, UN SDGs, CSPIT Logos">
    </div>

    <!-- 2. BLUE TITLE BANNER -->
    <div class="hero-banner">
      <div class="hero-course-tag">PROJECT-I (CEUP 301)</div>
      <div class="hero-title-row">
        <h1>CLIAS (AdaptIQ Core Engine)</h1>
      </div>
      <div class="group-id-box">Group Id- CS26029</div>
    </div>

    <!-- 3. ONE-LINE TAGLINE -->
    <div class="tagline-bar">
      CHARUSAT Learning Intelligence & Assessment System — Longitudinal Knowledge Tracing, Adaptive Practice, In-Browser Coding Sandbox & AI-Proctored Exam Integrity
    </div>

    <!-- 4. TEAM & MENTOR ROW -->
    <div class="team-row">
      <div class="team-table-card">
        <table class="team-table">
          <thead>
            <tr>
              <th style="width: 12%;">Sr.</th>
              <th style="width: 58%;">Student Name</th>
              <th style="width: 30%;">Roll No.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Jigar Sakhia</td>
              <td class="roll-num">24CS090</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Param Shah</td>
              <td class="roll-num">24CS093</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Himanshu Varotariya</td>
              <td class="roll-num">24CS106</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mentor-card">
        <div class="crimson-header">MENTOR / GUIDE</div>
        <div class="mentor-body">
          <div class="mentor-name">Prof. Dhara Solanki</div>
          <div class="mentor-desig">Assistant Professor, CSE Dept., CSPIT, CHARUSAT</div>
        </div>
      </div>
    </div>

    <!-- 5. SYSTEM FLOW / ARCHITECTURE -->
    <div class="arch-card">
      <div class="crimson-header">SYSTEM FLOW / ARCHITECTURE</div>
      <div class="arch-body">
        <div class="boxes-pipeline-row">

          <!-- Box 1 -->
          <div class="pipeline-box box-blue">
            <div class="p-title">Input / User</div>
            <div class="p-desc">Student • Faculty<br>Counsellor • HOD</div>
          </div>

          <div class="arrow-icon">&#10148;</div>

          <!-- Box 2 -->
          <div class="pipeline-box box-green">
            <div class="p-title">Processing / Logic</div>
            <div class="p-desc">Next.js 14 • Monaco IDE<br>Diagnostic Engine</div>
          </div>

          <div class="arrow-icon">&#10148;</div>

          <!-- Box 3 -->
          <div class="pipeline-box box-blue">
            <div class="p-title">Model / Backend</div>
            <div class="p-desc">NestJS Gateway • BKT<br>FastAPI + Gemini AI</div>
          </div>

          <div class="arrow-icon">&#10148;</div>

          <!-- Box 4 -->
          <div class="pipeline-box box-green">
            <div class="p-title">Database / Storage</div>
            <div class="p-desc">MySQL 8 • Redis 7<br>BullMQ Telemetry</div>
          </div>

          <div class="arrow-icon">&#10148;</div>

          <!-- Box 5 -->
          <div class="pipeline-box box-blue">
            <div class="p-title">Output / Result</div>
            <div class="p-desc">Mastery Curves • Code Pass<br>Trust Score • OBE Reports</div>
          </div>

        </div>

        <div class="arch-footnote">
          End-to-End Pipeline: Diagnostic Practice &rarr; Bayesian Knowledge Tracing (BKT) &rarr; Sandboxed Code Execution &rarr; Socratic Remediation &rarr; NBA / NAAC CO-PO Attainment
        </div>
      </div>
    </div>

    <!-- 6. THREE COLUMNS (TECH STACK, KEY FEATURES, APPLICATIONS) -->
    <div class="three-cards-row">

      <!-- Column 1 -->
      <div class="info-card">
        <div class="crimson-header">TECHNOLOGY STACK</div>
        <div class="info-body">
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Frontend:</strong> Next.js 14, React 18, Monaco IDE, Tailwind CSS</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Backend / DB:</strong> NestJS (TypeScript), FastAPI (Python 3.11), MySQL 8, Redis 7</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Tools / Libraries:</strong> Google Gemini 1.5, Prisma ORM, BullMQ, Recharts</div>
          </div>
        </div>
      </div>

      <!-- Column 2 -->
      <div class="info-card">
        <div class="crimson-header">KEY FEATURES</div>
        <div class="info-body">
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Knowledge Tracing:</strong> BKT & EWMA memory decay curve modeling</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Socratic AI Tutor:</strong> Guided conceptual hints without leaking answers</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Integrity & Proctoring:</strong> In-browser judge, AST plagiarism, focus loss guard</div>
          </div>
        </div>
      </div>

      <!-- Column 3 -->
      <div class="info-card">
        <div class="crimson-header">APPLICATIONS</div>
        <div class="info-body">
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Accreditation:</strong> Automated NBA / NAAC CO-PO attainment matrices</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>Placement Mocks:</strong> Standardized coding arena & verified skill profiles</div>
          </div>
          <div class="info-bullet">
            <div class="bullet-dot"></div>
            <div><strong>At-Risk Triage:</strong> Early detection of struggling students for counsellors</div>
          </div>
        </div>
      </div>

    </div>

    <!-- 7. APPLICATION SCREENSHOTS -->
    <div class="screenshots-card">
      <div class="crimson-header">APPLICATION SCREENSHOTS</div>
      <div class="screenshots-body">
        
        <div class="screen-item">
          <img class="screen-img" src="{shot1_b64}" alt="Student Learning Dashboard">
          <div class="screen-caption">Screenshot 1 — Student Learning Dashboard</div>
        </div>

        <div class="screen-item">
          <img class="screen-img" src="{shot2_b64}" alt="In-Browser Coding Arena">
          <div class="screen-caption">Screenshot 2 — In-Browser Coding Arena</div>
        </div>

        <div class="screen-item">
          <img class="screen-img" src="{shot3_b64}" alt="AI Invigilation Console">
          <div class="screen-caption">Screenshot 3 — AI Invigilation Console</div>
        </div>

      </div>
    </div>

    <!-- 8. TARGET INDUSTRY / SECTOR BANNER -->
    <div class="target-bar">
      TARGET INDUSTRY / SECTOR : Higher Education • Technical Universities • NAAC / NBA Colleges • EdTech
    </div>

    <!-- 9. FOOTER BAR -->
    <div class="footer-bar">
      DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING | CSPIT, CHARUSAT
    </div>

  </div>
</body>
</html>
'''

with open('poster.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Saved official format poster.html!")
