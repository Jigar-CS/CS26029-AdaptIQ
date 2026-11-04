import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'  <w:insideV w:val="none"/>'
            f'  <w:left w:val="none"/>'
            f'  <w:right w:val="none"/>'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def add_heading_styled(doc, text, level):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.keep_with_next = True
    run = h.runs[0]
    run.font.name = "Segoe UI"
    if level == 1:
        run.font.size = Pt(16.5)
        run.bold = True
        run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
        h.paragraph_format.space_before = Pt(18)
        h.paragraph_format.space_after = Pt(6)
        pPr = h._element.get_or_add_pPr()
        pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="2563EB"/></w:pBdr>')
        pPr.append(pBdr)
    elif level == 2:
        run.font.size = Pt(13)
        run.bold = True
        run.font.color.rgb = RGBColor(0x0F, 0x76, 0x6E)
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(11)
        run.bold = True
        run.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(3)
    return h

def add_body_p(doc, text, bold_prefix="", space_after=4):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.bold = True
        r_bold.font.name = "Segoe UI"
        r_bold.font.size = Pt(9.5)
        r_bold.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r_text = p.add_run(text)
    r_text.font.name = "Segoe UI"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_bullet_p(doc, text, bold_prefix="", level=0):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.bold = True
        r_bold.font.name = "Segoe UI"
        r_bold.font.size = Pt(9.5)
        r_bold.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    r_text = p.add_run(text)
    r_text.font.name = "Segoe UI"
    r_text.font.size = Pt(9.5)
    r_text.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return p

def add_callout(doc, text, title="IMPORTANT NOTICE", fill_hex="EFF6FF", border_color="2563EB", text_color="1E3A8A"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_background(cell, fill_hex)
    set_cell_margins(cell, top=110, bottom=110, left=160, right=160)
    
    tcPr = cell._element.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.15
    run_title = p.add_run(f"[{title}] ")
    run_title.bold = True
    run_title.font.name = "Segoe UI"
    run_title.font.size = Pt(9.5)
    run_title.font.color.rgb = RGBColor.from_string(text_color)
    
    run_text = p.add_run(text)
    run_text.font.name = "Segoe UI"
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(4)

def format_table(table, col_widths, headers, rows_data):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(title)
        run.bold = True
        run.font.name = "Segoe UI"
        run.font.size = Pt(8.8)
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        
    trPr = table.rows[0]._element.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    
    for r_idx, row_values in enumerate(rows_data):
        row = table.add_row()
        r_trPr = row._element.get_or_add_trPr()
        r_trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            cell.width = Inches(col_widths[c_idx])
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.12
            run = p.add_run(val)
            run.font.name = "Segoe UI"
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37)

def create_test_case_table(doc, tc_id, title, role, priority, preconditions, steps, test_data, expected_results):
    table = doc.add_table(rows=6, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table, color="94A3B8")
    
    col_widths = [1.7, 5.1]
    
    hdr_cell = table.rows[0].cells[0]
    hdr_cell.merge(table.rows[0].cells[1])
    set_cell_background(hdr_cell, "1E3A8A")
    set_cell_margins(hdr_cell, top=90, bottom=90, left=120, right=120)
    p = hdr_cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    r1 = p.add_run(f"Test Case {tc_id}: ")
    r1.bold = True
    r1.font.name = "Segoe UI"
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = RGBColor(0x93, 0xC5, 0xFD)
    r2 = p.add_run(title)
    r2.bold = True
    r2.font.name = "Segoe UI"
    r2.font.size = Pt(9.5)
    r2.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    
    meta_rows = [
        ("Role & Scope", f"Role: {role}  |  Priority: {priority}  |  Verification Status: [  ] Pass   [  ] Fail   [  ] Blocked"),
        ("Preconditions", preconditions),
        ("Step-by-Step Flow", steps),
        ("Test Inputs / Data", test_data),
        ("Expected Result", expected_results)
    ]
    
    for idx, (label, content) in enumerate(meta_rows, start=1):
        c0 = table.rows[idx].cells[0]
        c1 = table.rows[idx].cells[1]
        c0.width = Inches(col_widths[0])
        c1.width = Inches(col_widths[1])
        
        bg_col = "F1F5F9" if idx % 2 == 1 else "F8FAFC"
        set_cell_background(c0, "E2E8F0")
        set_cell_background(c1, bg_col)
        
        set_cell_margins(c0, top=70, bottom=70, left=90, right=90)
        set_cell_margins(c1, top=70, bottom=70, left=110, right=110)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(0)
        p0.paragraph_format.space_after = Pt(0)
        r_lbl = p0.add_run(label)
        r_lbl.bold = True
        r_lbl.font.name = "Segoe UI"
        r_lbl.font.size = Pt(8.5)
        r_lbl.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(0)
        p1.paragraph_format.space_after = Pt(0)
        p1.paragraph_format.line_spacing = 1.15
        r_cnt = p1.add_run(content)
        r_cnt.font.name = "Segoe UI"
        r_cnt.font.size = Pt(8.5)
        r_cnt.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
        
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(6)

print("Setup completed. Building document...")
doc = docx.Document()

# Page Margins: 0.75 in
for section in doc.sections:
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)
    section.page_width = Inches(8.5)
    section.page_height = Inches(11.0)
    
    # Configure Header and Footer
    header = section.header
    hp = header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hrun = hp.add_run("CLIAS — Comprehensive Manual Testing Guide & Feature Verification")
    hrun.font.name = "Segoe UI"
    hrun.font.size = Pt(8)
    hrun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
    
    footer = section.footer
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    frun1 = fp.add_run("CHARUSAT Learning Intelligence & Assessment System  |  Confidential & Internal QA Use Only")
    frun1.font.name = "Segoe UI"
    frun1.font.size = Pt(8)
    frun1.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

# -------------------------------------------------------------
# COVER / TITLE BLOCK
# -------------------------------------------------------------
title_p = doc.add_paragraph()
title_p.paragraph_format.space_before = Pt(12)
title_p.paragraph_format.space_after = Pt(2)
t_run = title_p.add_run("CLIAS")
t_run.bold = True
t_run.font.name = "Segoe UI"
t_run.font.size = Pt(24)
t_run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)

sub_p = doc.add_paragraph()
sub_p.paragraph_format.space_before = Pt(0)
sub_p.paragraph_format.space_after = Pt(8)
s_run = sub_p.add_run("Comprehensive Manual Testing Guide & Feature Verification Playbook")
s_run.bold = True
s_run.font.name = "Segoe UI"
s_run.font.size = Pt(14)
s_run.font.color.rgb = RGBColor(0x0F, 0x76, 0x6E)

desc_p = doc.add_paragraph()
desc_p.paragraph_format.space_before = Pt(0)
desc_p.paragraph_format.space_after = Pt(12)
d_run = desc_p.add_run("Complete Step-by-Step Test Suites, Multi-Role Operational Flows, User Journey Verification, Edge Cases & QA Sign-Off Matrix across all 12 Integrated Platform Phases.")
d_run.font.name = "Segoe UI"
d_run.font.size = Pt(10)
d_run.font.color.rgb = RGBColor(0x47, 0x55, 0x69)

# Metadata Table
meta_tbl = doc.add_table(rows=1, cols=4)
col_w = [1.6, 1.8, 1.6, 1.8]
headers = ["Document Version", "Target Environment", "Testing Scope", "Primary Target URL"]
format_table(meta_tbl, col_w, headers, [
    ["v2.4.0 (Enterprise QA)", "Local & Lab Server", "All 12 Core Phases", "http://localhost:3000"]
])

doc.add_paragraph().paragraph_format.space_after = Pt(6)

add_callout(
    doc,
    "This document provides the exhaustive manual test plan for the entire CLIAS ecosystem. Every feature across all 6 administrative and academic user roles is cataloged with exact navigation paths, test inputs, step-by-step procedures, edge condition validations, and expected outcomes. Execute each test case sequentially or by module, and record results directly in the sign-off tracking tables.",
    title="DOCUMENT PURPOSE & QA GUIDELINES",
    fill_hex="F0FDF4",
    border_color="16A34A",
    text_color="15803D"
)

