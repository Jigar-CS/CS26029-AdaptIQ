import base64
import os

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
  <title>CLIAS (AdaptIQ) - Academic Project Presentation Poster</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      width: 1200px;
      height: 1700px;
      background-color: #0F172A;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    .poster-canvas {{
      width: 1200px;
      height: 1700px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      position: relative;
    }}

    /* 1. TOP LOGO STRIP */
    .top-logo-bar {{
      width: 100%;
      height: 94px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 18px;
      border-bottom: 2px solid #E2E8F0;
    }}
    .top-logo-bar img {{
      width: 100%;
      height: 100%;
      object-fit: contain;
    }}

    /* 2. SUB BANNER */
    .sub-banner {{
      background: #0B132B;
      color: #93C5FD;
      text-align: center;
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 3.5px;
      padding: 6px 0;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }}

    /* 3. HERO TITLE & GROUP ID */
    .title-banner {{
      background: radial-gradient(circle at 20% 50%, #1E3A8A 0%, #0B132B 80%, #060B18 100%);
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 30px;
      position: relative;
      border-bottom: 4px solid #881337;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }}
    .title-left {{
      display: flex;
      flex-direction: column;
      gap: 3px;
    }}
    .project-acronym-row {{
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .project-acronym-row h1 {{
      font-size: 44px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #FFFFFF;
      line-height: 1;
      text-shadow: 0 2px 12px rgba(0,0,0,0.5);
    }}
    .project-acronym-row .badge-adaptiq {{
      font-size: 13.5px;
      font-weight: 800;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.15) 100%);
      border: 1.5px solid rgba(147, 197, 253, 0.4);
      padding: 5px 12px;
      border-radius: 6px;
      letter-spacing: 0.8px;
      color: #BFDBFE;
      text-transform: uppercase;
      backdrop-filter: blur(4px);
    }}
    .project-subtitle {{
      font-size: 18px;
      font-weight: 800;
      color: #F8FAFC;
      letter-spacing: 0.3px;
      margin-top: 2px;
    }}
    .project-tagline {{
      font-size: 12.5px;
      color: #94A3B8;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 0.2px;
    }}
    .group-id-badge {{
      background: linear-gradient(135deg, #BE123C 0%, #881337 100%);
      color: #FFFFFF;
      font-size: 19px;
      font-weight: 900;
      padding: 11px 26px;
      border-radius: 8px;
      letter-spacing: 1px;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(190, 18, 60, 0.4);
      border: 1px solid rgba(255,255,255,0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }}
    .group-id-badge .badge-sub {{
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #FECDD3;
      text-transform: uppercase;
    }}

    /* 4. PILLARS / CONTINUOUS LOOP BAR */
    .pillars-bar {{
      background: #F8FAFC;
      border-bottom: 1.5px solid #E2E8F0;
      padding: 7px 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .pillars-label {{
      font-size: 12px;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .pillar-tags {{
      display: flex;
      gap: 9px;
    }}
    .pillar-tag {{
      font-size: 11px;
      font-weight: 700;
      padding: 3.5px 12px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 5px;
    }}
    .p-learn {{ background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }}
    .p-prac {{ background: #F5F3FF; color: #6D28D9; border: 1px solid #DDD6FE; }}
    .p-assess {{ background: #FFF1F2; color: #BE123C; border: 1px solid #FECDD3; }}
    .p-anal {{ background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }}
    .p-integ {{ background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }}

    /* MAIN BODY */
    .main-body {{
      flex: 1;
      padding: 13px 26px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
      background-color: #FFFFFF;
    }}

    /* SECTION HEADER BANNER (CRIMSON TO BURGUNDY) */
    .section-header {{
      background: linear-gradient(90deg, #881337 0%, #9F1239 50%, #881337 100%);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 800;
      text-align: center;
      padding: 5.5px 0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }}

    /* 5. TEAM & GUIDE SECTION */
    .team-guide-row {{
      display: flex;
      gap: 16px;
    }}
    .team-table-box {{
      flex: 1.45;
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }}
    .table-hdr {{
      background: linear-gradient(90deg, #881337 0%, #BE123C 100%);
      color: #FFFFFF;
      display: flex;
      font-weight: 800;
      font-size: 12.5px;
      padding: 6.5px 14px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}
    .table-hdr .c-sr {{ width: 10%; text-align: center; }}
    .table-hdr .c-name {{ width: 55%; }}
    .table-hdr .c-roll {{ width: 35%; text-align: center; }}

    .table-row {{
      display: flex;
      font-size: 13px;
      padding: 7.5px 14px;
      border-bottom: 1px solid #E2E8F0;
      align-items: center;
      background-color: #FFFFFF;
    }}
    .table-row:nth-child(even) {{
      background-color: #F8FAFC;
    }}
    .table-row:last-child {{
      border-bottom: none;
    }}
    .table-row .c-sr {{ width: 10%; text-align: center; font-weight: 700; color: #64748B; }}
    .table-row .c-name {{ width: 55%; font-weight: 700; color: #0F172A; }}
    .table-row .c-roll {{ width: 35%; text-align: center; font-weight: 800; color: #1E3A8A; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }}

    .guide-box {{
      flex: 1;
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }}
    .guide-hdr {{
      background: linear-gradient(90deg, #881337 0%, #BE123C 100%);
      color: #FFFFFF;
      font-weight: 800;
      font-size: 12.5px;
      padding: 6.5px 14px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}
    .guide-content {{
      padding: 9px 16px;
      background-color: #F8FAFC;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-left: 4px solid #1E3A8A;
    }}
    .guide-name {{
      font-size: 15.5px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 2px;
    }}
    .guide-desig {{
      font-size: 12.5px;
      color: #1E293B;
      font-weight: 600;
    }}
    .guide-dept {{
      font-size: 11.5px;
      color: #64748B;
      font-weight: 500;
    }}

    /* 6. PROBLEM & SOLUTION ROW */
    .prob-sol-row {{
      display: flex;
      gap: 14px;
    }}
    .prob-card {{
      flex: 1;
      border: 1.5px solid #FECDD3;
      border-radius: 6px;
      background: #FFF1F2;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .prob-hdr {{
      background: #BE123C;
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 800;
      padding: 5px 12px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .prob-body {{
      padding: 8px 12px;
      font-size: 12px;
      color: #4C0519;
      line-height: 1.45;
      font-weight: 600;
    }}
    .prob-body ul {{
      padding-left: 16px;
    }}
    .prob-body li {{
      margin-bottom: 3px;
    }}

    .sol-card {{
      flex: 1;
      border: 1.5px solid #A7F3D0;
      border-radius: 6px;
      background: #ECFDF5;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .sol-hdr {{
      background: #059669;
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 800;
      padding: 5px 12px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }}
    .sol-body {{
      padding: 8px 12px;
      font-size: 12px;
      color: #064E3B;
      line-height: 1.45;
      font-weight: 600;
    }}
    .sol-body ul {{
      padding-left: 16px;
    }}
    .sol-body li {{
      margin-bottom: 3px;
    }}

    /* 7. SYSTEM ARCHITECTURE & 5-TIER PIPELINE */
    .arch-container {{
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px 8px 12px;
      background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }}
    .arch-flow {{
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: 8px;
    }}
    .arch-node {{
      flex: 1;
      background: #FFFFFF;
      border-radius: 6px;
      padding: 8px 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
      border: 1px solid #E2E8F0;
      position: relative;
    }}
    .arch-node.t1 {{ border-top: 3.5px solid #2563EB; }}
    .arch-node.t2 {{ border-top: 3.5px solid #0891B2; }}
    .arch-node.t3 {{ border-top: 3.5px solid #4F46E5; }}
    .arch-node.t4 {{ border-top: 3.5px solid #059669; }}
    .arch-node.t5 {{ border-top: 3.5px solid #D97706; }}

    .tier-badge {{
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }}
    .arch-node.t1 .tier-badge {{ color: #2563EB; }}
    .arch-node.t2 .tier-badge {{ color: #0891B2; }}
    .arch-node.t3 .tier-badge {{ color: #4F46E5; }}
    .arch-node.t4 .tier-badge {{ color: #059669; }}
    .arch-node.t5 .tier-badge {{ color: #D97706; }}

    .node-title {{
      font-size: 12.5px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
      line-height: 1.2;
    }}
    .node-items {{
      font-size: 10.5px;
      color: #475569;
      line-height: 1.4;
      font-weight: 500;
    }}
    .node-items strong {{
      color: #0F172A;
    }}
    .arch-connector {{
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94A3B8;
      font-size: 16px;
      font-weight: 900;
      user-select: none;
    }}
    .arch-pipeline-badge {{
      margin-top: 8px;
      background: #F1F5F9;
      border: 1px dashed #CBD5E1;
      border-radius: 4px;
      padding: 4.5px 8px;
      text-align: center;
      font-size: 11px;
      color: #334155;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }}
    .arch-pipeline-badge span {{
      color: #881337;
      font-weight: 800;
    }}

    /* 8. THREE COLUMN SECTION */
    .three-cols {{
      display: flex;
      gap: 13px;
    }}
    .col-card {{
      flex: 1;
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }}
    .col-header {{
      background: linear-gradient(90deg, #881337 0%, #BE123C 100%);
      color: #FFFFFF;
      font-size: 12.5px;
      font-weight: 800;
      text-align: center;
      padding: 5.5px 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}
    .col-content {{
      padding: 10px 12px;
      background-color: #FFFFFF;
      flex: 1;
      font-size: 11.5px;
      line-height: 1.5;
      color: #1E293B;
    }}
    .col-content ul {{
      list-style-type: disc;
      padding-left: 15px;
    }}
    .col-content li {{
      margin-bottom: 6px;
    }}
    .col-content li:last-child {{
      margin-bottom: 0;
    }}
    .col-content li strong {{
      color: #0F172A;
    }}

    /* 9. APPLICATION SCREENSHOTS (LIVE RUNTIME SHOWCASE) */
    .screenshots-container {{
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #FFFFFF;
      box-shadow: 0 2px 5px rgba(0,0,0,0.03);
    }}
    .screenshots-grid {{
      display: flex;
      gap: 11px;
    }}
    .screenshot-card {{
      flex: 1;
      border: 1.5px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      background: #0B132B;
      display: flex;
      flex-direction: column;
      box-shadow: 0 3px 8px rgba(0,0,0,0.08);
    }}
    .mock-window-bar {{
      background: #1E293B;
      color: #94A3B8;
      padding: 5px 9px;
      font-size: 9.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }}
    .mock-dots {{
      display: flex;
      gap: 4.5px;
    }}
    .mock-dot {{
      width: 6.5px;
      height: 6.5px;
      border-radius: 50%;
    }}
    .mock-dot.r {{ background: #EF4444; }}
    .mock-dot.y {{ background: #F59E0B; }}
    .mock-dot.g {{ background: #10B981; }}

    .screenshot-img-box {{
      width: 100%;
      height: 245px;
      background: #0F172A;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }}
    .screenshot-img-box img {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }}

    .screenshot-caption {{
      background: #F8FAFC;
      padding: 5.5px 7px;
      text-align: center;
      font-size: 11px;
      font-weight: 800;
      color: #0F172A;
      border-top: 1.5px solid #E2E8F0;
      line-height: 1.25;
    }}
    .screenshot-subcap {{
      font-size: 9px;
      color: #64748B;
      font-weight: 600;
      display: block;
      margin-top: 2px;
    }}

    /* 10. TARGET INDUSTRY / SECTOR */
    .target-sector-bar {{
      background: linear-gradient(90deg, #881337 0%, #BE123C 100%);
      color: #FFFFFF;
      font-size: 13.5px;
      font-weight: 800;
      text-align: center;
      padding: 8.5px 12px;
      border-radius: 5px;
      letter-spacing: 0.6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }}
    .target-sector-bar span {{
      font-weight: 600;
      color: #FEF08A;
    }}

    /* 11. FOOTER STRIP */
    .footer-bar {{
      background: #0F172A;
      color: #F8FAFC;
      text-align: center;
      font-size: 14.5px;
      font-weight: 800;
      letter-spacing: 2.5px;
      padding: 10px 0;
      text-transform: uppercase;
      border-top: 3px solid #881337;
    }}
  </style>
</head>
<body>

  <div class="poster-canvas">

    <!-- 1. TOP LOGO STRIP -->
    <div class="top-logo-bar">
      <img src="{logo_b64}" alt="CHARUSAT, CSPIT, NAAC, NIRF, CIVF, IIC, SDGs">
    </div>

    <!-- 2. SUB BANNER -->
    <div class="sub-banner">
      PROJECT-I (CEUP 301) — CAPSTONE PROJECT PRESENTATION
    </div>

    <!-- 3. HERO TITLE & GROUP ID -->
    <div class="title-banner">
      <div class="title-left">
        <div class="project-acronym-row">
          <h1>CLIAS</h1>
          <span class="badge-adaptiq">AdaptIQ Core Engine</span>
        </div>
        <div class="project-subtitle">
          CHARUSAT Learning Intelligence &amp; Assessment System
        </div>
        <div class="project-tagline">
          Longitudinal Knowledge Tracing • Adaptive Practice • In-Browser Coding Sandbox • AI-Proctored Exam Integrity
        </div>
      </div>
      <div class="group-id-badge">
        <span class="badge-sub">University Team</span>
        Group Id — CS26029
      </div>
    </div>

    <!-- 4. PILLARS -->
    <div class="pillars-bar">
      <span class="pillars-label">⚡ Continuous Intelligence Loop:</span>
      <div class="pillar-tags">
        <span class="pillar-tag p-learn">📖 01. Diagnostic Drill</span>
        <span class="pillar-tag p-prac">&lt;/&gt; 02. Adaptive Practice</span>
        <span class="pillar-tag p-assess">🛡️ 03. Proctored Exam</span>
        <span class="pillar-tag p-anal">📊 04. OBE Analytics</span>
        <span class="pillar-tag p-integ">💡 05. Socratic Remediation</span>
      </div>
    </div>

    <!-- MAIN BODY -->
    <div class="main-body">

      <!-- 5. TEAM & GUIDE SECTION -->
      <div class="team-guide-row">
        <div class="team-table-box">
          <div class="table-hdr">
            <div class="c-sr">SR.</div>
            <div class="c-name">STUDENT NAME</div>
            <div class="c-roll">ROLL NO.</div>
          </div>
          <div class="table-row">
            <div class="c-sr">1</div>
            <div class="c-name">Jigar Sakhia</div>
            <div class="c-roll">24CS090</div>
          </div>
          <div class="table-row">
            <div class="c-sr">2</div>
            <div class="c-name">Param Shah</div>
            <div class="c-roll">24CS093</div>
          </div>
          <div class="table-row">
            <div class="c-sr">3</div>
            <div class="c-name">Himanshu Varotariya</div>
            <div class="c-roll">24CS106</div>
          </div>
        </div>

        <div class="guide-box">
          <div class="guide-hdr">MENTOR / GUIDE</div>
          <div class="guide-content">
            <div class="guide-name">Prof. Dhara Solanki</div>
            <div class="guide-desig">Assistant Professor, Department of Computer Science &amp; Engineering</div>
            <div class="guide-dept">CSPIT, Charotar University of Science &amp; Technology (CHARUSAT)</div>
          </div>
        </div>
      </div>

      <!-- 6. THE PROBLEM vs OUR SOLUTION -->
      <div class="prob-sol-row">
        <div class="prob-card">
          <div class="prob-hdr">⚠️ THE PROBLEM IN HIGHER ED</div>
          <div class="prob-body">
            <ul>
              <li>Static exam marks (e.g. 14/20) hide conceptual misconceptions and guesswork.</li>
              <li>No longitudinal tracking of memory decay (Ebbinghaus forgetting curve).</li>
              <li>Conventional quiz portals lack collusion defense, code execution, and OBE metrics.</li>
            </ul>
          </div>
        </div>
        <div class="sol-card">
          <div class="sol-hdr">💡 OUR SOLUTION: CLIAS / ADAPTIQ</div>
          <div class="sol-body">
            <ul>
              <li>Continuous mastery modeling via difficulty-weighted EWMA and Bayesian Knowledge Tracing.</li>
              <li>In-browser multi-language automated code judge with runtime/memory telemetry.</li>
              <li>Socratic LLM remediation without answer leaks + real-time focus proctoring.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 7. SYSTEM ARCHITECTURE & 5-TIER PIPELINE -->
      <div class="section-header">
        SYSTEM ARCHITECTURE &amp; DATA PIPELINE
      </div>
      <div class="arch-container">
        <div class="arch-flow">
          <!-- Tier 1 -->
          <div class="arch-node t1">
            <div class="tier-badge">Tier 1: Stakeholders</div>
            <div class="node-title">Academic Roles</div>
            <div class="node-items">
              • <strong>Student:</strong> Drills &amp; IDE<br>
              • <strong>Faculty:</strong> Exam authoring<br>
              • <strong>Counsellor:</strong> At-Risk triage<br>
              • <strong>HOD / Head:</strong> OBE reports
            </div>
          </div>

          <div class="arch-connector">➜</div>

          <!-- Tier 2 -->
          <div class="arch-node t2">
            <div class="tier-badge">Tier 2: Client</div>
            <div class="node-title">Next.js 14 Frontend</div>
            <div class="node-items">
              • React 18 &amp; App Router<br>
              • <strong>Monaco IDE:</strong> Multi-lang<br>
              • <strong>Recharts:</strong> Curve tracing<br>
              • Tailwind CSS design tokens
            </div>
          </div>

          <div class="arch-connector">➜</div>

          <!-- Tier 3 -->
          <div class="arch-node t3">
            <div class="tier-badge">Tier 3: Core API</div>
            <div class="node-title">NestJS Core Gateway</div>
            <div class="node-items">
              • Enterprise TypeScript API<br>
              • JWT Auth &amp; Strict RBAC<br>
              • @charusat.edu.in Guard<br>
              • Server-Sent Events (SSE)
            </div>
          </div>

          <div class="arch-connector">➜</div>

          <!-- Tier 4 -->
          <div class="arch-node t4">
            <div class="tier-badge">Tier 4: Intelligence</div>
            <div class="node-title">FastAPI AI Engine</div>
            <div class="node-items">
              • Socratic Gemini LLM Tutor<br>
              • <strong>BKT &amp; IRT:</strong> Latent mastery<br>
              • <strong>AST Judge:</strong> Winnowing<br>
              • RAG Syllabus Chunking
            </div>
          </div>

          <div class="arch-connector">➜</div>

          <!-- Tier 5 -->
          <div class="arch-node t5">
            <div class="tier-badge">Tier 5: Storage</div>
            <div class="node-title">Persistence &amp; Cache</div>
            <div class="node-items">
              • <strong>MySQL 8.0:</strong> Prisma ORM<br>
              • <strong>Redis 7:</strong> BullMQ queues<br>
              • Semantic Vector Store<br>
              • Audit Logs &amp; Integrity Data
            </div>
          </div>
        </div>

        <div class="arch-pipeline-badge">
          <span>Continuous Feedback Pipeline:</span> Diagnostic Drill ➔ Bayesian Knowledge Tracing ➔ Automated Code Judge ➔ Socratic Remediation ➔ OBE Attainment
        </div>
      </div>

      <!-- 8. THREE COLUMN SECTION -->
      <div class="three-cols">
        <!-- Col 1: Tech Stack -->
        <div class="col-card">
          <div class="col-header">TECHNOLOGY STACK</div>
          <div class="col-content">
            <ul>
              <li><strong>Frontend:</strong> Next.js 14 (App Router), React 18, Tailwind CSS, Monaco Editor, Recharts.</li>
              <li><strong>Backend API:</strong> NestJS (TypeScript), Prisma ORM, JWT RBAC, Server-Sent Events (SSE).</li>
              <li><strong>AI &amp; Algorithms:</strong> Python 3.11, FastAPI, Google Gemini LLM, LangChain, AST Winnowing.</li>
              <li><strong>Database &amp; Caching:</strong> MySQL 8.0 (Relational schema), Redis 7 (Session &amp; Telemetry queues).</li>
              <li><strong>Proctoring &amp; Sandbox:</strong> Isolated Subprocess Judge, Focus Loss &amp; Tab-Switch Telemetry.</li>
            </ul>
          </div>
        </div>

        <!-- Col 2: Key Features -->
        <div class="col-card">
          <div class="col-header">KEY INNOVATIONS</div>
          <div class="col-content">
            <ul>
              <li><strong>Continuous Knowledge Tracing:</strong> Difficulty-weighted EWMA, BKT &amp; Ebbinghaus decay curve.</li>
              <li><strong>Socratic AI Remediation:</strong> Interactive guidance diagnosing root misconceptions without answer leakage.</li>
              <li><strong>In-Browser Coding Arena:</strong> LeetCode-grade multi-language judge with automated testcase evaluation.</li>
              <li><strong>Exam Integrity Guard:</strong> Live focus telemetry, tab-switch penalties &amp; trust score calibration.</li>
              <li><strong>Structural Plagiarism Engine:</strong> Pairwise Winnowing AST fingerprints and tokenized clone diff inspector.</li>
            </ul>
          </div>
        </div>

        <!-- Col 3: Applications -->
        <div class="col-card">
          <div class="col-header">ACADEMIC &amp; INSTITUTIONAL IMPACT</div>
          <div class="col-content">
            <ul>
              <li><strong>University LMS Evolution:</strong> Replaces static exam marks with longitudinal, topic-wise mastery tracking.</li>
              <li><strong>NBA &amp; NAAC Accreditation:</strong> Automated, verifiable Course Outcome (CO-PO) direct attainment matrices.</li>
              <li><strong>Placement Readiness Benchmarking:</strong> Standardized coding mocks, DSA practice, and skill radar profiles.</li>
              <li><strong>Proactive At-Risk Interventions:</strong> Scoped counsellor triage queue identifying decaying conceptual topics.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 9. APPLICATION SCREENSHOTS -->
      <div class="section-header">
        PRODUCTION APPLICATION SHOWCASE (LIVE PLATFORM RUNTIME)
      </div>
      <div class="screenshots-container">
        <div class="screenshots-grid">
          <!-- Screenshot 1 -->
          <div class="screenshot-card">
            <div class="mock-window-bar">
              <div class="mock-dots">
                <div class="mock-dot r"></div>
                <div class="mock-dot y"></div>
                <div class="mock-dot g"></div>
              </div>
              <span>/student/dashboard</span>
            </div>
            <div class="screenshot-img-box">
              <img src="{shot1_b64}" alt="Student Learning Intelligence Dashboard">
            </div>
            <div class="screenshot-caption">
              Student Learning Intelligence Dashboard
              <span class="screenshot-subcap">Live Recharts Velocity Curve, Dynamic Topic Mastery &amp; Skill Matrix</span>
            </div>
          </div>

          <!-- Screenshot 2 -->
          <div class="screenshot-card">
            <div class="mock-window-bar">
              <div class="mock-dots">
                <div class="mock-dot r"></div>
                <div class="mock-dot y"></div>
                <div class="mock-dot g"></div>
              </div>
              <span>/student/coding/two-sum</span>
            </div>
            <div class="screenshot-img-box">
              <img src="{shot2_b64}" alt="Coding Arena & Automated Judge">
            </div>
            <div class="screenshot-caption">
              In-Browser Coding Arena &amp; Automated Judge
              <span class="screenshot-subcap">Monaco IDE Sandbox, Python Solution &amp; Test Cases Accepted (100% Score)</span>
            </div>
          </div>

          <!-- Screenshot 3 -->
          <div class="screenshot-card">
            <div class="mock-window-bar">
              <div class="mock-dots">
                <div class="mock-dot r"></div>
                <div class="mock-dot y"></div>
                <div class="mock-dot g"></div>
              </div>
              <span>/faculty/invigilation</span>
            </div>
            <div class="screenshot-img-box">
              <img src="{shot3_b64}" alt="AI Invigilation & Integrity Console">
            </div>
            <div class="screenshot-caption">
              AI Exam Integrity &amp; Invigilation Console
              <span class="screenshot-subcap">Real-Time Anomaly Audit, 78.5% Trust Score &amp; Tab-Switch Violation Logs</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 10. TARGET INDUSTRY / SECTOR -->
      <div class="target-sector-bar">
        TARGET INDUSTRY / SECTOR : - <span>Higher Education Institutions, Technical Universities &amp; EdTech Examination Bodies</span>
      </div>

    </div>

    <!-- 11. FOOTER STRIP -->
    <div class="footer-bar">
      DEPARTMENT OF COMPUTER SCIENCE &amp; ENGINEERING | CSPIT, CHARUSAT
    </div>

  </div>

</body>
</html>
'''

with open('poster.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('Updated poster.html with ultra-clean, modern layout!')
