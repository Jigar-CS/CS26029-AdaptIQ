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
  <title>CLIAS (AdaptIQ Core Engine) - Project Presentation Poster</title>
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
      height: 1660px;
      background-color: #0F172A;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1E293B;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    .poster-canvas {{
      width: 1200px;
      height: 1660px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      padding: 12px 16px;
    }}

    /* 1. TOP LOGOS BAR */
    .top-logo-bar {{
      width: 100%;
      height: 82px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 4px;
    }}
    .top-logo-bar img {{
      height: 76px;
      max-width: 100%;
      object-fit: contain;
    }}

    /* 2. HERO TITLE BANNER (NAVY BLUE) */
    .title-banner {{
      background: linear-gradient(135deg, #1A2E4C 0%, #204068 50%, #172740 100%);
      color: #FFFFFF;
      border-radius: 4px;
      padding: 10px 24px 12px 24px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
    }}
    .course-sub-top {{
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 3.5px;
      color: #CBD5E1;
      text-transform: uppercase;
      margin-bottom: 2px;
    }}
    .title-row {{
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .title-row h1 {{
      font-size: 45px;
      font-weight: 900;
      letter-spacing: 1px;
      color: #FFFFFF;
      line-height: 1.1;
      text-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }}
    .group-id-badge {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 800;
      padding: 7px 24px;
      border-radius: 4px;
      letter-spacing: 1px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 1px solid #E11D48;
    }}

    /* 3. SUBTITLE LINE */
    .subtitle-bar {{
      padding: 0 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }}
    .subtitle-bar .title-full {{
      font-size: 17px;
      font-weight: 900;
      color: #0F172A;
      letter-spacing: 0.3px;
    }}
    .subtitle-bar .tagline {{
      font-size: 13px;
      font-style: italic;
      color: #334155;
      font-weight: 600;
    }}

    /* CRIMSON SECTION HEADERS */
    .crimson-header {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 14.5px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px 12px;
      border-radius: 4px 4px 0 0;
      text-align: center;
    }}

    /* 4. STUDENTS TABLE & MENTOR CARD (TWO COLUMNS) */
    .team-section-row {{
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 14px;
      align-items: stretch;
    }}
    .students-table-card {{
      border: 1.5px solid #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .students-table {{
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }}
    .students-table th {{
      background: #A51C30;
      color: #FFFFFF;
      padding: 6px 12px;
      font-size: 14px;
      font-weight: 800;
      text-align: left;
      letter-spacing: 0.5px;
    }}
    .students-table td {{
      padding: 7px 12px;
      border-bottom: 1px solid #E2E8F0;
      color: #0F172A;
      font-weight: 700;
    }}
    .students-table tr:last-child td {{
      border-bottom: none;
    }}
    .students-table tr:nth-child(even) {{
      background: #F8FAFC;
    }}
    .students-table .roll-col {{
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #0F172A;
    }}

    .mentor-card {{
      border: 1.5px solid #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .mentor-body {{
      background: #F8FAFC;
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
      justify-content: center;
    }}
    .mentor-body .guide-name {{
      font-size: 16px;
      font-weight: 900;
      color: #0F172A;
    }}
    .mentor-body .guide-dept {{
      font-size: 12.5px;
      color: #334155;
      font-weight: 600;
      line-height: 1.4;
    }}

    /* 5. PROBLEM & SOLUTION CARDS */
    .prob-sol-row {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }}
    .info-card {{
      border: 1.5px solid #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .info-card-body {{
      background: #F8FAFC;
      padding: 12px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      justify-content: center;
    }}
    .bullet-item {{
      font-size: 13.5px;
      color: #1E293B;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 9px;
    }}
    .bullet-dot {{
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #0F172A;
      flex-shrink: 0;
    }}

    /* 6. SYSTEM ARCHITECTURE | 5-TIER PIPELINE */
    .arch-card {{
      border: 1.5px solid #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .arch-body {{
      background: #F8FAFC;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .tiers-row {{
      display: grid;
      grid-template-columns: 1fr 20px 1fr 20px 1fr 20px 1fr 20px 1fr;
      gap: 0;
      align-items: center;
    }}
    .tier-box {{
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      color: #FFFFFF;
      border-radius: 8px;
      padding: 12px 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.12);
      min-height: 84px;
      justify-content: center;
    }}
    .tier-box.tier-db {{
      background: linear-gradient(135deg, #991B1B 0%, #881337 100%);
    }}
    .tier-title {{
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }}
    .tier-desc {{
      font-size: 11px;
      color: #CBD5E1;
      font-weight: 600;
      line-height: 1.35;
    }}
    .arrow-col {{
      display: flex;
      align-items: center;
      justify-content: center;
      color: #A51C30;
      font-size: 16px;
      font-weight: 900;
    }}

    .sub-pipeline-row {{
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }}
    .pipe-pill {{
      background: #FEF08A;
      color: #854D0E;
      border: 1.5px solid #FACC15;
      border-radius: 6px;
      padding: 7px 4px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 800;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }}

    /* 7. THREE COLUMNS (TECH STACK, KEY FEATURES, APPLICATIONS) */
    .three-cols-row {{
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 14px;
    }}

    /* 8. APPLICATION SCREENSHOTS */
    .shots-card {{
      border: 1.5px solid #CBD5E1;
      border-radius: 5px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .shots-body {{
      background: #F1F5F9;
      padding: 10px 14px 10px 14px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
    }}
    .shot-box {{
      background: #FFFFFF;
      border: 1.5px solid #94A3B8;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 3px 8px rgba(0,0,0,0.08);
    }}
    .shot-img {{
      width: 100%;
      height: 205px;
      object-fit: cover;
      object-position: top;
      display: block;
      border-bottom: 1.5px solid #CBD5E1;
    }}
    .shot-label {{
      background: #E2E8F0;
      color: #0F172A;
      text-align: center;
      font-size: 12.5px;
      font-weight: 800;
      padding: 7px 4px;
    }}

    /* 9. TARGET SECTOR BANNER */
    .target-sector-bar {{
      background: #A51C30;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 800;
      text-align: center;
      padding: 8px 12px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }}

    /* 10. BOTTOM FOOTER */
    .bottom-footer {{
      background: #1A2E4C;
      color: #FFFFFF;
      text-align: center;
      padding: 10px 12px;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1.5px;
      border-radius: 4px;
      text-transform: uppercase;
    }}
  </style>
</head>
<body>
  <div class="poster-canvas">

    <!-- 1. TOP LOGO BAR -->
    <div class="top-logo-bar">
      <img src="{logo_b64}" alt="CHARUSAT, CIVF, CII, UN SDGs, CSPIT Logos">
    </div>

    <!-- 2. HERO TITLE BANNER -->
    <div class="title-banner">
      <div class="course-sub-top">PROJECT-I (CEUP 301)</div>
      <div class="title-row">
        <h1>CLIAS (AdaptIQ Core Engine)</h1>
        <div class="group-id-badge">Group Id- CS26029</div>
      </div>
    </div>

    <!-- 3. SUBTITLE LINE -->
    <div class="subtitle-bar">
      <div class="title-full">CHARUSAT Learning Intelligence & Assessment System</div>
      <div class="tagline">Longitudinal Knowledge Tracing, Adaptive Practice, In-Browser Coding Sandbox & AI-Proctored Exam Integrity</div>
    </div>

    <!-- 4. STUDENTS TABLE & MENTOR/GUIDE CARD -->
    <div class="team-section-row">
      <div class="students-table-card">
        <table class="students-table">
          <thead>
            <tr>
              <th style="width: 14%;">Sr.</th>
              <th style="width: 58%;">Student Name</th>
              <th style="width: 28%;">Roll No.</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Jigar Sakhia</td>
              <td class="roll-col">24CS090</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Param Shah</td>
              <td class="roll-col">24CS093</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Himanshu Varotariya</td>
              <td class="roll-col">24CS106</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mentor-card">
        <div class="crimson-header">MENTOR / GUIDE</div>
        <div class="mentor-body">
          <div class="guide-name">Prof. Dhara Solanki</div>
          <div class="guide-dept">Assistant Professor, CSE Dept., CSPIT, CHARUSAT</div>
        </div>
      </div>
    </div>

    <!-- 5. THE PROBLEM & OUR SOLUTION -->
    <div class="prob-sol-row">
      <div class="info-card">
        <div class="crimson-header">THE PROBLEM</div>
        <div class="info-card-body">
          <div class="bullet-item"><div class="bullet-dot"></div> Marks like 14/20 hide real gaps</div>
          <div class="bullet-item"><div class="bullet-dot"></div> No view of knowledge decay</div>
          <div class="bullet-item"><div class="bullet-dot"></div> No guard against collusion</div>
        </div>
      </div>

      <div class="info-card">
        <div class="crimson-header">OUR SOLUTION</div>
        <div class="info-card-body">
          <div class="bullet-item"><div class="bullet-dot"></div> Continuous mastery tracking (BKT)</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Socratic AI hints, no spoilers</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Coding judge + AI-proctored exams</div>
        </div>
      </div>
    </div>

    <!-- 6. SYSTEM ARCHITECTURE | 5-TIER PIPELINE -->
    <div class="arch-card">
      <div class="crimson-header">SYSTEM ARCHITECTURE | 5-TIER PIPELINE</div>
      <div class="arch-body">
        <div class="tiers-row">

          <div class="tier-box">
            <div class="tier-title">1 Users</div>
            <div class="tier-desc">Student • Faculty • Counsellor • HOD</div>
          </div>
          <div class="arrow-col">&#9654;</div>

          <div class="tier-box">
            <div class="tier-title">2 Frontend</div>
            <div class="tier-desc">Next.js 14 • React 18 • Monaco IDE</div>
          </div>
          <div class="arrow-col">&#9654;</div>

          <div class="tier-box">
            <div class="tier-title">3 API Gateway</div>
            <div class="tier-desc">NestJS • JWT RBAC • SSE</div>
          </div>
          <div class="arrow-col">&#9654;</div>

          <div class="tier-box">
            <div class="tier-title">4 AI Engine</div>
            <div class="tier-desc">FastAPI • Gemini • BKT • Code Judge</div>
          </div>
          <div class="arrow-col">&#9654;</div>

          <div class="tier-box tier-db">
            <div class="tier-title">5 Database</div>
            <div class="tier-desc">MySQL 8 • Redis 7 • Vector Store</div>
          </div>

        </div>

        <!-- Gold / Yellow Sub-Pipeline Pills -->
        <div class="sub-pipeline-row">
          <div class="pipe-pill">1. Continuous Diagnostic</div>
          <div class="pipe-pill">2. Adaptive Practice</div>
          <div class="pipe-pill">3. Proctored Exam</div>
          <div class="pipe-pill">4. OBE Analytics</div>
          <div class="pipe-pill">5. Socratic Remediation</div>
        </div>
      </div>
    </div>

    <!-- 7. THREE COLUMNS: TECH STACK, KEY FEATURES, APPLICATIONS -->
    <div class="three-cols-row">
      <div class="info-card">
        <div class="crimson-header">TECHNOLOGY STACK</div>
        <div class="info-card-body">
          <div class="bullet-item"><div class="bullet-dot"></div> Next.js 14 + React 18</div>
          <div class="bullet-item"><div class="bullet-dot"></div> NestJS + Prisma ORM</div>
          <div class="bullet-item"><div class="bullet-dot"></div> FastAPI + Google Gemini</div>
          <div class="bullet-item"><div class="bullet-dot"></div> MySQL 8 + Redis 7</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Monaco Editor + Recharts</div>
        </div>
      </div>

      <div class="info-card">
        <div class="crimson-header">KEY FEATURES</div>
        <div class="info-card-body">
          <div class="bullet-item"><div class="bullet-dot"></div> Knowledge tracing (BKT, EWMA)</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Socratic AI tutor</div>
          <div class="bullet-item"><div class="bullet-dot"></div> In-browser coding judge</div>
          <div class="bullet-item"><div class="bullet-dot"></div> AI exam proctoring</div>
          <div class="bullet-item"><div class="bullet-dot"></div> AST plagiarism detection</div>
        </div>
      </div>

      <div class="info-card">
        <div class="crimson-header">APPLICATIONS</div>
        <div class="info-card-body">
          <div class="bullet-item"><div class="bullet-dot"></div> NBA / NAAC CO–PO reports</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Placement readiness mocks</div>
          <div class="bullet-item"><div class="bullet-dot"></div> At-risk student triage</div>
          <div class="bullet-item"><div class="bullet-dot"></div> Topic-wise mastery curves</div>
        </div>
      </div>
    </div>

    <!-- 8. APPLICATION SCREENSHOTS -->
    <div class="shots-card">
      <div class="crimson-header">APPLICATION SCREENSHOTS</div>
      <div class="shots-body">
        <div class="shot-box">
          <img class="shot-img" src="{shot1_b64}" alt="Student Learning Dashboard">
          <div class="shot-label">1. Student Learning Dashboard</div>
        </div>
        <div class="shot-box">
          <img class="shot-img" src="{shot2_b64}" alt="In-Browser Coding Arena">
          <div class="shot-label">2. In-Browser Coding Arena</div>
        </div>
        <div class="shot-box">
          <img class="shot-img" src="{shot3_b64}" alt="AI Invigilation Console">
          <div class="shot-label">3. AI Invigilation Console</div>
        </div>
      </div>
    </div>

    <!-- 9. TARGET SECTOR BANNER -->
    <div class="target-sector-bar">
      TARGET SECTOR : Higher Education • Technical Universities • NAAC/NBA Colleges • EdTech
    </div>

    <!-- 10. BOTTOM FOOTER -->
    <div class="bottom-footer">
      DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING | CSPIT, CHARUSAT
    </div>

  </div>
</body>
</html>
'''

with open('poster.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Saved exact format poster.html with perfect height balance!")