# -------------------------------------------------------------
# TABLE OF CONTENTS / SUMMARY
# -------------------------------------------------------------
add_heading_styled(doc, "Table of Contents", level=1)
toc_items = [
    ("Section 1: Test Strategy & Pre-Test Environment Verification", "Infrastructure, Ports, Health-checks & Browser Setup"),
    ("Section 2: Universal Test Credentials & User Persona Matrix", "Pre-seeded logins for Student, Faculty, Counsellor, HOD, Head, Admin"),
    ("Section 3: Feature-by-Feature Manual Test Suites", "Granular test cases with step-by-step instructions for all platform features"),
    ("  • Module 3.1: Super Admin Portal & Institutional Management", "Roster CSV Upload, Quarantine Engine, Structure Config"),
    ("  • Module 3.2: Authentication, Domain Enforcement & Profile", "Domain Filtering, OTP Lifecycle, Locked Roster Fields, RBAC"),
    ("  • Module 3.3: Student Learning Intelligence & Practice", "Recharts Learning Curve, EWMA Mastery, Socratic AI Tutor, Radars"),
    ("  • Module 3.4: Student In-Browser Coding Engine & Judge", "Monaco Editor, Multi-Language Sandbox, Automated Judge, Telemetry"),
    ("  • Module 3.5: Student AI Proctored Assessment Engine", "Face Enrollment, Liveness, Tab-Switch Lockdown, Anomaly Alerts"),
    ("  • Module 3.6: Faculty Assessment Management & AI Authoring", "AI Assessment Generator, Question Bank, Scheduling Wizard"),
    ("  • Module 3.7: Faculty Code Plagiarism & AST Similarity", "Structural AST Tokenization, Winnowing Fingerprinting, Diff Inspector"),
    ("  • Module 3.8: Counsellor Portal & Mentee Intervention", "Scoped Mentee Roster, Early Warning Alerts, Intervention Notes"),
    ("  • Module 3.9: Head of Department (HOD) Portal", "Curriculum Health, Cross-Division Benchmarks, CO-PO Attainment"),
    ("  • Module 3.10: Institutional Head / Provost Portal", "Macro Performance KPIs, Accreditation Analytics, Readiness Distributions"),
    ("Section 4: End-to-End Integrated System Verification Flows", "4 complete operational journeys spanning multiple roles and microservices"),
    ("Section 5: Master Manual Test Execution Matrix & Sign-Off", "Consolidated 38-item test execution tracker with Pass/Fail checkboxes"),
    ("Section 6: Defect Classification & Incident Reporting Standard", "Bug severity taxonomy, defect life-cycle, and standard QA bug template")
]
for title, subtitle in toc_items:
    add_bullet_p(doc, f" — {subtitle}", bold_prefix=title)

# -------------------------------------------------------------
# SECTION 1: TEST STRATEGY & PRE-TEST VERIFICATION
# -------------------------------------------------------------
add_heading_styled(doc, "Section 1: Test Strategy & Pre-Test Environment Verification", level=1)

add_body_p(doc, "Before initiating manual feature testing, verify that the underlying microservice ecosystem is healthy and operational. CLIAS is built on a distributed monorepo architecture comprising three distinct servers and an underlying MySQL database.")

add_heading_styled(doc, "1.1 Service Infrastructure & Port Mapping", level=2)
infra_tbl = doc.add_table(rows=1, cols=5)
col_w_infra = [1.2, 1.3, 1.4, 1.4, 1.5]
headers_infra = ["Component", "Technology", "Local Endpoint", "Health Check URL", "Mandatory Prerequisites"]
format_table(infra_tbl, col_w_infra, headers_infra, [
    ["Frontend Web", "Next.js 14 / React", "http://localhost:3000", "http://localhost:3000", "Node v18+, Chrome/Edge"],
    ["Backend API", "NestJS / TypeScript", "http://localhost:4000", "http://localhost:4000/api/v1/health", "Node v18+, Prisma ORM"],
    ["AI Microservice", "FastAPI / Python", "http://localhost:8000", "http://localhost:8000/health", "Python 3.10+, pip dependencies"],
    ["Database", "MySQL 8.0 / MariaDB", "localhost:3306", "Database: clias_db", "XAMPP or Docker MySQL Running"],
    ["Cache / Events", "Redis (Optional)", "localhost:6379", "PING -> PONG", "Docker Compose or Local Redis"]
])

add_heading_styled(doc, "1.2 Pre-Flight Service Health Check Steps", level=2)
add_bullet_p(doc, "Ensure XAMPP MySQL (or Docker MySQL) is started and database 'clias_db' is created.", bold_prefix="Step 1 (Database): ")
add_bullet_p(doc, "In apps/api terminal, run 'npm run dev'. Ensure terminal outputs '[NestApplication] Nest application successfully started' on port 4000.", bold_prefix="Step 2 (Backend API): ")
add_bullet_p(doc, "In apps/web terminal, run 'npm run dev'. Ensure terminal outputs 'Ready in ... ms' at 'http://localhost:3000'.", bold_prefix="Step 3 (Frontend Web): ")
add_bullet_p(doc, "In apps/ai terminal, run 'python main.py' or 'uvicorn main:app --reload --port 8000'. Verify 'Application startup complete' at port 8000.", bold_prefix="Step 4 (AI Service): ")
add_bullet_p(doc, "Open Google Chrome or Microsoft Edge. Ensure webcam and microphone hardware is connected and operational for AI Proctoring tests.", bold_prefix="Step 5 (Hardware & Browser): ")

add_callout(
    doc,
    "For automated lab or unified execution, you can run 'start-all.bat' from the repository root to launch all three application servers simultaneously in dedicated terminal windows.",
    title="PRO-TIP: UNIFIED STARTUP SCRIPT",
    fill_hex="EFF6FF",
    border_color="2563EB"
)

# -------------------------------------------------------------
# SECTION 2: TEST CREDENTIALS & USER PERSONA MATRIX
# -------------------------------------------------------------
add_heading_styled(doc, "Section 2: Universal Test Credentials & User Persona Matrix", level=1)
add_body_p(doc, "The CLIAS seed script pre-populates six distinct user roles with full academic context, historical telemetry, and course allocations. Use these exact credentials to execute all role-specific test scenarios:")

cred_tbl = doc.add_table(rows=1, cols=5)
col_w_cred = [1.3, 1.8, 1.0, 1.4, 1.3]
headers_cred = ["Academic Role", "Demo Email Address", "Password", "Pre-Configured Persona", "Assigned Scope / Authority"]
format_table(cred_tbl, col_w_cred, headers_cred, [
    ["STUDENT", "student@charusat.edu.in", "clias123", "Rahul Patel (24CS001)", "CSPIT CSE, Sem 5, Div A (Self-Only)"],
    ["SUPER_ADMIN", "admin@charusat.edu.in", "clias123", "System Administrator", "University-Wide Global Access"],
    ["FACULTY", "faculty@charusat.edu.in", "clias123", "Dr. CSE Professor", "Assigned to CS301 (Data Structures)"],
    ["COUNSELLOR", "counsellor@charusat.edu.in", "clias123", "Academic Mentor", "Strictly Scoped to Assigned Mentees"],
    ["HOD", "hod@charusat.edu.in", "clias123", "Head of Dept (CSE)", "All Programs & Faculty within CSE"],
    ["HEAD", "head@charusat.edu.in", "clias123", "Institutional Provost", "Macro Aggregate across all Institutes"]
])

add_callout(
    doc,
    "In local development mode, simulated email verification OTPs are printed directly in the NestJS API server console window (e.g. '[EmailService] OTP for student@charusat.edu.in: 123456').",
    title="TESTING OTP RETRIEVAL",
    fill_hex="FFFBEB",
    border_color="D97706",
    text_color="B45309"
)

