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

# ==============================================================================
# Phase 6: AI-Assisted Assessment Generation
# ==============================================================================

class QuestionOptionModel(BaseModel):
    text: str
    is_correct: bool
    misconception_tag: Optional[str] = None

class GeneratedQuestionModel(BaseModel):
    question_text: str
    options: List[QuestionOptionModel]
    explanation: str
    bloom_level: str
    difficulty: str
    pedagogical_rationale: str

class GenerateQuestionsRequest(BaseModel):
    topic: str
    course_code: str = "CS301"
    bloom_level: str = "APPLY"
    difficulty: str = "MEDIUM"
    count: int = 3
    syllabus_context: Optional[str] = None

class GenerateQuestionsResponse(BaseModel):
    topic: str
    course_code: str
    bloom_level: str
    difficulty: str
    questions: List[GeneratedQuestionModel]

QUESTION_BANK_TEMPLATES = {
    "arrays": [
        GeneratedQuestionModel(
            question_text="Consider a circular queue implemented using a static array of size N with front and rear indices. Under what condition is the queue strictly full?",
            options=[
                QuestionOptionModel(text="(rear + 1) % N == front", is_correct=True),
                QuestionOptionModel(text="rear == front", is_correct=False, misconception_tag="Confusing empty queue with full queue"),
                QuestionOptionModel(text="rear == N - 1", is_correct=False, misconception_tag="Overlooking circular wrap-around semantics"),
                QuestionOptionModel(text="(front + 1) % N == rear", is_correct=False, misconception_tag="Inverting front and rear index progression"),
            ],
            explanation="In a circular queue with array length N, one slot is intentionally preserved to disambiguate full from empty state. A queue is full when the next position of rear wraps around to meet front: (rear + 1) % N == front.",
            bloom_level="ANALYZE",
            difficulty="MEDIUM",
            pedagogical_rationale="Tests architectural boundary handling and modular arithmetic in circular buffer structures."
        ),
        GeneratedQuestionModel(
            question_text="Given an unsorted array of N elements, what is the optimal worst-case time complexity to find the K-th smallest element without fully sorting?",
            options=[
                QuestionOptionModel(text="O(N) using Median of Medians (Quickselect)", is_correct=True),
                QuestionOptionModel(text="O(N log N) using Quicksort", is_correct=False, misconception_tag="Sub-optimal full sort selection"),
                QuestionOptionModel(text="O(K log N) using a min-heap", is_correct=False, misconception_tag="Assuming heap is optimal worst-case"),
                QuestionOptionModel(text="O(1) using direct address table", is_correct=False, misconception_tag="Assuming unbound index space"),
            ],
            explanation="The Quickselect algorithm paired with Median of Medians partitioning guarantees linear O(N) time in the strict worst case.",
            bloom_level="EVALUATE",
            difficulty="HARD",
            pedagogical_rationale="Evaluates knowledge of partition-based selection versus comparison-based sorting bounds."
        )
    ],
    "trees": [
        GeneratedQuestionModel(
            question_text="In an AVL tree with height H, what is the maximum permissible difference between the heights of the left and right subtrees of any node?",
            options=[
                QuestionOptionModel(text="At most 1", is_correct=True),
                QuestionOptionModel(text="At most 2", is_correct=False, misconception_tag="Confusing Red-Black black-height with AVL balance factor"),
                QuestionOptionModel(text="Strictly 0", is_correct=False, misconception_tag="Confusing AVL with perfectly complete binary trees"),
                QuestionOptionModel(text="At most log2(H)", is_correct=False, misconception_tag="Miscalculating balance factor invariants"),
            ],
            explanation="An AVL tree enforces a balance factor BF = height(left) - height(right) in {-1, 0, 1} for every internal and root node.",
            bloom_level="REMEMBER",
            difficulty="EASY",
            pedagogical_rationale="Verifies recall of the fundamental balancing invariant of self-balancing binary search trees."
        )
    ]
}

@app.post("/api/v1/ai/generate-questions", response_model=GenerateQuestionsResponse)
def generate_questions(req: GenerateQuestionsRequest):
    """
    Generates curriculum-grounded assessment questions tailored to Bloom's taxonomy level and difficulty.
    """
    topic_key = req.topic.lower()
    matched_questions = []

    for k, q_list in QUESTION_BANK_TEMPLATES.items():
        if k in topic_key:
            matched_questions.extend(q_list)

    if not matched_questions:
        # Grounded generative fallback
        matched_questions = [
            GeneratedQuestionModel(
                question_text=f"Which of the following statements is mathematically sound regarding the time-space trade-offs in {req.topic} under {req.bloom_level} evaluation?",
                options=[
                    QuestionOptionModel(text=f"The operation executes within optimal asymptotic time by leveraging disciplined structural invariants.", is_correct=True),
                    QuestionOptionModel(text=f"The memory consumption scales exponentially with input size N.", is_correct=False, misconception_tag="Over-estimating space complexity"),
                    QuestionOptionModel(text=f"The execution time degrades to O(N!) in standard cases.", is_correct=False, misconception_tag="Confusing polynomial with factorial complexity"),
                    QuestionOptionModel(text=f"No auxiliary space is required regardless of recursion depth.", is_correct=False, misconception_tag="Ignoring call-stack memory footprint"),
                ],
                explanation=f"When analyzing {req.topic}, proper invariant enforcement bounds time complexity while recursion stacks demand explicit O(H) auxiliary space.",
                bloom_level=req.bloom_level,
                difficulty=req.difficulty,
                pedagogical_rationale=f"Evaluates analytical reasoning and formal asymptotic characterization in {req.topic}."
            )
        ]

    return GenerateQuestionsResponse(
        topic=req.topic,
        course_code=req.course_code,
        bloom_level=req.bloom_level,
        difficulty=req.difficulty,
        questions=matched_questions[:req.count]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
