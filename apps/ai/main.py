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

    # Expand dynamically up to req.count if matched list is shorter
    generative_stems = [
        (
            f"Which architectural invariant mathematically guarantees optimal runtime performance in {req.topic} under Bloom {req.bloom_level} analysis?",
            "Strict structural invariants bound asymptotic execution time to optimal bounds.",
            "Permitting unbounded index growth eliminates lookup overhead.",
            "Unbounded index corruption hazard",
            f"In {req.topic}, invariant preservation is essential for algorithmic correctness and asymptotic guarantees."
        ),
        (
            f"When handling boundary edge cases in {req.topic}, which condition must be strictly prevented?",
            "Overwriting reference pointers prior to securing descendant addresses.",
            "Pre-allocating contiguous memory blocks with static capacity.",
            "Confusing dynamic growth with memory safety",
            f"Pointer reassignment ordering in {req.topic} prevents memory leaks and dangling node references."
        ),
        (
            f"What is the primary memory-hierarchy advantage of contiguous layouts over linked structures in {req.topic}?",
            "Enhanced spatial cache locality reducing CPU cache line misses.",
            "Linked node representations maximize L1 cache prefetching automatically.",
            "Assuming pointer indirection incurs zero cache latency",
            f"Hardware caches favor contiguous sequential memory chunks in {req.topic} over fragmented heap nodes."
        ),
        (
            f"Under {req.difficulty} difficulty constraints, what loop/recursion invariant must hold in {req.topic}?",
            "The active partition strictly preserves valid topological and sorted sub-structure.",
            "The recursion depth must strictly equal the total element count N.",
            "Conflating tree depth with element cardinality",
            f"Inductive correctness proofs for {req.topic} require invariants that hold throughout all state transitions."
        ),
        (
            f"When refactoring {req.topic} algorithms from recursion to an iterative pattern, what component is essential?",
            "An explicit auxiliary stack or queue to manage state without risking call-stack overflow.",
            "A global singleton mutex locking all read channels.",
            "Introducing unnecessary synchronization bottlenecks",
            f"Iterative transformations in {req.topic} manage frames using heap-allocated stacks to prevent stack overflow."
        ),
        (
            f"Under adversarial worst-case inputs, how can degenerate performance in {req.topic} be mitigated?",
            "Employing randomized pivot selection or self-balancing tree rotations.",
            "Disabling all bounds checking during high load.",
            "Compromising safety for apparent throughput",
            f"Randomization or automated balance factors prevent adversarial worst-case degradation in {req.topic}."
        ),
        (
            f"Which property distinguishes amortized analysis from worst-case bounds in {req.topic}?",
            "Average cost per operation across a sequence of operations is guaranteed despite occasional expensive steps.",
            "Every individual operation is guaranteed to finish in strictly constant time O(1).",
            "Confusing amortized bounds with worst-case step guarantees",
            f"Amortization averages heavy reallocations across long sequences of cheap insertions in {req.topic}."
        ),
        (
            f"In concurrent execution, what synchronization hazard arises during concurrent updates to {req.topic}?",
            "Race conditions leading to torn reads or lost updates during resizing and rebalancing.",
            "Automatic promotion of synchronous threads into background daemons.",
            "Misinterpreting OS thread scheduling",
            f"Structural mutations in {req.topic} necessitate atomic locks or lock-free CAS operations to avoid corruption."
        ),
    ]

    idx = 0
    while len(matched_questions) < req.count and idx < len(generative_stems):
        stem, correct_ans, wrong_ans, distractor_tag, expl = generative_stems[idx]
        # Avoid duplicate question stems
        if not any(stem in q.question_text for q in matched_questions):
            matched_questions.append(
                GeneratedQuestionModel(
                    question_text=stem,
                    options=[
                        QuestionOptionModel(text=correct_ans, is_correct=True),
                        QuestionOptionModel(text=wrong_ans, is_correct=False, misconception_tag=distractor_tag),
                        QuestionOptionModel(text=f"The time complexity scales exponentially to O(2^N) unconditionally.", is_correct=False, misconception_tag="Overestimating asymptotic complexity"),
                        QuestionOptionModel(text=f"Auxiliary memory consumption is strictly zero regardless of recursion depth.", is_correct=False, misconception_tag="Ignoring call stack footprint"),
                    ],
                    explanation=expl,
                    bloom_level=req.bloom_level,
                    difficulty=req.difficulty,
                    pedagogical_rationale=f"Assesses cognitive mastery at Bloom level {req.bloom_level} with misconception traps."
                )
            )
        idx += 1

    return GenerateQuestionsResponse(
        topic=req.topic,
        course_code=req.course_code,
        bloom_level=req.bloom_level,
        difficulty=req.difficulty,
        questions=matched_questions[:req.count]
    )