# -------------------------------------------------------------
# SECTION 3: FEATURE-BY-FEATURE MANUAL TEST SUITES
# -------------------------------------------------------------
add_heading_styled(doc, "Section 3: Feature-by-Feature Manual Test Suites", level=1)
add_body_p(doc, "This section contains detailed, step-by-step test cases for every functional module in CLIAS. Each test case defines explicit preconditions, navigation paths, test inputs, expected UI behaviors, and validation checkpoints.")

# 3.1 SUPER ADMIN
add_heading_styled(doc, "Module 3.1: Super Admin Portal & Institutional Management", level=2)
add_body_p(doc, "The Super Admin module controls authoritative institutional rosters, department hierarchies, and global system parameters.")

create_test_case_table(
    doc,
    tc_id="ADM-001",
    title="Authorized Student Roster CSV Bulk Import & Validation",
    role="SUPER_ADMIN",
    priority="P0 (Critical)",
    preconditions="Super Admin is logged in; API and Database running; CSV file formatted with columns: studentId, email, name, institute, department, program, semester, division, batch.",
    steps=(
        "1. Log in as Super Admin (admin@charusat.edu.in / clias123).\n"
        "2. Navigate to '/admin/students' via sidebar or URL.\n"
        "3. Click the 'Import Authorized Students' or 'Upload CSV' button.\n"
        "4. Select 'counsellor_test_allocations.csv' or custom authorized CSV from project root.\n"
        "5. Observe file preview modal displaying total record count and column mapping.\n"
        "6. Click 'Confirm Import' to execute server-side parsing and database insertion."
    ),
    test_data="File: counsellor_test_allocations.csv (contains valid student IDs, email @charusat.edu.in, semester 5).",
    expected_results=(
        "1. Modal shows progress spinner during processing.\n"
        "2. Success notification displays: 'Successfully imported N authorized student records'.\n"
        "3. Table immediately refreshes showing newly imported students with status 'PENDING_REGISTRATION'.\n"
        "4. No database duplicate constraint errors occur."
    )
)

create_test_case_table(
    doc,
    tc_id="ADM-002",
    title="CSV Error Quarantine & Malformed Record Diagnostics",
    role="SUPER_ADMIN",
    priority="P1 (High)",
    preconditions="Super Admin on '/admin/students'. Prepare a test CSV containing 1 valid row, 1 missing email row, and 1 non-institutional domain row.",
    steps=(
        "1. Click 'Upload CSV'.\n"
        "2. Select the malformed test CSV file.\n"
        "3. Click 'Confirm Import'.\n"
        "4. Inspect the resulting validation error feedback report."
    ),
    test_data="Row 2: '24CS999, invalid-email, Test Student, CSPIT, CSE, BTECH, 5, A, 2024'\nRow 3: '24CS998, user@gmail.com, Outsider, CSPIT, CSE, BTECH, 5, A, 2024'",
    expected_results=(
        "1. System rejects malformed rows without crashing the import process.\n"
        "2. Diagnostic drawer displays exact line numbers and error reasons (e.g., 'Row 2: Invalid Email Format', 'Row 3: Non-Institutional Domain').\n"
        "3. Valid rows are successfully saved while invalid rows are flagged for download/correction."
    )
)

create_test_case_table(
    doc,
    tc_id="ADM-003",
    title="Institute & Academic Department Structure Configuration",
    role="SUPER_ADMIN",
    priority="P2 (Medium)",
    preconditions="Super Admin logged in.",
    steps=(
        "1. Navigate to '/admin/institutes'.\n"
        "2. Verify existing institutions (CSPIT, DEPSTAR, CMPICA) are displayed in the institute card grid.\n"
        "3. Click '+ Add Institute' and input 'Test Institute of Technology (TIT)' with Code 'TIT'.\n"
        "4. Click 'Save Institute'.\n"
        "5. Under TIT, click 'Add Department' and create 'Artificial Intelligence' with code 'AI'.\n"
        "6. Verify the newly created department appears in dropdown selectors across the system."
    ),
    test_data="Institute: TIT | Code: TIT | Department: Artificial Intelligence (AI)",
    expected_results=(
        "1. New Institute and Department records appear in the table with timestamps.\n"
        "2. Database reflects relations accurately without orphaned records."
    )
)

# 3.2 AUTHENTICATION & SECURITY
add_heading_styled(doc, "Module 3.2: Authentication, Domain Enforcement & User Profile", level=2)
add_body_p(doc, "Tests strict domain verification (@charusat.edu.in), registration roster synchronization, OTP flows, and Role-Based Access Control (RBAC).")

create_test_case_table(
    doc,
    tc_id="AUTH-001",
    title="Institutional Email Domain Enforcement & Rejection of Public Domains",
    role="UNAUTHENTICATED VISITOR",
    priority="P0 (Critical)",
    preconditions="Browser cache cleared; navigated to 'http://localhost:3000/auth/register'.",
    steps=(
        "1. Open '/auth/register'.\n"
        "2. In the Email field, enter a non-institutional address (e.g., 'student@gmail.com' or 'test@yahoo.com').\n"
        "3. Tab out or click 'Send OTP / Continue'.\n"
        "4. Observe frontend inline validation and backend API response."
    ),
    test_data="Email: 'student@gmail.com' or 'john.doe@external.com'",
    expected_results=(
        "1. Form immediately displays error: 'Only official institutional email addresses (@charusat.edu.in) are permitted'.\n"
        "2. 'Send OTP' button is disabled or API returns 400 Bad Request.\n"
        "3. No OTP is generated or sent."
    )
)

create_test_case_table(
    doc,
    tc_id="AUTH-002",
    title="Unauthorized Student Registration Rejection (Not in Roster)",
    role="UNAUTHENTICATED VISITOR",
    priority="P0 (Critical)",
    preconditions="Email ends with @charusat.edu.in but has NOT been uploaded by Admin into the AuthorizedStudent roster.",
    steps=(
        "1. Open '/auth/register'.\n"
        "2. Enter an unlisted institutional email: 'unauthorized999@charusat.edu.in'.\n"
        "3. Click 'Send OTP'.\n"
        "4. Inspect notification and network payload."
    ),
    test_data="Email: 'unauthorized999@charusat.edu.in'",
    expected_results=(
        "1. API returns 403 Forbidden with message: 'This university email is not in the approved institutional roster. Contact your department administrator.'\n"
        "2. Registration does not proceed to the OTP stage."
    )
)

create_test_case_table(
    doc,
    tc_id="AUTH-003",
    title="Authorized Student Registration, OTP Verification & Metadata Auto-Locking",
    role="STUDENT (New)",
    priority="P0 (Critical)",
    preconditions="A student record exists in AuthorizedStudent table with email '24cs050@charusat.edu.in', Name: 'Jay Shah', Dept: 'CSE', Sem: 5.",
    steps=(
        "1. Navigate to '/auth/register'.\n"
        "2. Enter '24cs050@charusat.edu.in' and click 'Send OTP'.\n"
        "3. Check the API console log for the 6-digit OTP.\n"
        "4. Enter the 6-digit OTP into the verification inputs.\n"
        "5. Observe Step 2 of the registration wizard.\n"
        "6. Set password to 'clias123', confirm password, and click 'Complete Registration'."
    ),
    test_data="Email: '24cs050@charusat.edu.in', Password: 'StrongPassword@123'",
    expected_results=(
        "1. OTP verification succeeds.\n"
        "2. Full Name, Enrollment No, Institute, Department, and Semester fields are automatically populated from AuthorizedStudent table and are READ-ONLY (locked).\n"
        "3. Submitting the form creates the User and Student records, issues a JWT token, and redirects to '/student/dashboard'."
    )
)

create_test_case_table(
    doc,
    tc_id="AUTH-004",
    title="Role-Based Access Control (RBAC) & Route Guard Enforcement",
    role="STUDENT / FACULTY",
    priority="P0 (Critical)",
    preconditions="Logged in as Student (student@charusat.edu.in).",
    steps=(
        "1. Log in as Student.\n"
        "2. Manually change the browser URL to '/faculty/dashboard'.\n"
        "3. Observe system behavior.\n"
        "4. Manually change the browser URL to '/admin/students' and '/hod/dashboard'.\n"
        "5. Attempt an unauthorized direct API call: GET 'http://localhost:4000/api/v1/faculty/assessments' using the student's Bearer token."
    ),
    test_data="Target URLs: /faculty/dashboard, /admin/students, /hod/dashboard",
    expected_results=(
        "1. Client-side route guard intercepts the request and redirects to '/student/dashboard' or displays a '403 Access Denied' page.\n"
        "2. Direct API call returns HTTP 403 Forbidden with error: 'Forbidden: Insufficient role permissions'.\n"
        "3. No confidential faculty/admin data is leaked in the response payload."
    )
)

