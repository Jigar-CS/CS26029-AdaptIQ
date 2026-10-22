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

# 1. GENERATE VERTICAL ACADEMIC CONFERENCE POSTER (1320px x 1840px, 3-Column Conference Layout)
html_portrait = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CLIAS (AdaptIQ) - Academic Presentation Poster</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Cabinet+Grotesk:wght@800;900&display=swap" rel="stylesheet">
  <style>
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      width: 1320px;
      height: 1840px;
      background-color: #0B1120;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }}

    .poster-canvas {{
      width: 1320px;
      height: 1840px;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
      position: relative;
    }}

    /* TOP UNIVERSITY LOGO BAR */
    .top-logo-bar {{
      width: 100%;
      height: 90px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px 24px;
      border-bottom: 2px solid #E2E8F0;
    }}
    .top-logo-bar img {{
      height: 76px;
      max-width: 100%;
      object-fit: contain;
    }}

    /* SUB BANNER */
    .course-sub-bar {{
      background: #0F172A;
      color: #93C5FD;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 32px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      border-bottom: 2px solid #1E293B;
    }}
    .course-sub-bar span {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .course-sub-bar .tag-acad {{
      background: #881337;
      color: #FFE4E6;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 11px;
      letter-spacing: 1px;
    }}

    /* HERO HEADER & TEAM META */
    .hero-header {{
      background: linear-gradient(135deg, #0A192F 0%, #0F284E 50%, #172554 100%);
      color: #FFFFFF;
      padding: 18px 32px;
      display: grid;
      grid-template-columns: 1fr 430px;
      gap: 28px;
      align-items: center;
      border-bottom: 4px solid #881337;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }}
    .hero-title-area h1 {{
      font-size: 42px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #FFFFFF;
      line-height: 1.1;
      display: flex;
      align-items: center;
      gap: 14px;
    }}
    .badge-engine {{
      font-size: 14px;
      font-weight: 800;
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      border: 1px solid #60A5FA;
      padding: 4px 12px;
      border-radius: 6px;
      color: #EFF6FF;
      letter-spacing: 1px;
      text-transform: uppercase;
    }}
    .hero-title-area h2 {{
      font-size: 18px;
      font-weight: 700;
      color: #38BDF8;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }}
    .hero-title-area p {{
      font-size: 13px;
      color: #CBD5E1;
      margin-top: 4px;
      font-weight: 500;
    }}

    /* TEAM INFO CARDS IN HEADER */
    .hero-meta-area {{
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .meta-group-badge {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(136, 19, 55, 0.4);
      border: 1.5px solid #F43F5E;
      padding: 6px 14px;
      border-radius: 8px;
    }}
    .meta-group-badge .gid {{
      font-size: 17px;
      font-weight: 900;
      color: #FFE4E6;
      letter-spacing: 1.5px;
    }}
    .meta-group-badge .dept {{
      font-size: 11.5px;
      font-weight: 700;
      color: #FDA4AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    .team-cards-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }}
    .meta-box {{
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 6px 10px;
      backdrop-filter: blur(4px);
    }}
    .meta-box .m-title {{
      font-size: 10px;
      font-weight: 800;
      color: #93C5FD;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 3px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 2px;
    }}
    .meta-box .m-item {{
      font-size: 11px;
      color: #FFFFFF;
      font-weight: 600;
      line-height: 1.35;
      display: flex;
      justify-content: space-between;
    }}
    .meta-box .m-roll {{
      font-family: 'JetBrains Mono', monospace;
      color: #FCD34D;
      font-weight: 700;
      font-size: 10.5px;
    }}
    .meta-box .m-guide {{
      font-size: 11.5px;
      font-weight: 800;
      color: #FFFFFF;
    }}
    .meta-box .m-sub {{
      font-size: 10px;
      color: #CBD5E1;
      margin-top: 2px;
    }}

    /* HIGHLIGHTS STRIP */
    .highlights-strip {{
      background: #FFFFFF;
      border-bottom: 2px solid #E2E8F0;
      padding: 8px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .kpi-chip {{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #0F172A;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 5px 12px;
      border-radius: 6px;
    }}
    .kpi-chip .icon {{
      font-size: 14px;
    }}
    .kpi-chip.kpi-accent {{
      background: #EFF6FF;
      border-color: #93C5FD;
      color: #1E40AF;
    }}
    .kpi-chip.kpi-rose {{
      background: #FFF1F2;
      border-color: #FECDD3;
      color: #9F1239;
    }}

    /* MAIN PRESENTATION 3-COLUMN BODY */
    .poster-body {{
      display: grid;
      grid-template-columns: 375px 530px 375px;
      gap: 16px;
      padding: 16px 20px;
      flex: 1;
    }}

    .col {{
      display: flex;
      flex-direction: column;
      gap: 14px;
    }}

    /* CARD STYLING */
    .p-card {{
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      box-shadow: 0 4px 12px -2px rgba(15, 23, 42, 0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }}
    .p-card-header {{
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: #FFFFFF;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #881337;
    }}
    .p-card-header h3 {{
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .p-card-header .sec-num {{
      background: #881337;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 4px;
    }}
    .p-card-body {{
      padding: 12px 14px;
      font-size: 11.5px;
      color: #334155;
      line-height: 1.45;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}

    /* CALLOUT BOXES */
    .problem-box {{
      background: #FEF2F2;
      border-left: 3.5px solid #EF4444;
      padding: 7px 10px;
      border-radius: 0 6px 6px 0;
      font-size: 11px;
    }}
    .problem-box strong {{
      color: #991B1B;
      display: block;
      margin-bottom: 2px;
      font-size: 11.5px;
    }}
    .solution-box {{
      background: #F0FDF4;
      border-left: 3.5px solid #10B981;
      padding: 7px 10px;
      border-radius: 0 6px 6px 0;
      font-size: 11px;
    }}
    .solution-box strong {{
      color: #065F46;
      display: block;
      margin-bottom: 2px;
      font-size: 11.5px;
    }}

    /* ARCHITECTURE DIAGRAM IN CARD */
    .arch-flow {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .arch-step {{
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 6px 10px;
      display: grid;
      grid-template-columns: 85px 1fr;
      align-items: center;
      gap: 8px;
    }}
    .arch-badge {{
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 3px 6px;
      border-radius: 4px;
      text-align: center;
      letter-spacing: 0.5px;
    }}
    .b-t1 {{ background: #DBEAFE; color: #1E40AF; border: 1px solid #93C5FD; }}
    .b-t2 {{ background: #E0E7FF; color: #3730A3; border: 1px solid #A5B4FC; }}
    .b-t3 {{ background: #EDE9FE; color: #5B21B6; border: 1px solid #C4B5FD; }}
    .b-t4 {{ background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }}
    .b-t5 {{ background: #FCE7F3; color: #9D174D; border: 1px solid #FBCFE8; }}
    .arch-details {{
      font-size: 10.5px;
      font-weight: 600;
      color: #1E293B;
    }}
    .arch-details span {{
      font-weight: 400;
      color: #64748B;
      display: block;
      font-size: 9.5px;
    }}

    /* FORMULA BOX */
    .math-card {{
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 6px;
      padding: 9px 12px;
      font-family: 'JetBrains Mono', monospace;
    }}
    .math-title {{
      font-size: 10.5px;
      font-weight: 700;
      color: #38BDF8;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .math-eq {{
      font-size: 11px;
      color: #FCD34D;
      line-height: 1.4;
      background: rgba(255,255,255,0.06);
      padding: 5px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }}
    .math-desc {{
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 10px;
      color: #94A3B8;
      line-height: 1.35;
    }}

    /* CENTER COLUMN: LIVE APPLICATION SHOWCASE */
    .center-col {{
      display: flex;
      flex-direction: column;
      gap: 12px;
    }}
    .showcase-header {{
      background: linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%);
      color: #FFFFFF;
      padding: 9px 14px;
      border-radius: 8px;
      border-left: 5px solid #F59E0B;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .showcase-header h2 {{
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }}
    .showcase-header .live-badge {{
      background: #10B981;
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }}
    .live-badge::before {{
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background: #FFFFFF;
      border-radius: 50%;
    }}

    /* SCREENSHOT WINDOW CONTAINER */
    .screen-window {{
      background: #FFFFFF;
      border: 1.5px solid #94A3B8;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.12);
      display: flex;
      flex-direction: column;
    }}
    .win-bar {{
      background: #1E293B;
      padding: 5px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #334155;
    }}
    .win-dots {{
      display: flex;
      gap: 5px;
    }}
    .win-dot {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }}
    .dot-r {{ background: #EF4444; }}
    .dot-y {{ background: #F59E0B; }}
    .dot-g {{ background: #10B981; }}
    .win-title {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #94A3B8;
      font-weight: 600;
    }}
    .win-tag {{
      background: #0284C7;
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
    }}
    .win-img {{
      width: 100%;
      height: 250px;
      object-fit: cover;
      object-position: top;
      display: block;
      border-bottom: 1px solid #E2E8F0;
    }}
    .win-callout-footer {{
      background: #F8FAFC;
      padding: 6px 10px;
      font-size: 10.5px;
      color: #1E293B;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #E2E8F0;
    }}
    .win-callout-footer strong {{
      color: #0F172A;
      font-weight: 800;
    }}
    .win-pills {{
      display: flex;
      gap: 6px;
    }}
    .w-pill {{
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #EFF6FF;
      color: #1D4ED8;
      border: 1px solid #BFDBFE;
    }}

    /* RIGHT COLUMN: EVALUATION & IMPACT */
    .metric-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }}
    .metric-box {{
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }}
    .metric-box .val {{
      font-size: 17px;
      font-weight: 900;
      color: #0F172A;
      font-family: 'JetBrains Mono', monospace;
    }}
    .metric-box .lbl {{
      font-size: 9.5px;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 2px;
    }}

    .bullet-list {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .bullet-list li {{
      position: relative;
      padding-left: 14px;
      font-size: 11px;
      line-height: 1.4;
      color: #334155;
    }}
    .bullet-list li::before {{
      content: '▪';
      position: absolute;
      left: 0;
      color: #881337;
      font-size: 14px;
      line-height: 1;
    }}

    /* TECH STACK CHIPS */
    .tech-wrap {{
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }}
    .tech-chip {{
      font-size: 10px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 4px;
      background: #F1F5F9;
      color: #334155;
      border: 1px solid #CBD5E1;
    }}

    /* BOTTOM INSTITUTIONAL FOOTER */
    .poster-footer {{
      background: #0F172A;
      color: #FFFFFF;
      padding: 10px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 3px solid #881337;
    }}
    .footer-left {{
      display: flex;
      flex-direction: column;
      gap: 2px;
    }}
    .footer-left h4 {{
      font-size: 13.5px;
      font-weight: 800;
      letter-spacing: 0.8px;
      color: #FFFFFF;
    }}
    .footer-left p {{
      font-size: 11px;
      color: #94A3B8;
    }}
    .footer-right {{
      text-align: right;
      font-size: 11.5px;
      color: #FCD34D;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .footer-right span {{
      display: block;
      font-size: 10.5px;
      color: #CBD5E1;
      font-weight: 500;
    }}
  </style>
</head>
<body>
  <div class="poster-canvas">

    <!-- 1. TOP LOGO STRIP -->
    <div class="top-logo-bar">
      <img src="{logo_b64}" alt="CHARUSAT, CIVF, CII, UN SDGs, CSPIT Logos">
    </div>

    <!-- 2. COURSE & PRESENTATION SUB-BAR -->
    <div class="course-sub-bar">
      <span>PROJECT-I (CEUP 301) — CAPSTONE PROJECT ACADEMIC PRESENTATION</span>
      <span>DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING <span class="tag-acad">CSPIT • CHARUSAT</span></span>
    </div>

    <!-- 3. HERO TITLE & TEAM METADATA -->
    <div class="hero-header">
      <div class="hero-title-area">
        <h1>CLIAS <span class="badge-engine">AdaptIQ Engine</span></h1>
        <h2>CHARUSAT Learning Intelligence & Assessment System</h2>
        <p>Longitudinal Knowledge Tracing, Adaptive Practice, In-Browser Coding Sandbox & AI-Proctored Exam Integrity</p>
      </div>

      <div class="hero-meta-area">
        <div class="meta-group-badge">
          <span class="gid">GROUP ID: CS26029</span>
          <span class="dept">B.Tech CSE • 5th Semester</span>
        </div>
        <div class="team-cards-grid">
          <div class="meta-box">
            <div class="m-title">Student Presenters</div>
            <div class="m-item"><span>Jigar Sakhia</span> <span class="m-roll">24CS090</span></div>
            <div class="m-item"><span>Param Shah</span> <span class="m-roll">24CS093</span></div>
            <div class="m-item"><span>Himanshu Varotariya</span> <span class="m-roll">24CS106</span></div>
          </div>
          <div class="meta-box">
            <div class="m-title">Faculty Mentor / Guide</div>
            <div class="m-guide">Prof. Dhara Solanki</div>
            <div class="m-sub">Assistant Professor, CSE Dept.</div>
            <div class="m-sub">CSPIT, CHARUSAT University</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. KEY METRIC HIGHLIGHTS STRIP -->
    <div class="highlights-strip">
      <div class="kpi-chip kpi-accent"><span class="icon">📈</span> Bayesian Knowledge Tracing (BKT)</div>
      <div class="kpi-chip"><span class="icon">💻</span> In-Browser Monaco IDE Sandbox</div>
      <div class="kpi-chip kpi-rose"><span class="icon">🛡️</span> AI Integrity Trust Scoring (78.5%)</div>
      <div class="kpi-chip"><span class="icon">🤖</span> Socratic Gemini AI Remediation</div>
      <div class="kpi-chip kpi-accent"><span class="icon">🎯</span> Automated NBA / NAAC CO-PO Attainment</div>
    </div>

    <!-- 5. MAIN SCIENTIFIC PRESENTATION GRID (3 COLUMNS) -->
    <div class="poster-body">

      <!-- ================= COLUMN 1: MOTIVATION, ARCHITECTURE, MATH ================= -->
      <div class="col">

        <!-- CARD 1: MOTIVATION & PROBLEM -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">01</span> Motivation & Academic Problem</h3>
          </div>
          <div class="p-card-body">
            <div class="problem-box">
              <strong>1. Static Marks Mask True Learning Gaps</strong>
              A grade like 14/20 provides no visibility into whether correct answers were guessed or wrong answers were slips.
            </div>
            <div class="problem-box">
              <strong>2. No Longitudinal Memory Retention</strong>
              Concepts decay over time (Ebbinghaus forgetting curve), yet traditional LMS treat past assessments as permanent.
            </div>
            <div class="problem-box">
              <strong>3. Lab Coding Collusion & Accreditation Lag</strong>
              Exams lack live focus tracking, and mapping student work to NBA/NAAC Course Outcomes (CO-PO) is manual.
            </div>
            <div class="solution-box">
              <strong>The Solution: AdaptIQ Core Engine</strong>
              Continuous probabilistic knowledge tracing, real-time code sandboxing, Socratic guidance, and automated accreditation.
            </div>
          </div>
        </div>

        <!-- CARD 2: 5-TIER SYSTEM ARCHITECTURE -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">02</span> 5-Tier System Architecture</h3>
          </div>
          <div class="p-card-body">
            <div class="arch-flow">
              <div class="arch-step">
                <span class="arch-badge b-t1">Tier 1 • Client</span>
                <div class="arch-details">Next.js 14 App Router <span>Monaco IDE • Recharts Velocity • Tailwind CSS</span></div>
              </div>
              <div class="arch-step">
                <span class="arch-badge b-t2">Tier 2 • Gateway</span>
                <div class="arch-details">NestJS Core Gateway <span>TypeScript • JWT Auth • RBAC • SSE Streams</span></div>
              </div>
              <div class="arch-step">
                <span class="arch-badge b-t3">Tier 3 • Intelligence</span>
                <div class="arch-details">FastAPI AI Engine <span>Google Gemini 1.5 • BKT Estimator • IRT Calibration</span></div>
              </div>
              <div class="arch-step">
                <span class="arch-badge b-t4">Tier 4 • Sandbox</span>
                <div class="arch-details">Code Judge & Plagiarism <span>Isolated Subprocess Runner • AST Winnowing</span></div>
              </div>
              <div class="arch-step">
                <span class="arch-badge b-t5">Tier 5 • Database</span>
                <div class="arch-details">Persistence & Caching <span>MySQL 8.0 (Prisma ORM) • Redis 7 (BullMQ)</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 3: MATHEMATICAL MODELING -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">03</span> Mathematical Knowledge Modeling</h3>
          </div>
          <div class="p-card-body">
            <div class="math-card">
              <div class="math-title">Bayesian Knowledge Tracing (BKT)</div>
              <div class="math-eq">P(L_t) = P(L_&#123;t-1&#125;|Obs) + [1 - P(L_&#123;t-1&#125;|Obs)] &times; P(T)</div>
              <div class="math-desc">Updates latent mastery P(L) based on Slip P(S) and Guess P(G) probabilities after every student submission.</div>
            </div>
            <div class="math-card" style="background:#1E293B;">
              <div class="math-title" style="color:#A7F3D0;">Memory Decay & Trust Index</div>
              <div class="math-eq" style="color:#6EE7B7;">Mastery(t) = P(L_0) &times; e^&#123;-&lambda; &Delta;t&#125; &nbsp;|&nbsp; Trust = 100 - &Sigma;(w_i &times; v_i)</div>
              <div class="math-desc">Models Ebbinghaus memory decay over inactive days, while exam trust score deducts for window blur and tab switching.</div>
            </div>
          </div>
        </div>

      </div>

      <!-- ================= COLUMN 2: LIVE PRODUCTION RUNTIME (CENTER) ================= -->
      <div class="center-col">

        <div class="showcase-header">
          <h2>Live Production Runtime Verification</h2>
          <span class="live-badge">REAL SYSTEM EXECUTION</span>
        </div>

        <!-- SCREENSHOT 1: DASHBOARD -->
        <div class="screen-window">
          <div class="win-bar">
            <div class="win-dots">
              <div class="win-dot dot-r"></div>
              <div class="win-dot dot-y"></div>
              <div class="win-dot dot-g"></div>
            </div>
            <span class="win-title">http://localhost:3000/student/dashboard</span>
            <span class="win-tag">Runtime A</span>
          </div>
          <img class="win-img" src="{shot1_b64}" alt="Student Learning Intelligence Dashboard">
          <div class="win-callout-footer">
            <div><strong>1. Student Learning Intelligence Dashboard</strong></div>
            <div class="win-pills">
              <span class="w-pill">Recharts Velocity Curve</span>
              <span class="w-pill">Topic Mastery</span>
              <span class="w-pill">Skill Matrix</span>
            </div>
          </div>
        </div>

        <!-- SCREENSHOT 2: CODING ARENA -->
        <div class="screen-window">
          <div class="win-bar">
            <div class="win-dots">
              <div class="win-dot dot-r"></div>
              <div class="win-dot dot-y"></div>
              <div class="win-dot dot-g"></div>
            </div>
            <span class="win-title">http://localhost:3000/student/coding/two-sum</span>
            <span class="win-tag">Runtime B</span>
          </div>
          <img class="win-img" src="{shot2_b64}" alt="In-Browser Coding Arena & Judge">
          <div class="win-callout-footer">
            <div><strong>2. In-Browser Monaco Coding Arena & Automated Judge</strong></div>
            <div class="win-pills">
              <span class="w-pill">Accepted (100% Score)</span>
              <span class="w-pill">3/3 Testcases</span>
              <span class="w-pill">AST Winnowing</span>
            </div>
          </div>
        </div>

        <!-- SCREENSHOT 3: INVIGILATION CONSOLE -->
        <div class="screen-window">
          <div class="win-bar">
            <div class="win-dots">
              <div class="win-dot dot-r"></div>
              <div class="win-dot dot-y"></div>
              <div class="win-dot dot-g"></div>
            </div>
            <span class="win-title">http://localhost:3000/faculty/invigilation</span>
            <span class="win-tag">Runtime C</span>
          </div>
          <img class="win-img" src="{shot3_b64}" alt="AI Invigilation Console">
          <div class="win-callout-footer">
            <div><strong>3. Real-Time AI Exam Invigilation & Integrity Guard</strong></div>
            <div class="win-pills">
              <span class="w-pill">78.5% Trust Score</span>
              <span class="w-pill">Tab Switch Detection</span>
              <span class="w-pill">Window Blur Audit</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ================= COLUMN 3: AI SOCRATIC, EVALUATION, OBE IMPACT ================= -->
      <div class="col">

        <!-- CARD 4: SOCRATIC AI & INTEGRITY -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">04</span> Socratic AI & Anti-Collusion Guard</h3>
          </div>
          <div class="p-card-body">
            <ul class="bullet-list">
              <li><strong>Zero-Leak Socratic Tutoring:</strong> System prompts Gemini 1.5 to act as an encouraging tutor diagnosing misconceptions without providing direct code or answers.</li>
              <li><strong>Live Focus Telemetry:</strong> Seamless Page Visibility API hooks capture tab switching and window blur with millisecond precision.</li>
              <li><strong>Structural Plagiarism Engine:</strong> AST normalized tokenization prevents renaming and comment evasion using pairwise winnowing.</li>
            </ul>
          </div>
        </div>

        <!-- CARD 5: EXPERIMENTAL BENCHMARKS -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">05</span> Experimental Verification & Benchmarks</h3>
          </div>
          <div class="p-card-body">
            <div class="metric-grid">
              <div class="metric-box">
                <div class="val" style="color:#2563EB;">10 ms</div>
                <div class="lbl">Code Sandbox Latency</div>
              </div>
              <div class="metric-box">
                <div class="val" style="color:#10B981;">100%</div>
                <div class="lbl">Testcase Verification</div>
              </div>
              <div class="metric-box">
                <div class="val" style="color:#D97706;">78.5%</div>
                <div class="lbl">Calibrated Trust Score</div>
              </div>
              <div class="metric-box">
                <div class="val" style="color:#7C3AED;">13+</div>
                <div class="lbl">Tracked Concept Nodes</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 6: OBE & INSTITUTIONAL IMPACT -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">06</span> Institutional Outcome & NBA/NAAC</h3>
          </div>
          <div class="p-card-body">
            <ul class="bullet-list">
              <li><strong>Automated CO-PO Attainment:</strong> Direct mathematical linkage between student problem mastery and NBA accreditation reports.</li>
              <li><strong>Counsellor Early-Warning Triage:</strong> Scopes at-risk learners automatically based on decaying mastery curves for timely intervention.</li>
              <li><strong>Placement Readiness Index:</strong> Provides objective DSA skill metrics and verified coding benchmarks for recruiters.</li>
            </ul>
          </div>
        </div>

        <!-- CARD 7: TECHNOLOGY STACK -->
        <div class="p-card">
          <div class="p-card-header">
            <h3><span class="sec-num">07</span> Technology Stack & Architecture</h3>
          </div>
          <div class="p-card-body">
            <div class="tech-wrap">
              <span class="tech-chip">Next.js 14 App Router</span>
              <span class="tech-chip">React 18</span>
              <span class="tech-chip">NestJS (TypeScript)</span>
              <span class="tech-chip">FastAPI (Python 3.11)</span>
              <span class="tech-chip">Google Gemini 1.5</span>
              <span class="tech-chip">MySQL 8.0</span>
              <span class="tech-chip">Prisma ORM</span>
              <span class="tech-chip">Redis 7 (BullMQ)</span>
              <span class="tech-chip">Monaco IDE Sandbox</span>
              <span class="tech-chip">Recharts</span>
              <span class="tech-chip">Docker</span>
              <span class="tech-chip">Tailwind CSS</span>
            </div>
          </div>
        </div>

      </div>

    </div>

    <!-- 6. BOTTOM INSTITUTIONAL FOOTER -->
    <div class="poster-footer">
      <div class="footer-left">
        <h4>DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING • CSPIT</h4>
        <p>Charotar University of Science and Technology (CHARUSAT), Changa, Gujarat - 388421</p>
      </div>
      <div class="footer-right">
        TARGET SECTOR: Higher Education • Technical Universities • NAAC / NBA Colleges
        <span>Academic Capstone Presentation • Group Id: CS26029 • Mentor: Prof. Dhara Solanki</span>
      </div>
    </div>

  </div>
</body>
</html>
'''

with open('poster.html', 'w', encoding='utf-8') as f:
    f.write(html_portrait)

print("Generated portrait poster.html successfully!")