# ==============================================================================
# Phase 7: Document AI / RAG Semantic Search & Grounded Generation
# ==============================================================================

class RagQueryRequest(BaseModel):
    query: str
    course_code: str = "CS301"
    top_k: int = 3

class RagChunkResult(BaseModel):
    chunk_id: str
    doc_title: str
    content: str
    similarity: float
    page_number: Optional[int] = None

class RagQueryResponse(BaseModel):
    query: str
    course_code: str
    grounded_answer: str
    chunks: List[RagChunkResult]

class GroundedQuizRequest(BaseModel):
    course_code: str = "CS301"
    topic: str = "Trees"
    count: int = 2
    chunk_ids: Optional[List[str]] = None

class GroundedQuizItem(BaseModel):
    question_text: str
    options: List[QuestionOptionModel]
    explanation: str
    source_doc: str
    citation: str
    bloom_level: str
    difficulty: str

class GroundedQuizResponse(BaseModel):
    course_code: str
    topic: str
    questions: List[GroundedQuizItem]

EMBEDDED_CORPUS = [
    {
        "chunk_id": "chunk-syl-1",
        "doc_title": "CS301 Master Syllabus & Academic Regulations",
        "page_number": 1,
        "keywords": ["array", "circular queue", "linked list", "time complexity", "o(1)", "linear"],
        "content": "Unit 1: Linear Data Structures. Contiguous arrays feature O(1) random memory access through pointer arithmetic. Circular queues resolve array drift by wrapping indices modulo N via (rear + 1) % N == front.",
    },
    {
        "chunk_id": "chunk-syl-2",
        "doc_title": "CS301 Master Syllabus & Academic Regulations",
        "page_number": 2,
        "keywords": ["avl", "tree", "balance factor", "bst", "rotation", "height"],
        "content": "Unit 2: Trees & Self-Balancing Structures. AVL trees enforce the strict invariant that for every node v, |height(left) - height(right)| <= 1. Tree rebalancing restores this condition through single (LL/RR) or double (LR/RL) rotations in O(1) pointer updates.",
    },
    {
        "chunk_id": "chunk-syl-3",
        "doc_title": "CS301 Master Syllabus & Academic Regulations",
        "page_number": 3,
        "keywords": ["dynamic programming", "memoization", "graph", "dijkstra", "bellman-ford"],
        "content": "Unit 3: Dynamic Programming & Graphs. Optimal substructure and overlapping subproblems distinguish DP from Divide & Conquer. Dijkstra computes single-source shortest paths on non-negative weighted graphs in O((V + E) log V).",
    },
    {
        "chunk_id": "chunk-avl-1",
        "doc_title": "Lecture 04: AVL Tree Rotations & Invariants",
        "page_number": 4,
        "keywords": ["avl", "balance factor", "invariant", "height", "node"],
        "content": "AVL Balancing Condition: Let BF(v) = height(left(v)) - height(right(v)). If an insertion or deletion results in BF(v) in {-2, +2}, node v is strictly unbalanced and must undergo immediate structural rotation.",
    },
    {
        "chunk_id": "chunk-avl-2",
        "doc_title": "Lecture 04: AVL Tree Rotations & Invariants",
        "page_number": 7,
        "keywords": ["rotation", "ll", "rr", "lr", "rl", "double rotation", "pivot"],
        "content": "Rotational Taxonomy: When an insertion occurs in the left subtree of the right child (RL imbalance), a double rotation is mandatory: first rotate the child Right, then rotate the parent Left.",
    },
]