# 3.3 STUDENT EXPERIENCE & LEARNING INTELLIGENCE
add_heading_styled(doc, "Module 3.3: Student Experience & Learning Intelligence Loop", level=2)
add_body_p(doc, "Tests the dynamic Student Knowledge Model, Recharts longitudinal learning curves, EWMA topic masteries, interactive diagnostic practice, and Socratic AI assistance.")

create_test_case_table(
    doc,
    tc_id="STU-001",
    title="Dynamic Learning Curve & EWMA Topic Mastery Visualization",
    role="STUDENT",
    priority="P1 (High)",
    preconditions="Logged in as 'student@charusat.edu.in' (Rahul Patel with pre-seeded history).",
    steps=(
        "1. Navigate to '/student/dashboard'.\n"
        "2. Verify the 'Learning Curve' Recharts area/line chart is rendered with historical dates on the X-axis and Mastery % on the Y-axis.\n"
        "3. Hover cursor over multiple chart data points to verify tooltip data (Date, Assessment/Practice Score, Rolling Mastery).\n"
        "4. Scroll down to 'Topic Mastery' section.\n"
        "5. Verify mastery progress bars for 'Arrays', 'Linked Lists', 'Trees', 'Dynamic Programming'.\n"
        "6. Check 'Needs Attention / Weak Concepts' cards for topics with mastery < 60%."
    ),
    test_data="Account: student@charusat.edu.in / clias123",
    expected_results=(
        "1. Learning curve renders smoothly without NaN or null errors.\n"
        "2. Mastery bars accurately display percentage and color coding (Green > 75%, Amber 50-74%, Red < 50%).\n"
        "3. Weak topics cards display direct 'Practice Now' action buttons."
    )
)

create_test_case_table(
    doc,
    tc_id="STU-002",
    title="Interactive Diagnostic Practice Session & Instant Remediation",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student logged in; navigated to '/student/practice'.",
    steps=(
        "1. Open '/student/practice'.\n"
        "2. Select Course: 'Data Structures and Algorithms (CS301)'.\n"
        "3. Select Topic: 'Arrays & Dynamic Arrays'.\n"
        "4. Click 'Start Practice Session'.\n"
        "5. Observe question text, options (A, B, C, D), question difficulty badge, and active timer.\n"
        "6. Select an incorrect answer option intentionally and click 'Submit Answer'.\n"
        "7. Inspect the immediate feedback card.\n"
        "8. Click 'Next Question', select the correct answer, and submit."
    ),
    test_data="Course: CS301 | Topic: Arrays | Question difficulty: Medium",
    expected_results=(
        "1. Submitting wrong answer turns selected option red, highlights the correct option in green, and displays a detailed remedial conceptual explanation.\n"
        "2. Submitting correct answer awards XP and updates streak counter.\n"
        "3. Time spent on the question is logged and transmitted to backend telemetry."
    )
)

create_test_case_table(
    doc,
    tc_id="STU-003",
    title="Real-Time Knowledge Model Recalculation (EWMA Formula)",
    role="STUDENT",
    priority="P1 (High)",
    preconditions="Note the baseline mastery score for 'Arrays' on '/student/dashboard' (e.g. 85%).",
    steps=(
        "1. Go to '/student/practice' and complete 3 consecutive Hard questions on 'Arrays' correctly.\n"
        "2. Return to '/student/dashboard' and refresh.\n"
        "3. Observe the updated mastery percentage for 'Arrays'.\n"
        "4. Go back to Practice, select 'Dynamic Programming', and fail 2 consecutive questions.\n"
        "5. Check '/student/dashboard' again."
    ),
    test_data="Practice runs: 3 correct Hard Array questions, 2 incorrect DP questions.",
    expected_results=(
        "1. 'Arrays' mastery increases proportionally based on Hard question difficulty weight.\n"
        "2. 'Dynamic Programming' mastery decreases reflecting error penalty.\n"
        "3. The learning curve chart adds new chronological data points matching the current timestamp."
    )
)

create_test_case_table(
    doc,
    tc_id="STU-004",
    title="AI Socratic Learning Assistant Interactive Consultation",
    role="STUDENT",
    priority="P1 (High)",
    preconditions="Student on practice page or dedicated AI Tutor widget; AI service running on port 8000.",
    steps=(
        "1. While viewing a complex question, click 'Ask AI Tutor' or open the chat panel.\n"
        "2. Type: 'I don't understand how binary search works on rotated arrays. Can you give me the direct answer to this quiz question?'\n"
        "3. Submit the message and observe the AI response streaming.\n"
        "4. Type: 'Can you give me a hint on what condition to check for the sorted half?'\n"
        "5. Observe follow-up response."
    ),
    test_data="Prompt: 'Give me the quiz answer' followed by 'Explain the intuition of finding the pivot'",
    expected_results=(
        "1. AI assistant politely refuses to disclose direct exam answers ('As your Socratic tutor, I cannot give you direct answers during practice...').\n"
        "2. AI provides conceptual scaffolding, asking the student guiding questions to help them deduce the algorithm themselves."
    )
)

create_test_case_table(
    doc,
    tc_id="STU-005",
    title="Placement & Target Role Readiness Radar Benchmark",
    role="STUDENT",
    priority="P2 (Medium)",
    preconditions="Student logged in; navigated to '/student/placement'.",
    steps=(
        "1. Navigate to '/student/placement'.\n"
        "2. In the 'Target Role' dropdown, select 'Software Development Engineer (SDE - Tier 1)'.\n"
        "3. Inspect the Radar Chart displaying student's actual competencies vs Industry Benchmark.\n"
        "4. Review the 'Skill Gap Matrix' (identifying deficiencies in Algorithms, System Design, or DBMS).\n"
        "5. Click 'Generate Target Remediation Path'."
    ),
    test_data="Target Role: SDE Tier 1 / Full Stack Engineer",
    expected_results=(
        "1. Radar chart plots current score (e.g. 72%) vs Target (85%) across 6 core competency axes.\n"
        "2. Skill gap table highlights specific subtopics needing practice before placement tests.\n"
        "3. Action button links directly to targeted practice questions."
    )
)

# 3.4 STUDENT CODING ENGINE
add_heading_styled(doc, "Module 3.4: Student In-Browser Coding Engine & Automated Code Judge", level=2)
add_body_p(doc, "Tests the multi-language code execution sandbox, Monaco editor, custom input runners, automated test case judging, and runtime telemetry.")

create_test_case_table(
    doc,
    tc_id="CODE-001",
    title="In-Browser Code Editor & Multi-Language Template Initialization",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student logged in; navigated to '/student/coding'.",
    steps=(
        "1. Open '/student/coding'.\n"
        "2. Select problem: 'Two Sum' or 'Reverse a Linked List'.\n"
        "3. Verify Monaco editor is rendered with syntax highlighting, line numbers, and minimap.\n"
        "4. Switch language dropdown between Python, C++, Java, and JavaScript.\n"
        "5. Observe how the boilerplate starter code and standard I/O template changes automatically for each language."
    ),
    test_data="Languages: Python (3.10), C++ (GCC 11), Java (OpenJDK 17), JavaScript (Node 20)",
    expected_results=(
        "1. Editor syntax highlighting updates immediately according to chosen language.\n"
        "2. Starter template provides standard function signature and input parsing boilerplate without syntax errors."
    )
)

