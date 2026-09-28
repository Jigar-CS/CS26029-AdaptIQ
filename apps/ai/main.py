"""
CLIAS AI Intelligence Microservice
FastAPI service responsible for Socratic tutoring, distractor analysis,
misconception diagnosis, and conversational remediation.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

app = FastAPI(
    title="CLIAS AI Intelligence Microservice",
    description="Adaptive learning, Socratic remediation, and question generation service",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# Request & Response Schemas
# ==============================================================================

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    phase: str
    active_capabilities: List[str]

class SocraticRemediationRequest(BaseModel):
    question_text: str
    topic: str
    course_code: str = "CS301"
    student_selected_option: str
    correct_option: str
    explanation: str

class CodeSnippet(BaseModel):
    language: str
    code: str
    explanation: str

class SocraticRemediationResponse(BaseModel):
    status: str
    topic: str
    distractor_diagnosis: str
    core_theoretical_concept: str
    socratic_prompt: str
    analogy: str
    code_example: CodeSnippet
    suggested_actions: List[str]

class SocraticChatRequest(BaseModel):
    topic: str
    course_code: str = "CS301"
    question_text: str = ""
    user_message: str
    action_type: str = "ASK_FOLLOW_UP"
    conversation_history: List[Dict[str, str]] = []

class SocraticChatResponse(BaseModel):
    reply: str
    action_type: str
    follow_up_prompt: str
    metadata: Dict[str, Any] = {}

class MisconceptionRequest(BaseModel):
    question_text: str
    student_selected_option: str
    correct_option: str
    topic: str = "General"

class MisconceptionResponse(BaseModel):
    misconception_identified: bool
    category: str
    reason: str
    prescribed_remedial_topic: str

# ==============================================================================
# Socratic Knowledge & Heuristics Base
# ==============================================================================

TOPIC_ANALOGIES = {
    "arrays": "Think of an array as numbered hotel rooms next to each other on the 3rd floor. You know room #305 is right next to #304 (instant O(1) address lookup). But to wedge a new room between 302 and 303, you'd have to physically slide all subsequent rooms down the hallway.",
    "linked-lists": "Imagine a scavenger hunt where each note reveals only the location of the next clue. You can easily insert a new clue by changing the note in your hand, but you cannot skip directly to clue #10 without walking through clues 1 through 9.",
    "trees": "Think of an enterprise management chart where every manager directs employees with smaller ID numbers to their left office and higher ID numbers to their right office. Locating any ID eliminates half the staff at every corridor.",
    "dynamic-programming": "If someone asks what '1 + 1 + 1 + 1' equals, you count '4'. If they then add '+ 1', you don't recount from the beginning—you use the stored subproblem answer (4) and add 1 to get 5.",
    "graphs": "Consider an airline route map. BFS visits all direct destination flights from your airport before connecting flights, while DFS picks one connecting path and keeps flying until there are no further layovers.",
}

TOPIC_CODE_EXAMPLES = {
    "arrays": CodeSnippet(
        language="cpp",
        code="// Constant-time index access vs linear insertion\nint arr[5] = {10, 20, 30, 40, 50};\nint val = arr[2]; // O(1) address arithmetic: base + 2 * sizeof(int)",
        explanation="Direct contiguous indexing enables O(1) random access via arithmetic offsets."
    ),
    "trees": CodeSnippet(
        language="python",
        code="def search_bst(node, target):\n    if not node or node.val == target:\n        return node\n    return search_bst(node.left if target < node.val else node.right, target)",
        explanation="The BST invariant guarantees halving the search space at each recursive step (O(log N))."
    ),
    "dynamic-programming": CodeSnippet(
        language="python",
        code="memo = {}\ndef solve(n):\n    if n <= 1: return n\n    if n not in memo:\n        memo[n] = solve(n - 1) + solve(n - 2) # Store subproblem\n    return memo[n]",
        explanation="State memoization eliminates exponential recomputation of overlapping subproblems."
    ),
}

# ==============================================================================
# Endpoints
# ==============================================================================

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="healthy",
        service="CLIAS-AI-Service",
        version="2.0.0",
        phase="Phase 3 AI Learning Assistant Active",
        active_capabilities=[
            "socratic_remediation",
            "distractor_diagnosis",
            "pedagogical_analogy",
            "interactive_chat",
            "misconception_detection"
        ]
    )

@app.post("/api/v1/ai/socratic-remediation", response_model=SocraticRemediationResponse)
def generate_socratic_remediation(req: SocraticRemediationRequest):
    """
    Core Phase 3 Pipeline:
    Analyzes student error, diagnoses chosen distractor, provides Socratic prompt,
    analogy, and grounded university code demonstration.
    """
    topic_key = req.topic.lower()
    found_key = "arrays"
    for k in TOPIC_ANALOGIES:
        if k in topic_key:
            found_key = k
            break

    distractor_diag = (
        f"You selected: \"{req.student_selected_option}\". "
        f"This is a common trap in {req.topic}. "
        f"The distractor fails because the required invariant requires: \"{req.correct_option}\"."
    )

    socratic_prompt = (
        f"Before looking at the final solution, consider: "
        f"What boundary condition or edge case causes \"{req.student_selected_option}\" to break?"
    )

    analogy = TOPIC_ANALOGIES.get(found_key, TOPIC_ANALOGIES["arrays"])
    code_ex = TOPIC_CODE_EXAMPLES.get(found_key, TOPIC_CODE_EXAMPLES["arrays"])

    return SocraticRemediationResponse(
        status="success",
        topic=req.topic,
        distractor_diagnosis=distractor_diag,
        core_theoretical_concept=req.explanation,
        socratic_prompt=socratic_prompt,
        analogy=analogy,
        code_example=code_ex,
        suggested_actions=[
            "EXPLAIN_SIMPLY",
            "REAL_WORLD_EXAMPLE",
            "ASK_FOLLOW_UP",
            "PRACTICE_SIMILAR"
        ]
    )

@app.post("/api/v1/ai/socratic-chat", response_model=SocraticChatResponse)
def socratic_chat(req: SocraticChatRequest):
    """
    Multi-turn interactive dialogue with Socratic tutor agent.
    Never gives raw answers directly; uses guided Socratic questioning.
    """
    topic_key = req.topic.lower()
    user_query = req.user_message.strip()

    if req.action_type == "EXPLAIN_SIMPLY":
        for k, analogy in TOPIC_ANALOGIES.items():
            if k in topic_key:
                reply = f"Here is a beginner-friendly intuition:\n\n{analogy}\n\nDoes this mental model make the mechanics clearer?"
                return SocraticChatResponse(
                    reply=reply,
                    action_type=req.action_type,
                    follow_up_prompt="Would you like to see a real code trace or try a similar problem?"
                )

    if req.action_type == "REAL_WORLD_EXAMPLE":
        for k, code_obj in TOPIC_CODE_EXAMPLES.items():
            if k in topic_key:
                reply = f"Here is the standard university implementation in {code_obj.language}:\n\n```{code_obj.language}\n{code_obj.code}\n```\n\nKey Takeaway: {code_obj.explanation}"
                return SocraticChatResponse(
                    reply=reply,
                    action_type=req.action_type,
                    follow_up_prompt="Notice how memory and execution flow behave here. Ready to test a similar problem?"
                )

    # General Socratic query response
    reply = (
        f"That is an excellent conceptual question regarding {req.topic}. "
        f"When analyzing '{user_query}', observe how asymptotic scaling governs the operation. "
        f"If the data structure grows from N=10 to N=1,000,000, what happens to the number of pointer updates or memory lookups?"
    )

    return SocraticChatResponse(
        reply=reply,
        action_type=req.action_type,
        follow_up_prompt="Think about the loop invariant before writing the next line of code."
    )

@app.post("/api/v1/ai/analyze-misconception", response_model=MisconceptionResponse)
def analyze_misconception(req: MisconceptionRequest):
    """
    Identifies conceptual student errors and maps to curriculum remediation.
    """
    text = req.student_selected_option.lower()
    if "o(n)" in text and "binary search" in req.question_text.lower():
        return MisconceptionResponse(
            misconception_identified=True,
            category="LINEAR_SCAN_BIAS",
            reason="Student confused logarithmic binary partition with linear array traversal.",
            prescribed_remedial_topic="Binary Search & Divide-and-Conquer Invariants"
        )

    return MisconceptionResponse(
        misconception_identified=True,
        category="INVARIANT_OVERLOOKED",
        reason="Selected option violates core boundary condition of the algorithm.",
        prescribed_remedial_topic=f"Curriculum Review: {req.topic}"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