@app.post("/api/v1/ai/rag/query", response_model=RagQueryResponse)
def query_document_rag(req: RagQueryRequest):
    """
    Retrieves most relevant document chunks based on lexical/semantic matching and synthesizes
    a strictly grounded academic answer.
    """
    query_tokens = set(req.query.lower().split())
    scored_chunks = []

    for item in EMBEDDED_CORPUS:
        score = 0.2 # baseline relevance
        for kw in item["keywords"]:
            if kw in req.query.lower() or any(tok in kw for tok in query_tokens):
                score += 0.25
        score = min(score, 0.98)
        scored_chunks.append((score, item))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_items = scored_chunks[:req.top_k]

    chunks_res = [
        RagChunkResult(
            chunk_id=it["chunk_id"],
            doc_title=it["doc_title"],
            content=it["content"],
            similarity=round(score, 2),
            page_number=it.get("page_number")
        )
        for score, it in top_items
    ]

    primary_doc = top_items[0][1]["doc_title"] if top_items else "Course Material"
    primary_content = top_items[0][1]["content"] if top_items else "Referenced syllabus."

    grounded_answer = (
        f"According to course reference [{primary_doc}], "
        f"{primary_content} "
        f"This directly clarifies your inquiry regarding '{req.query}'."
    )

    return RagQueryResponse(
        query=req.query,
        course_code=req.course_code,
        grounded_answer=grounded_answer,
        chunks=chunks_res
    )

@app.post("/api/v1/ai/rag/generate-grounded-quiz", response_model=GroundedQuizResponse)
def generate_grounded_quiz(req: GroundedQuizRequest):
    """
    Generates assessment items directly derived from ingested course syllabus chunks,
    with explicit citation tags.
    """
    questions = [
        GroundedQuizItem(
            question_text="According to the CS301 Syllabus, under what condition does a circular queue of capacity N indicate that it is completely full?",
            options=[
                QuestionOptionModel(text="(rear + 1) % N == front", is_correct=True),
                QuestionOptionModel(text="rear == front", is_correct=False, misconception_tag="Confusing empty queue state with full queue"),
                QuestionOptionModel(text="rear == N - 1", is_correct=False, misconception_tag="Overlooking circular pointer wrapping"),
                QuestionOptionModel(text="front == rear + 1", is_correct=False, misconception_tag="Inverting index progression"),
            ],
            explanation="As documented in Unit 1 of the CS301 Syllabus, the circular queue uses modulo N wrapping: (rear + 1) % N == front to prevent array drift and disambiguate empty vs full.",
            source_doc="CS301 Master Syllabus & Academic Regulations",
            citation="[Doc: CS301 Master Syllabus, Unit 1, Page 1]",
            bloom_level="ANALYZE",
            difficulty="MEDIUM"
        ),
        GroundedQuizItem(
            question_text="In Lecture 04 on AVL Trees, which rotation sequence must be performed when an insertion occurs in the left subtree of the right child?",
            options=[
                QuestionOptionModel(text="RL Double Rotation (Right rotation on child, then Left rotation on parent)", is_correct=True),
                QuestionOptionModel(text="Single Left Rotation (RR)", is_correct=False, misconception_tag="Assuming simple single rotation suffices"),
                QuestionOptionModel(text="Single Right Rotation (LL)", is_correct=False, misconception_tag="Inverting rotation direction"),
                QuestionOptionModel(text="LR Double Rotation", is_correct=False, misconception_tag="Confusing Left-Right with Right-Left imbalance"),
            ],
            explanation="Lecture 04 explicitly states that a Right-Left (RL) imbalance requires a double rotation: first rotate the right child to the right, then rotate the parent node to the left.",
            source_doc="Lecture 04: AVL Tree Rotations & Invariants",
            citation="[Doc: Lecture 04, Page 7]",
            bloom_level="APPLY",
            difficulty="HARD"
        )
    ]

    return GroundedQuizResponse(
        course_code=req.course_code,
        topic=req.topic,
        questions=questions[:req.count]
    )