create_test_case_table(
    doc,
    tc_id="CODE-002",
    title="Custom Input Execution & Execution Sandbox Verification",
    role="STUDENT",
    priority="P1 (High)",
    preconditions="Student on coding problem page.",
    steps=(
        "1. Check the 'Custom Input' checkbox.\n"
        "2. In the Custom Input textarea, provide input: '4\\n2 7 11 15\\n9'.\n"
        "3. Write a simple solution in the code editor.\n"
        "4. Click 'Run Code' (not Submit).\n"
        "5. Observe terminal execution drawer."
    ),
    test_data="Input: Array [2, 7, 11, 15], Target: 9",
    expected_results=(
        "1. Button displays 'Compiling & Running...' state.\n"
        "2. Output console renders standard output (stdout), execution time in milliseconds, and peak memory usage in MB.\n"
        "3. Status badge indicates 'Success / Exit Code 0'."
    )
)

create_test_case_table(
    doc,
    tc_id="CODE-003",
    title="Automated Testcase Judge & Verdict Handling (AC, WA, TLE, CE)",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student on coding problem page.",
    steps=(
        "1. Test 1 (Wrong Answer): Enter code returning incorrect output. Click 'Submit Code'. Verify 'Wrong Answer' verdict with diff of Expected vs Actual on Sample Test Cases.\n"
        "2. Test 2 (Compilation Error): Introduce intentional syntax error (e.g. missing semicolon or invalid token). Click 'Submit'. Verify 'Compilation Error' with compiler traceback.\n"
        "3. Test 3 (Time Limit Exceeded): Enter an infinite loop ('while(true){}'). Click 'Submit'. Verify execution terminates with 'Time Limit Exceeded (Limit: 2.0s)'.\n"
        "4. Test 4 (Accepted): Enter an optimal O(n) solution. Click 'Submit'."
    ),
    test_data="Valid Python Two Sum Solution using Hash Map.",
    expected_results=(
        "1. Hidden test cases are evaluated on the backend judge without revealing private test inputs to the client.\n"
        "2. All sample and hidden test cases pass for valid solution.\n"
        "3. Verdict badge displays 'Accepted (Passed 10/10 Test Cases)' with runtime (e.g., 42ms) and memory footprint."
    )
)

# 3.5 AI PROCTORED ASSESSMENTS
add_heading_styled(doc, "Module 3.5: Student Proctored Assessment Engine & AI Integrity", level=2)
add_body_p(doc, "Tests pre-exam webcam enrollment, browser fullscreen lockdown, tab-switch blur penalties, and real-time AI anomaly detection.")

create_test_case_table(
    doc,
    tc_id="PROC-001",
    title="Pre-Assessment Webcam Verification & On-Demand Face Enrollment",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student enrolled in an active Proctored Assessment (e.g. 'CS301 Midterm'); Webcam connected.",
    steps=(
        "1. Navigate to '/student/assessments'.\n"
        "2. Click 'Start Assessment' on the proctored exam card.\n"
        "3. System prompts for Browser Camera & Microphone permissions. Click 'Allow'.\n"
        "4. Observe the Face Enrollment modal showing live video feed and oval alignment guide.\n"
        "5. Position face in the center until border turns green.\n"
        "6. Click 'Capture & Enroll Face Baseline'.\n"
        "7. Review agreement checklist and click 'Enter Proctored Exam'."
    ),
    test_data="Assessment: CS301 Midterm Examination (Proctored = True)",
    expected_results=(
        "1. Webcam stream initializes without flickering.\n"
        "2. Face baseline embedding is extracted and saved to session context.\n"
        "3. System transitions browser into full-screen lockdown mode."
    )
)

create_test_case_table(
    doc,
    tc_id="PROC-002",
    title="Fullscreen Lockdown & Browser Tab Switch Anomaly Logging",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student is inside an active proctored assessment session.",
    steps=(
        "1. Press 'Escape' key or attempt to exit full-screen mode.\n"
        "2. Observe prompt.\n"
        "3. Press 'Alt + Tab' or click outside the browser window onto another desktop application.\n"
        "4. Return to the assessment window.\n"
        "5. Attempt to use keyboard shortcuts 'Ctrl + C', 'Ctrl + V', or right-click to inspect element."
    ),
    test_data="Action: Tab switch and copy-paste attempts",
    expected_results=(
        "1. System displays immediate high-priority warning modal: 'Warning: Window Blur / Tab Switch Detected. This incident has been logged. Violation 1 of 3.'\n"
        "2. Fullscreen mode re-engages immediately.\n"
        "3. Copy, paste, and context menu events are intercepted and blocked.\n"
        "4. Violation count increments and is synchronized with the invigilator dashboard."
    )
)

create_test_case_table(
    doc,
    tc_id="PROC-003",
    title="Real-Time AI Multi-Face & Absence Anomaly Detection",
    role="STUDENT",
    priority="P1 (High)",
    preconditions="Assessment running; live webcam preview active in top-right corner.",
    steps=(
        "1. Move face completely out of camera view for 8 seconds.\n"
        "2. Return to camera view and observe screen notification.\n"
        "3. Have a second person lean into the webcam frame so two faces are visible simultaneously.\n"
        "4. Observe telemetry notification badge."
    ),
    test_data="Video anomaly simulation: No Face Detected, Multiple Faces Detected",
    expected_results=(
        "1. Missing face triggers warning: 'Warning: Candidate face not detected. Please remain facing the screen.'\n"
        "2. Multiple faces trigger alert: 'Suspicious Activity: Multiple faces detected in camera feed.'\n"
        "3. Timestamped webcam snapshot is securely uploaded to backend audit log."
    )
)

create_test_case_table(
    doc,
    tc_id="PROC-004",
    title="Assessment Submission Flow & Auto-Submit on Timer Expiry",
    role="STUDENT",
    priority="P0 (Critical)",
    preconditions="Student taking assessment; timer visible in top header bar.",
    steps=(
        "1. Answer all questions across multiple sections.\n"
        "2. Use question palette to jump between answered, unanswered, and flagged questions.\n"
        "3. Scenario A (Manual Submission): Click 'Submit Assessment'. Confirm dialog appears detailing total answered vs skipped questions. Click 'Confirm Final Submit'.\n"
        "4. Scenario B (Auto-Submit): Allow the countdown timer to reach 00:00 without clicking submit."
    ),
    test_data="Timer countdown to 00:00",
    expected_results=(
        "1. On confirmation or when timer hits zero, the session locks immediately.\n"
        "2. System sends final answers payload to API.\n"
        "3. Fullscreen exits gracefully and student is redirected to submission summary page showing completion status and score (if configured to show immediately)."
    )
)

# 3.6 FACULTY PORTAL & AI GENERATOR
add_heading_styled(doc, "Module 3.6: Faculty Portal, AI Assessment Generator & Invigilation", level=2)
add_body_p(doc, "Tests faculty analytics, question bank CRUD, syllabus/prompt-driven AI assessment generation with mandatory human approval, and real-time live invigilation.")

create_test_case_table(
    doc,
    tc_id="FAC-001",
    title="Class-Wide Concept Mastery Heatmap & Cohort Weakness Analytics",
    role="FACULTY",
    priority="P1 (High)",
    preconditions="Logged in as Faculty (faculty@charusat.edu.in / clias123); assigned to CS301.",
    steps=(
        "1. Navigate to '/faculty/dashboard' and '/faculty/analytics'.\n"
        "2. Select Course: 'Data Structures and Algorithms (CS301)'.\n"
        "3. Select Division: 'Division A'.\n"
        "4. Observe the Course Topic Mastery Heatmap.\n"
        "5. Click on 'Binary Search Trees' to drill down into student score distributions.\n"
        "6. Check 'Common Class Misconceptions' list."
    ),
    test_data="Course: CS301 | Cohort: CSE Sem 5 Div A",
    expected_results=(
        "1. Heatmap renders mastery percentage for every topic across the class.\n"
        "2. Topics with collective student error clusters (e.g. Graph Cycles) are highlighted in red.\n"
        "3. Misconceptions table lists specific question distractors frequently chosen by students."
    )
)