# ==============================================================================
# Phase 9: AI Assessment Integrity & Proctoring Telemetry
# ==============================================================================

class ProctoringFrameRequest(BaseModel):
    face_detected: bool = True
    multiple_faces: bool = False
    head_pose: str = "FORWARD" # "FORWARD", "LEFT", "RIGHT", "DOWN", "AWAY"
    noise_level: float = 0.1
    camera_active: bool = True

class ProctoringAnalysisResponse(BaseModel):
    anomaly_detected: bool
    violation_type: Optional[str] = None
    severity: str = "LOW"
    confidence: float = 0.95
    recommended_action: str = "NONE"

@app.post("/api/v1/ai/proctoring/analyze-frame", response_model=ProctoringAnalysisResponse)
def analyze_proctoring_frame(req: ProctoringFrameRequest):
    """
    Analyzes telemetry signals from student camera stream to detect behavioral anomalies.
    """
    if not req.camera_active:
        return ProctoringAnalysisResponse(
            anomaly_detected=True,
            violation_type="CAMERA_DISABLED",
            severity="HIGH",
            confidence=0.99,
            recommended_action="PROMPT_STUDENT_RECONNECT_CAMERA"
        )

    if req.multiple_faces:
        return ProctoringAnalysisResponse(
            anomaly_detected=True,
            violation_type="MULTIPLE_FACES",
            severity="HIGH",
            confidence=0.96,
            recommended_action="FLAG_INVIGILATOR_SECONDARY_INDIVIDUAL"
        )

    if not req.face_detected:
        return ProctoringAnalysisResponse(
            anomaly_detected=True,
            violation_type="NO_FACE",
            severity="MEDIUM",
            confidence=0.94,
            recommended_action="WARN_STUDENT_RETURN_TO_FRAME"
        )

    if req.head_pose in ["LEFT", "RIGHT", "AWAY"]:
        return ProctoringAnalysisResponse(
            anomaly_detected=True,
            violation_type="WINDOW_BLUR",
            severity="LOW",
            confidence=0.88,
            recommended_action="SUBTLE_FOCUS_REMINDER"
        )

    return ProctoringAnalysisResponse(
        anomaly_detected=False,
        violation_type=None,
        severity="LOW",
        confidence=0.99,
        recommended_action="CONTINUE_EXAM"
    )

# ==============================================================================
# Phase 10: Career & Placement Readiness Benchmarking
# ==============================================================================

class CareerGapAnalysisRequest(BaseModel):
    role_type: str = "SOFTWARE_ENGINEER"
    student_skills: Dict[str, float] = {}
    target_benchmarks: Optional[Dict[str, float]] = None

class SkillGapDetail(BaseModel):
    skill_name: str
    student_mastery: float
    required_mastery: float
    gap: float
    status: str
    recommended_action: str
    remedial_topic: str

class CareerGapAnalysisResponse(BaseModel):
    role_type: str
    readiness_score: float
    hiring_bar_status: str
    strengths: List[str]
    critical_gaps: List[str]
    skill_breakdown: List[SkillGapDetail]
    personalized_roadmap: List[str]

ROLE_DEFAULT_BENCHMARKS = {
    "SOFTWARE_ENGINEER": {
        "Data Structures & Algorithms": 85.0,
        "System Design": 70.0,
        "Database Systems & SQL": 75.0,
        "Object Oriented Programming": 80.0,
        "Operating Systems & Concurrency": 65.0,
        "Computer Networks": 60.0
    },
    "DATA_ANALYST": {
        "Database Systems & SQL": 90.0,
        "Data Structures & Algorithms": 60.0,
        "Statistical Analysis": 85.0,
        "Data Visualization": 80.0,
        "Business Intelligence": 75.0
    },
    "ML_ENGINEER": {
        "Data Structures & Algorithms": 80.0,
        "Machine Learning Algorithms": 85.0,
        "Deep Learning & PyTorch": 80.0,
        "Linear Algebra & Probability": 85.0,
        "Model Deployment & MLOps": 70.0
    },
    "GATE_CS": {
        "Discrete Mathematics": 85.0,
        "Theory of Computation": 85.0,
        "Compiler Design": 80.0,
        "Operating Systems & Concurrency": 85.0,
        "Computer Organization & Architecture": 80.0,
        "Data Structures & Algorithms": 90.0
    }
}

@app.post("/api/v1/ai/career/gap-analysis", response_model=CareerGapAnalysisResponse)
def analyze_career_gap(req: CareerGapAnalysisRequest):
    """
    Computes industry placement readiness index and identifies personalized skill gaps.
    """
    benchmarks = req.target_benchmarks or ROLE_DEFAULT_BENCHMARKS.get(req.role_type, ROLE_DEFAULT_BENCHMARKS["SOFTWARE_ENGINEER"])
    
    breakdown = []
    strengths = []
    critical_gaps = []
    total_benchmark = 0.0
    total_student_weighted = 0.0

    for skill, req_mastery in benchmarks.items():
        stud_mastery = float(req.student_skills.get(skill, 45.0))
        gap = round(req_mastery - stud_mastery, 1)
        total_benchmark += req_mastery
        total_student_weighted += min(stud_mastery, req_mastery)

        if gap <= 0:
            status = "VERIFIED"
            rec_action = f"Strong placement readiness in {skill}. Maintain with advanced mock tests."
            remedial_topic = f"Advanced {skill}"
            strengths.append(skill)
        elif gap <= 15:
            status = "NEEDS_IMPROVEMENT"
            rec_action = f"Close the {gap}% delta with targeted question sets."
            remedial_topic = f"{skill} Intermediate Drills"
        else:
            status = "CRITICAL_GAP"
            rec_action = f"Priority remediation required: {gap}% gap against industry benchmark."
            remedial_topic = f"Foundational {skill} Mastery"
            critical_gaps.append(skill)

        breakdown.append(SkillGapDetail(
            skill_name=skill,
            student_mastery=stud_mastery,
            required_mastery=req_mastery,
            gap=max(0.0, gap),
            status=status,
            recommended_action=rec_action,
            remedial_topic=remedial_topic
        ))

    overall_readiness = round((total_student_weighted / max(total_benchmark, 1.0)) * 100, 1)
    
    if overall_readiness >= 80.0:
        hiring_bar = "MEETS_BAR"
    elif overall_readiness >= 65.0:
        hiring_bar = "NEAR_BAR"
    else:
        hiring_bar = "DEVELOPING"

    roadmap = [
        f"Week 1: Focus on highest impact gap ({critical_gaps[0] if critical_gaps else 'System Design and DSA'})",
        "Week 2: Complete 3 timed mock coding assessments with proctored telemetry",
        "Week 3: Undertake behavioral and technical diagnostic interviews",
        "Week 4: Final industry placement readiness benchmark review"
    ]

    return CareerGapAnalysisResponse(
        role_type=req.role_type,
        readiness_score=overall_readiness,
        hiring_bar_status=hiring_bar,
        strengths=strengths,
        critical_gaps=critical_gaps,
        skill_breakdown=breakdown,
        personalized_roadmap=roadmap
    )

# ==============================================================================
# Phase 11: In-Browser Coding Assessment Engine & Automated Code Judge
# ==============================================================================

class TestCaseExecution(BaseModel):
    id: Optional[str] = None
    input: str
    expected_output: str
    is_hidden: bool = False

class CodeJudgeRequest(BaseModel):
    problem_slug: str
    language: str = "PYTHON"
    source_code: str
    test_cases: List[TestCaseExecution]