create_test_case_table(
    doc,
    tc_id="FAC-002",
    title="AI Assessment Question Generation with Mandatory Human Review",
    role="FACULTY",
    priority="P0 (Critical)",
    preconditions="Faculty logged in; navigated to '/faculty/ai-generator'.",
    steps=(
        "1. Navigate to '/faculty/ai-generator'.\n"
        "2. Select Course: 'CS301' and Topic: 'Graphs and Shortest Paths'.\n"
        "3. Select Bloom's Taxonomy Level: 'Apply / Analyze'.\n"
        "4. Set Question Count: '5' and Difficulty Distribution: '2 Medium, 3 Hard'.\n"
        "5. Enter custom prompt instruction: 'Include questions on Dijkstra edge weights and cycle detection.'\n"
        "6. Click 'Generate Questions with AI'.\n"
        "7. Review generated questions in the review workspace.\n"
        "8. Edit question #2's explanation text manually.\n"
        "9. Click 'Approve and Add to Question Bank'."
    ),
    test_data="Prompt: 'Generate 5 rigorous MCQs on Dijkstra and Bellman-Ford algorithms'",
    expected_results=(
        "1. AI microservice generates 5 structurally valid questions with 4 options, marked correct answer, and explanation.\n"
        "2. System strictly requires faculty review before adding questions to official repository (Human-in-the-loop).\n"
        "3. Approved questions are committed to QuestionBank table with flag 'AI_GENERATED_APPROVED'."
    )
)

create_test_case_table(
    doc,
    tc_id="FAC-003",
    title="Assessment Scheduling & Proctoring Policy Configuration Wizard",
    role="FACULTY",
    priority="P0 (Critical)",
    preconditions="Faculty logged in; navigated to '/faculty/assessments'.",
    steps=(
        "1. Open '/faculty/assessments' and click '+ Create Assessment'.\n"
        "2. Enter Title: 'CS301 Lab Quiz 1', Duration: '45 Minutes'.\n"
        "3. Set Start Time (Tomorrow 10:00 AM) and End Time (Tomorrow 12:00 PM).\n"
        "4. In Question Selection, select 10 questions from Question Bank.\n"
        "5. Configure Proctoring Rules: Enable 'Webcam Face Detection', Enable 'Fullscreen Lockdown', Set 'Max Tab Switches = 2'.\n"
        "6. Enable 'Shuffle Questions' and 'Shuffle Options'.\n"
        "7. Click 'Publish Assessment'."
    ),
    test_data="Exam Name: CS301 Lab Quiz 1 | Duration: 45m | Proctoring: Strict",
    expected_results=(
        "1. Assessment is saved with status 'SCHEDULED'.\n"
        "2. Target student cohort receives assessment on their assessment dashboard when active.\n"
        "3. Integrity policies are correctly persisted in assessment settings JSON."
    )
)

create_test_case_table(
    doc,
    tc_id="FAC-004",
    title="Live Invigilation Console & Anomaly Audit Trail",
    role="FACULTY",
    priority="P0 (Critical)",
    preconditions="An active proctored assessment is in progress with at least 1 student logged in.",
    steps=(
        "1. Navigate to '/faculty/invigilation'.\n"
        "2. Select the active exam.\n"
        "3. Observe candidate grid showing real-time student statuses ('ONLINE', 'IN_PROGRESS', 'ANOMALY_DETECTED').\n"
        "4. Click on a student flagged with red badge (e.g. Rahul Patel).\n"
        "5. Inspect the Anomaly Log Timeline (displays timestamps of Tab Switch, Missing Face, or Multiple Faces).\n"
        "6. Click on captured webcam thumbnail to expand high-resolution snapshot.\n"
        "7. Test action buttons: 'Send Warning Message' and 'Force Terminate Assessment'."
    ),
    test_data="Live Assessment Invigilation Session",
    expected_results=(
        "1. Live student progress (answered count, current question, connection status) updates in real time.\n"
        "2. Anomaly events list precise timestamp, severity level, and webcam snapshot evidence.\n"
        "3. Sending warning message pops up an instant alert on the student's test screen."
    )
)

# 3.7 CODE PLAGIARISM & AST SIMILARITY
add_heading_styled(doc, "Module 3.7: Faculty Code Plagiarism & AST Structural Similarity", level=2)
add_body_p(doc, "Tests structural tokenization, Winnowing fingerprint algorithms, pairwise comparison matrices, and side-by-side code diff inspectors.")

create_test_case_table(
    doc,
    tc_id="PLAG-001",
    title="Structural AST Tokenization & Plagiarism Cluster Detection",
    role="FACULTY",
    priority="P1 (High)",
    preconditions="Multiple students have submitted code for a programming assessment (e.g. Student A, Student B, and Student C). Student B has renamed variables and added redundant comments to Student A's code.",
    steps=(
        "1. Open '/faculty/assessments'.\n"
        "2. Click on completed coding assessment and open 'Plagiarism & AST Analysis' tab.\n"
        "3. Set Similarity Threshold slider to '70%'.\n"
        "4. Click 'Run Plagiarism Detection Engine'.\n"
        "5. Observe the generated Pairwise Similarity Matrix and Flagged Clusters."
    ),
    test_data="Code submissions where Student B copied Student A with variable renaming (e.g., 'sum' -> 'total', 'i' -> 'idx').",
    expected_results=(
        "1. Algorithm normalizes syntax trees, ignoring cosmetic changes (variable renames, whitespace, comments).\n"
        "2. Similarity score between Student A and Student B exceeds 85% and is highlighted in red.\n"
        "3. Dissimilar code (Student C) scores < 30% and is marked safe."
    )
)

create_test_case_table(
    doc,
    tc_id="PLAG-002",
    title="Side-by-Side Structural Token Diff Inspector & Flagging",
    role="FACULTY",
    priority="P1 (High)",
    preconditions="Plagiarism detection executed with flagged pair.",
    steps=(
        "1. Click 'Inspect Pair' on the flagged row for Student A vs Student B.\n"
        "2. Observe side-by-side split code viewer.\n"
        "3. Verify that identical AST token sequences (loops, conditionals, logic blocks) are highlighted in matching colors.\n"
        "4. Click 'Confirm Plagiarism Violation' and add notes: 'Blatant AST logic cloning'.\n"
        "5. Click 'Submit Penalty Flag'."
    ),
    test_data="Flagged pair: Student A (24CS001) vs Student B (24CS002)",
    expected_results=(
        "1. Split view highlights matching logic blocks clearly.\n"
        "2. Submitting penalty updates student assessment record to 'FLAGGED_PLAGIARISM' with instructor audit remarks."
    )
)

# 3.8 COUNSELLOR PORTAL
add_heading_styled(doc, "Module 3.8: Counsellor Portal & Mentee Early Warning System", level=2)
add_body_p(doc, "Tests strict mentee scoping via CounsellorAssignment, early academic distress warnings, and intervention session logs.")

create_test_case_table(
    doc,
    tc_id="CNS-001",
    title="Strict Mentee Roster Scoping via CounsellorAssignment",
    role="COUNSELLOR",
    priority="P0 (Critical)",
    preconditions="Logged in as Counsellor (counsellor@charusat.edu.in / clias123). Counsellor has 15 assigned mentees in the database.",
    steps=(
        "1. Log in and navigate to '/counsellor/dashboard' and '/counsellor/students'.\n"
        "2. Count the total students listed in the mentee roster table.\n"
        "3. Verify that ONLY assigned students appear and non-mentees from other divisions are absent.\n"
        "4. Attempt to access a non-mentee's profile by manually modifying URL ID (e.g. '/counsellor/students/99999')."
    ),
    test_data="Account: counsellor@charusat.edu.in",
    expected_results=(
        "1. Roster displays exactly the assigned mentees matching CounsellorAssignment table.\n"
        "2. Direct URL manipulation to access unauthorized students returns '403 Forbidden: Student not assigned to this counsellor'."
    )
)