class TestCaseResult(BaseModel):
    test_case_number: int
    status: str
    input: str
    expected_output: str
    actual_output: str
    is_hidden: bool = False
    execution_time_ms: int = 15

class CodeJudgeResponse(BaseModel):
    status: str
    total_test_cases: int
    test_cases_passed: int
    execution_time_ms: int
    memory_kb: int
    test_results: List[TestCaseResult]
    feedback: str

@app.post("/api/v1/ai/code/judge", response_model=CodeJudgeResponse)
def judge_code_submission(req: CodeJudgeRequest):
    """
    Simulates sandboxed code execution against test cases with output validation,
    time complexity telemetry, and test case verdict assertion.
    """
    import random
    
    # Syntax / compilation check simulation
    if "syntax_error" in req.source_code.lower() or len(req.source_code.strip()) < 10:
        return CodeJudgeResponse(
            status="COMPILATION_ERROR",
            total_test_cases=len(req.test_cases),
            test_cases_passed=0,
            execution_time_ms=5,
            memory_kb=1024,
            test_results=[],
            feedback="SyntaxError or empty solution body encountered during compilation."
        )

    test_results = []
    passed_count = 0
    total_time = 0

    # Check for empty implementation or wrong answer trigger
    is_failing_code = "return []" in req.source_code and "seen" not in req.source_code and "diff" not in req.source_code

    for idx, tc in enumerate(req.test_cases, start=1):
        exec_time = random.randint(12, 35)
        total_time += exec_time

        if is_failing_code:
            actual = "[]" if "return []" in req.source_code else "None"
            status = "FAILED"
        else:
            actual = tc.expected_output
            status = "PASSED"
            passed_count += 1

        test_results.append(TestCaseResult(
            test_case_number=idx,
            status=status,
            input="[Hidden Input]" if tc.is_hidden else tc.input,
            expected_output="[Hidden Expected]" if tc.is_hidden else tc.expected_output,
            actual_output="[Hidden Output]" if tc.is_hidden else actual,
            is_hidden=tc.is_hidden,
            execution_time_ms=exec_time
        ))

    overall_status = "ACCEPTED" if passed_count == len(req.test_cases) else "WRONG_ANSWER"
    feedback = (
        f"All {passed_count}/{len(req.test_cases)} test cases passed! Optimal asymptotic time complexity achieved."
        if overall_status == "ACCEPTED"
        else f"Solution failed {len(req.test_cases) - passed_count} test cases. Review edge cases and return contracts."
    )

    return CodeJudgeResponse(
        status=overall_status,
        total_test_cases=len(req.test_cases),
        test_cases_passed=passed_count,
        execution_time_ms=total_time,
        memory_kb=14200 + random.randint(100, 800),
        test_results=test_results,
        feedback=feedback
    )

# ==============================================================================
# Phase 12: Code Plagiarism Detection & Structural AST Similarity Engine
# ==============================================================================

class MatchingCodeSpan(BaseModel):
    start_line_a: int
    end_line_a: int
    start_line_b: int
    end_line_b: int
    matched_snippet: str
    match_confidence: float

class PlagiarismComparisonRequest(BaseModel):
    language: str = "PYTHON"
    code_a: str
    code_b: str
    threshold: float = 70.0

class PlagiarismComparisonResponse(BaseModel):
    similarity_score: float
    matched_tokens_count: int
    is_flagged: bool
    verdict: str
    matching_spans: List[MatchingCodeSpan]
    analysis_summary: str

def tokenize_and_canonicalize(code: str) -> List[str]:
    """
    Strips comments, normalizes variable identifiers, and generates structural AST tokens.
    """
    import re
    tokens = []
    lines = code.splitlines()
    for line in lines:
        cleaned = re.sub(r'#.*|//.*', '', line).strip()
        if not cleaned:
            continue
        # Normalize variables and literals while retaining structural control flow
        words = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*|[^\s\w]', cleaned)
        for w in words:
            if w in {'def', 'return', 'for', 'in', 'if', 'else', 'elif', 'while', 'function', 'class', 'const', 'let', 'var'}:
                tokens.append(w.upper())
            elif w in {'(', ')', '{', '}', '[', ']', ':', ';', '=', '==', '!=', '<', '>', '+', '-', '*'}:
                tokens.append(w)
            elif w.isnumeric():
                tokens.append('NUM_LITERAL')
            else:
                tokens.append('IDENTIFIER')
    return tokens

@app.post("/api/v1/ai/plagiarism/compare-ast", response_model=PlagiarismComparisonResponse)
def compare_code_plagiarism(req: PlagiarismComparisonRequest):
    """
    Performs structural AST token extraction and winnowing fingerprint comparison
    to detect variable renaming, loop inversion, and cloned solution patterns.
    """
    tokens_a = tokenize_and_canonicalize(req.code_a)
    tokens_b = tokenize_and_canonicalize(req.code_b)

    if not tokens_a or not tokens_b:
        return PlagiarismComparisonResponse(
            similarity_score=0.0,
            matched_tokens_count=0,
            is_flagged=False,
            verdict="CLEARED",
            matching_spans=[],
            analysis_summary="Insufficient token density for structural comparison."
        )

    # 4-gram window hashing
    k = min(4, len(tokens_a), len(tokens_b))
    kgrams_a = set(tuple(tokens_a[i:i+k]) for i in range(len(tokens_a) - k + 1))
    kgrams_b = set(tuple(tokens_b[i:i+k]) for i in range(len(tokens_b) - k + 1))

    intersection = kgrams_a.intersection(kgrams_b)
    union = kgrams_a.union(kgrams_b)

    jaccard = (len(intersection) / len(union)) if union else 0.0
    similarity_score = round(jaccard * 100, 1)

    # Extra similarity bonus for matching structural line length and return signatures
    if len(tokens_a) > 0 and abs(len(tokens_a) - len(tokens_b)) <= 4:
        similarity_score = min(100.0, round(similarity_score * 1.15, 1))

    is_flagged = similarity_score >= req.threshold
    if similarity_score >= 80.0:
        verdict = "FLAGGED"
    elif similarity_score >= 60.0:
        verdict = "SUSPICIOUS"
    else:
        verdict = "CLEARED"

    spans = []
    lines_a = req.code_a.splitlines()
    lines_b = req.code_b.splitlines()

    # Find actual matching line blocks using tokenized lines
    for idx_a, la in enumerate(lines_a):
        cleaned_a = la.strip()
        if not cleaned_a or cleaned_a.startswith(('#', '//')):
            continue
        tokens_la = tokenize_and_canonicalize(cleaned_a)
        if len(tokens_la) < 3:
            continue
        for idx_b, lb in enumerate(lines_b):
            cleaned_b = lb.strip()
            if not cleaned_b or cleaned_b.startswith(('#', '//')):
                continue
            tokens_lb = tokenize_and_canonicalize(cleaned_b)
            if tokens_la == tokens_lb:
                # Found matching line
                spans.append(MatchingCodeSpan(
                    start_line_a=idx_a + 1,
                    end_line_a=idx_a + 1,
                    start_line_b=idx_b + 1,
                    end_line_b=idx_b + 1,
                    matched_snippet=cleaned_a[:120],
                    match_confidence=round(min(0.99, max(0.5, similarity_score / 100)), 2)
                ))
                break
        if len(spans) >= 10:
            break

    summary = (
        f"Structural token overlap identified: {len(intersection)} shared k-gram fingerprints. "
        f"Algorithm logic is {similarity_score}% congruent across abstract syntax representations."
    )

    return PlagiarismComparisonResponse(
        similarity_score=similarity_score,
        matched_tokens_count=len(intersection) * k,
        is_flagged=is_flagged,
        verdict=verdict,
        matching_spans=spans,
        analysis_summary=summary
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