create_test_case_table(
    doc,
    tc_id="CNS-002",
    title="Early Warning Distress Detection & Intervention Session Logging",
    role="COUNSELLOR",
    priority="P1 (High)",
    preconditions="A mentee has declining mastery (< 40%) or has not practiced in 14 days.",
    steps=(
        "1. Check the 'Academic Risk Alerts' widget on '/counsellor/dashboard'.\n"
        "2. Observe alert tags: 'Declining Mastery Curve', 'Disengaged (>14 Days Inactive)', or 'Consecutive Quiz Failure'.\n"
        "3. Click on the student's name to view their longitudinal progress profile.\n"
        "4. Click 'Log Counseling Intervention'.\n"
        "5. Enter Meeting Date, Discussion Notes: 'Discussed difficulty with Recursion and time management.', and Action Item: 'Assigned remedial practice module'.\n"
        "6. Click 'Save Intervention'."
    ),
    test_data="Action Notes: 'Academic counseling held on 20-Oct-2026. Advised to attend faculty doubt clinic.'",
    expected_results=(
        "1. At-risk students are automatically flagged by the analytical engine.\n"
        "2. Counseling log is appended to student's institutional timeline.\n"
        "3. Student dashboard receives designated remedial intervention focus."
    )
)

# 3.9 HOD & INSTITUTIONAL HEAD
add_heading_styled(doc, "Module 3.9 & 3.10: HOD & Institutional Head Macro Analytics", level=2)
add_body_p(doc, "Tests department-wide curriculum health, division comparisons, CO-PO attainment matrices, and institutional provost benchmarks.")

create_test_case_table(
    doc,
    tc_id="HOD-001",
    title="Departmental Curriculum Health & Cross-Division Performance",
    role="HOD",
    priority="P1 (High)",
    preconditions="Logged in as HOD (hod@charusat.edu.in / clias123).",
    steps=(
        "1. Navigate to '/hod/dashboard'.\n"
        "2. Select Semester: 'Semester 5', Academic Year: '2026-27'.\n"
        "3. Review the 'Division Performance Comparison' chart (comparing Division A, B, and C average mastery).\n"
        "4. Inspect 'Faculty Syllabus & Question Coverage' progress bars.\n"
        "5. Click 'Export Department Accreditation Summary (PDF/Excel)'."
    ),
    test_data="HOD Account: CSE Department",
    expected_results=(
        "1. Comparative bar charts clearly illustrate performance variances between divisions.\n"
        "2. Lagging courses (where average mastery < 55%) are flagged with red indicator badges.\n"
        "3. Data is aggregate across all department students without leaking private personal notes."
    )
)

create_test_case_table(
    doc,
    tc_id="HEAD-001",
    title="University-Wide Macro KPIs & Accreditation Readiness Overview",
    role="HEAD / PROVOST",
    priority="P2 (Medium)",
    preconditions="Logged in as Institutional Head (head@charusat.edu.in / clias123).",
    steps=(
        "1. Open '/head/dashboard'.\n"
        "2. Inspect high-level macro cards: Total Active Students (980+), Average Institutional Mastery, Placement Readiness Index (%), Active Assessments.\n"
        "3. Review the Inter-Department Comparison Matrix (CSPIT CSE vs IT vs EC).\n"
        "4. Filter by Academic Year."
    ),
    test_data="Account: head@charusat.edu.in",
    expected_results=(
        "1. Macro cards display accurate aggregate figures calculated across institutes.\n"
        "2. Charts allow institutional leadership to benchmark engineering departments against accreditation criteria."
    )
)

# -------------------------------------------------------------
# SECTION 4: INTEGRATED END-TO-END WORKFLOWS
# -------------------------------------------------------------
add_heading_styled(doc, "Section 4: End-to-End Integrated System Verification Flows", level=1)
add_body_p(doc, "These four master workflows test real-life academic lifecycles that cross multiple user roles, database entities, and microservice processes.")

add_heading_styled(doc, "Workflow 1: Institutional Onboarding to First Student Assessment", level=2)
add_bullet_p(doc, "Log in as Super Admin (`admin@charusat.edu.in`) and upload `counsellor_test_allocations.csv` via `/admin/students`.", bold_prefix="Phase A (Admin Roster): ")
add_bullet_p(doc, "Log in as Faculty (`faculty@charusat.edu.in`), navigate to `/faculty/assessments`, and create a 5-question Quiz on Arrays scheduled for today.", bold_prefix="Phase B (Faculty Quiz Creation): ")
add_bullet_p(doc, "Navigate to `/auth/register`, enter authorized student email, verify console OTP, complete registration, and log in to `/student/dashboard`.", bold_prefix="Phase C (Student Onboarding): ")
add_bullet_p(doc, "Student opens `/student/assessments`, takes the quiz, submits answers, and receives completion score.", bold_prefix="Phase D (Assessment Execution): ")
add_bullet_p(doc, "Verify student's learning curve on `/student/dashboard` updates dynamically and faculty dashboard reflects updated class participation.", bold_prefix="Phase E (Knowledge Loop Closure): ")

add_heading_styled(doc, "Workflow 2: AI Assessment Authoring to Proctored Live Invigilation", level=2)
add_bullet_p(doc, "Faculty uses AI Generator (`/faculty/ai-generator`) to generate 5 MCQs on 'Trees' with Bloom Level 'Analyze'.", bold_prefix="Phase A (AI Authoring): ")
add_bullet_p(doc, "Faculty reviews, edits Question 3, approves all questions, and schedules proctored exam with 'Webcam On' and 'Tab Switch Limit = 2'.", bold_prefix="Phase B (Approval & Scheduling): ")
add_bullet_p(doc, "Student launches exam, captures webcam face baseline, enters full screen, answers questions, and intentionally switches tabs twice.", bold_prefix="Phase C (Student Exam & Violations): ")
add_bullet_p(doc, "Faculty monitors `/faculty/invigilation` in real-time, observes student's 2 tab-switch warnings, views webcam snapshots, and broadcasts warning message.", bold_prefix="Phase D (Live Invigilation): ")
add_bullet_p(doc, "Student finishes exam; faculty reviews final integrity score and confirms grade submission.", bold_prefix="Phase E (Integrity Audit & Finalization): ")

add_heading_styled(doc, "Workflow 3: Diagnostic Practice -> Misconception Detection -> Counsellor Intervention", level=2)
add_bullet_p(doc, "Student practices 'Graph Traversals' on `/student/practice` and fails 4 questions consecutively due to cycle confusion.", bold_prefix="Phase A (Practice & Error Trigger): ")
add_bullet_p(doc, "EWMA algorithm penalizes 'Graph Traversals' mastery (< 45%), moving topic to 'Critical Weakness' card.", bold_prefix="Phase B (Knowledge Model Update): ")
add_bullet_p(doc, "AI system generates personalized remedial explanation and recommends specific graph video/text resource.", bold_prefix="Phase C (Automated AI Remediation): ")
add_bullet_p(doc, "Counsellor dashboard flags student as 'At-Risk (Declining Curve in CS301)'.", bold_prefix="Phase D (Counsellor Alert): ")
add_bullet_p(doc, "Counsellor logs counseling intervention session and assigns targeted practice; student completes remedial tasks and restores mastery above 70%.", bold_prefix="Phase E (Mentorship Closure): ")

add_heading_styled(doc, "Workflow 4: Coding Assessment -> In-Browser Judge -> AST Plagiarism Audit", level=2)
add_bullet_p(doc, "Faculty creates coding problem 'Longest Substring Without Repeating Characters' with 3 sample and 5 hidden test cases.", bold_prefix="Phase A (Problem Configuration): ")
add_bullet_p(doc, "Student 1 submits optimal Python solution. In-browser judge verifies all test cases pass (Accepted, 38ms).", bold_prefix="Phase B (Student 1 Submission): ")
add_bullet_p(doc, "Student 2 copies Student 1's code, renames variables, changes indentation, and submits.", bold_prefix="Phase C (Student 2 Submission): ")
add_bullet_p(doc, "Faculty navigates to `/faculty/assessments` -> 'Plagiarism Analysis' and runs AST comparison.", bold_prefix="Phase D (AST Fingerprint Execution): ")
add_bullet_p(doc, "System highlights 92% structural token match between Student 1 & 2; faculty inspects split diff and applies academic dishonesty penalty.", bold_prefix="Phase E (Audit & Enforcement): ")

# -------------------------------------------------------------
# SECTION 5: MASTER MANUAL TEST EXECUTION MATRIX
# -------------------------------------------------------------
add_heading_styled(doc, "Section 5: Master Manual Test Execution Matrix & Sign-Off", level=1)
add_body_p(doc, "Use this master checklist to record testing progress, test engineer initials, execution dates, and pass/fail verdicts.")

matrix_tbl = doc.add_table(rows=1, cols=6)
col_w_mat = [0.9, 2.3, 1.1, 0.9, 0.9, 0.9]
headers_mat = ["TC ID", "Feature & Scenario Name", "Target Role", "Priority", "Status", "Sign-Off"]

test_cases_master = [
    ["TC-ADM-001", "Authorized Roster CSV Bulk Import", "SUPER_ADMIN", "P0", "[  ] Pass", ""],
    ["TC-ADM-002", "CSV Malformed Record Diagnostics", "SUPER_ADMIN", "P1", "[  ] Pass", ""],
    ["TC-ADM-003", "Institute & Dept Hierarchy Config", "SUPER_ADMIN", "P2", "[  ] Pass", ""],
    ["TC-ADM-004", "Global Settings & System Audit Logs", "SUPER_ADMIN", "P2", "[  ] Pass", ""],
    ["TC-AUTH-001", "Domain Enforcement (@charusat.edu.in)", "ANONYMOUS", "P0", "[  ] Pass", ""],
    ["TC-AUTH-002", "Non-Roster Registration Rejection", "ANONYMOUS", "P0", "[  ] Pass", ""],
    ["TC-AUTH-003", "Student OTP Verification & Locked Fields", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-AUTH-004", "RBAC & Route Guard Security Intercept", "ALL ROLES", "P0", "[  ] Pass", ""],
    ["TC-AUTH-005", "User Profile Updates & Password Reset", "ALL ROLES", "P2", "[  ] Pass", ""],
    ["TC-STU-001", "Recharts Dynamic Learning Curve", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-STU-002", "Interactive Practice & Instant Feedback", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-STU-003", "EWMA Knowledge Model Recalculation", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-STU-004", "AI Socratic Learning Tutor Chat", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-STU-005", "Target Placement Role Radar Benchmark", "STUDENT", "P2", "[  ] Pass", ""],
    ["TC-STU-006", "Student Leaderboard & XP Gamification", "STUDENT", "P2", "[  ] Pass", ""],
    ["TC-CODE-001", "Monaco Editor & Multi-Language Setup", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-CODE-002", "Custom Input Sandbox Execution", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-CODE-003", "Automated Judge (Sample & Hidden Cases)", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-CODE-004", "Judge Telemetry (Runtime & Peak RAM)", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-CODE-005", "Judge Faults: TLE, CE, Runtime Exception", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-PROC-001", "Webcam Face Enrollment Baseline", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-PROC-002", "Fullscreen Lockdown & Tab-Switch Alert", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-PROC-003", "AI Missing & Multiple Face Detection", "STUDENT", "P1", "[  ] Pass", ""],
    ["TC-PROC-004", "Auto-Submission on Countdown Expiry", "STUDENT", "P0", "[  ] Pass", ""],
    ["TC-FAC-001", "Class Topic Mastery Heatmap Analytics", "FACULTY", "P1", "[  ] Pass", ""],
    ["TC-FAC-002", "Question Bank Management & Tagging", "FACULTY", "P1", "[  ] Pass", ""],
    ["TC-FAC-003", "AI Question Generator + Faculty Approval", "FACULTY", "P0", "[  ] Pass", ""],
    ["TC-FAC-004", "Assessment Scheduling & Proctor Policy", "FACULTY", "P0", "[  ] Pass", ""],
    ["TC-FAC-005", "Live Invigilation Console & Warning Popups", "FACULTY", "P0", "[  ] Pass", ""],
    ["TC-FAC-006", "Student Dispute Ticket Review Workflow", "FACULTY", "P2", "[  ] Pass", ""],
    ["TC-PLAG-001", "AST Winnowing Fingerprint Engine", "FACULTY", "P1", "[  ] Pass", ""],
    ["TC-PLAG-002", "Split View Structural Diff & Penalty Flag", "FACULTY", "P1", "[  ] Pass", ""],
    ["TC-CNS-001", "Strict Counsellor Mentee Scoping Isolation", "COUNSELLOR", "P0", "[  ] Pass", ""],
    ["TC-CNS-002", "Mentee At-Risk Early Warning Flags", "COUNSELLOR", "P1", "[  ] Pass", ""],
    ["TC-CNS-003", "Intervention Session Notes & Remedials", "COUNSELLOR", "P1", "[  ] Pass", ""],
    ["TC-HOD-001", "Department Curriculum Health Benchmarks", "HOD", "P1", "[  ] Pass", ""],
    ["TC-HOD-002", "Division Comparison & Faculty Coverage", "HOD", "P2", "[  ] Pass", ""],
    ["TC-HEAD-001", "Institutional Macro KPIs & NBA/NAAC Metrics", "HEAD", "P2", "[  ] Pass", ""]
]
format_table(matrix_tbl, col_w_mat, headers_mat, test_cases_master)

# -------------------------------------------------------------
# SECTION 6: DEFECT CLASSIFICATION & BUG TEMPLATE
# -------------------------------------------------------------
add_heading_styled(doc, "Section 6: Defect Classification & Incident Reporting Standard", level=1)
add_body_p(doc, "When a test step fails or unexpected behavior is observed, log the issue using the standard classification hierarchy and defect report structure below:")

bug_cat_tbl = doc.add_table(rows=1, cols=4)
col_w_bug = [1.2, 1.4, 2.4, 1.8]
headers_bug = ["Severity Level", "Impact Level", "Definition & Criteria", "Example Scenario"]
format_table(bug_cat_tbl, col_w_bug, headers_bug, [
    ["Critical (P0)", "Blocker", "System crash, database corruption, security breach, unauthorized data leak, or total failure of core workflow with no workaround.", "Student can view other students' exams or access admin portal without credentials."],
    ["High (P1)", "Major Feature Failure", "Primary feature does not function according to specification; core business logic produces incorrect calculations.", "EWMA mastery formula does not update after 5 practice submissions."],
    ["Medium (P2)", "Functional Non-Blocker", "Feature works partially or displays unexpected UI glitch; workaround exists; non-critical edge case failure.", "Recharts tooltip alignment is offset on mobile screen resolution."],
    ["Low (P3)", "Cosmetic / Minor", "Spelling error, minor styling misalignment, font mismatch, or subtle animation delay that does not impact functional integrity.", "Typo in diagnostic feedback explanation header."]
])

doc.add_paragraph().paragraph_format.space_after = Pt(6)

add_heading_styled(doc, "6.1 Standard QA Defect Report Template", level=2)
add_bullet_p(doc, "[Module / Role] Brief summary of unexpected behavior", bold_prefix="Defect Title: ")
add_bullet_p(doc, "Critical (P0) / High (P1) / Medium (P2) / Low (P3)", bold_prefix="Severity Level: ")
add_bullet_p(doc, "Local Dev (Win11 / Chrome 124 / Node 20 / MySQL 8.0)", bold_prefix="Test Environment: ")
add_bullet_p(doc, "Exact user role, URL, and test data state prior to step 1", bold_prefix="Preconditions: ")
add_bullet_p(doc, "Numbered 1, 2, 3 sequence of user clicks and inputs", bold_prefix="Steps to Reproduce: ")
add_bullet_p(doc, "What the system should have done per specification", bold_prefix="Expected Result: ")
add_bullet_p(doc, "What the system actually did (including error codes)", bold_prefix="Actual Result: ")
add_bullet_p(doc, "API server logs, browser DevTools console output, screenshot", bold_prefix="Evidence / Logs: ")

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "CLIAS_Manual_Testing_Guide_And_Flow.docx")
doc.save(output_path)
print(f"Document successfully created and saved at: {output_path}")
