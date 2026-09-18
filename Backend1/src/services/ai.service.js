const { GoogleGenAI, Type } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")


// ======================================================
// GEMINI CLIENT
// ======================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


// ======================================================
// ZOD SCHEMA
// Used to validate Gemini's final response
// ======================================================

const interviewReportSchema = z.object({

    title: z
        .string()
        .describe("Short job-specific title for the interview preparation plan."),

    matchScore: z
        .number()
        .min(0)
        .max(100)
        .describe("Candidate-job match score from 0 to 100."),

    technicalQuestions: z.array(
        z.object({
            question: z
                .string()
                .describe("Technical interview question."),

            intention: z
                .string()
                .describe("What the interviewer is trying to evaluate."),

            answer: z
                .string()
                .describe("A strong sample answer.")
        })
    ),

    behavioralQuestions: z.array(
        z.object({
            question: z
                .string()
                .describe("Behavioral interview question."),

            intention: z
                .string()
                .describe("What the interviewer is trying to evaluate."),

            answer: z
                .string()
                .describe("A strong sample answer.")
        })
    ),

    skillGap: z.array(
        z.object({
            skill: z
                .string()
                .describe("Skill the candidate should improve."),

            severity: z
                .enum(["low", "medium", "high"])
                .describe("Importance of the skill gap.")
        })
    ),

    preparationPlan: z.array(
        z.object({
            day: z
                .number()
                .describe("Preparation day number."),

            focus: z
                .string()
                .describe("Main focus for this day."),

            tasks: z
                .array(z.string())
                .describe("Tasks to complete on this day.")
        })
    )
})


// ======================================================
// GEMINI NATIVE RESPONSE SCHEMA
//
// IMPORTANT:
// Do NOT use zodToJsonSchema here.
// Gemini receives its own native schema.
// ======================================================

const interviewGeminiSchema = {

    type: Type.OBJECT,

    properties: {

        title: {
            type: Type.STRING,
            description:
                "A short job-specific title for this interview preparation plan."
        },

        matchScore: {
            type: Type.NUMBER,
            description:
                "Candidate-job match score from 0 to 100."
        },

        technicalQuestions: {
            type: Type.ARRAY,

            description:
                "Array of technical interview question objects.",

            items: {

                type: Type.OBJECT,

                properties: {

                    question: {
                        type: Type.STRING,
                        description:
                            "Technical interview question."
                    },

                    intention: {
                        type: Type.STRING,
                        description:
                            "What the interviewer is trying to evaluate."
                    },

                    answer: {
                        type: Type.STRING,
                        description:
                            "Strong sample answer to the question."
                    }
                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        behavioralQuestions: {
            type: Type.ARRAY,

            description:
                "Array of behavioral interview question objects.",

            items: {

                type: Type.OBJECT,

                properties: {

                    question: {
                        type: Type.STRING,
                        description:
                            "Behavioral interview question."
                    },

                    intention: {
                        type: Type.STRING,
                        description:
                            "What the interviewer is trying to evaluate."
                    },

                    answer: {
                        type: Type.STRING,
                        description:
                            "Strong sample answer to the question."
                    }
                },

                required: [
                    "question",
                    "intention",
                    "answer"
                ]
            }
        },

        skillGap: {
            type: Type.ARRAY,

            description:
                "Skills the candidate needs to improve.",

            items: {

                type: Type.OBJECT,

                properties: {

                    skill: {
                        type: Type.STRING,
                        description:
                            "Skill that needs improvement."
                    },

                    severity: {
                        type: Type.STRING,

                        enum: [
                            "low",
                            "medium",
                            "high"
                        ],

                        description:
                            "Severity of the skill gap."
                    }
                },

                required: [
                    "skill",
                    "severity"
                ]
            }
        },

        preparationPlan: {
            type: Type.ARRAY,

            description:
                "Day-by-day personalized interview preparation plan.",

            items: {

                type: Type.OBJECT,

                properties: {

                    day: {
                        type: Type.NUMBER,
                        description:
                            "Preparation day number."
                    },

                    focus: {
                        type: Type.STRING,
                        description:
                            "Main focus of this preparation day."
                    },

                    tasks: {
                        type: Type.ARRAY,

                        description:
                            "Tasks to complete during this day.",

                        items: {
                            type: Type.STRING
                        }
                    }
                },

                required: [
                    "day",
                    "focus",
                    "tasks"
                ]
            }
        }
    },

    required: [
        "title",
        "matchScore",
        "technicalQuestions",
        "behavioralQuestions",
        "skillGap",
        "preparationPlan"
    ]
}


// ======================================================
// GENERATE INTERVIEW REPORT
// ======================================================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    try {

        // ----------------------------------------------
        // Validate input
        // ----------------------------------------------

        if (!resume) {
            throw new Error("Resume content is required")
        }

        if (!jobDescription) {
            throw new Error("Job description is required")
        }

        if (!selfDescription) {
            throw new Error("Self description is required")
        }


        // ----------------------------------------------
        // Prompt
        // ----------------------------------------------

        const prompt = `

You are an expert technical interviewer and career coach.

Analyze the candidate's resume, self-description, and the provided job description.

Generate a personalized interview preparation report.

========================
JOB DESCRIPTION
========================

${jobDescription}

========================
CANDIDATE SELF DESCRIPTION
========================

${selfDescription}

========================
RESUME
========================

${resume}

========================
OUTPUT REQUIREMENTS
========================

Return ONLY valid JSON matching the provided response schema.

IMPORTANT:

1. "title" must be a SHORT string describing the job/interview preparation plan.

2. "matchScore" must be a NUMBER between 0 and 100.

3. "technicalQuestions" MUST be an ARRAY OF OBJECTS.

Every technical question object MUST contain exactly:

{
    "question": "string",
    "intention": "string",
    "answer": "string"
}

4. "behavioralQuestions" MUST be an ARRAY OF OBJECTS.

Every behavioral question object MUST contain:

{
    "question": "string",
    "intention": "string",
    "answer": "string"
}

5. "skillGap" MUST be an ARRAY OF OBJECTS.

Every skill gap object MUST contain:

{
    "skill": "string",
    "severity": "low"
}

or:

{
    "skill": "string",
    "severity": "medium"
}

or:

{
    "skill": "string",
    "severity": "high"
}

6. "preparationPlan" MUST be an ARRAY OF OBJECTS.

Every preparation plan object MUST contain:

{
    "day": 1,
    "focus": "string",
    "tasks": [
        "string",
        "string"
    ]
}

7. DO NOT return arrays of plain strings where objects are required.

WRONG:

"technicalQuestions": [
    "What is React?"
]

CORRECT:

"technicalQuestions": [
    {
        "question": "What is React?",
        "intention": "Evaluate understanding of React fundamentals.",
        "answer": "React is a JavaScript library..."
    }
]

WRONG:

"skillGap": [
    "TypeScript"
]

CORRECT:

"skillGap": [
    {
        "skill": "TypeScript",
        "severity": "medium"
    }
]

WRONG:

"preparationPlan": [
    "Learn React"
]

CORRECT:

"preparationPlan": [
    {
        "day": 1,
        "focus": "React fundamentals",
        "tasks": [
            "Review components",
            "Review hooks"
        ]
    }
]

Generate realistic questions based specifically on the candidate's experience and the job description.

Do not invent technologies that are not relevant to the job.

The report should be useful for an entry-level Full Stack Developer interview.

`


        console.log("======================================")
        console.log("GEMINI REQUEST STARTED")
        console.log("======================================")


        // ----------------------------------------------
        // Gemini request
        // ----------------------------------------------

        const response = await ai.models.generateContent({

            model: "gemini-3-flash-preview",

            contents: prompt,

            config: {

                responseMimeType: "application/json",

                responseSchema: interviewGeminiSchema
            }
        })


        // ----------------------------------------------
        // Get Gemini response
        // ----------------------------------------------

        const rawText = response.text

        console.log("======================================")
        console.log("RAW GEMINI RESPONSE")
        console.log("======================================")

        console.log(rawText)


        if (!rawText) {
            throw new Error("Gemini returned an empty response")
        }


        // ----------------------------------------------
        // Parse JSON
        // ----------------------------------------------

        let result

        try {

            result = JSON.parse(rawText)

        } catch (parseError) {

            console.error(
                "GEMINI JSON PARSE ERROR:",
                parseError
            )

            throw new Error(
                "Gemini returned invalid JSON"
            )
        }


        // ----------------------------------------------
        // Debug parsed response
        // ----------------------------------------------

        console.log("======================================")
        console.log("PARSED GEMINI RESPONSE")
        console.log("======================================")

        console.log(
            JSON.stringify(result, null, 2)
        )


        // ----------------------------------------------
        // Zod validation
        // ----------------------------------------------

        const validation =
            interviewReportSchema.safeParse(result)


        if (!validation.success) {

            console.error(
                "======================================"
            )

            console.error(
                "GEMINI RESPONSE VALIDATION ERROR"
            )

            console.error(
                "======================================"
            )

            console.error(
                JSON.stringify(
                    validation.error.issues,
                    null,
                    2
                )
            )

            console.error(
                "INVALID GEMINI RESPONSE:"
            )

            console.error(
                JSON.stringify(
                    result,
                    null,
                    2
                )
            )

            throw new Error(
                "Gemini returned an invalid interview report format"
            )
        }


        console.log("======================================")
        console.log("INTERVIEW REPORT VALIDATED")
        console.log("======================================")


        // ----------------------------------------------
        // Return validated data
        // ----------------------------------------------

        return validation.data


    } catch (error) {

        console.error(
            "======================================"
        )

        console.error(
            "GENERATE INTERVIEW REPORT ERROR"
        )

        console.error(
            "======================================"
        )

        console.error(error)

        throw error
    }
}


// ======================================================
// RESUME PDF SCHEMA
// ======================================================

const resumePdfGeminiSchema = {

    type: Type.OBJECT,

    properties: {

        html: {
            type: Type.STRING,
            description:
                "Complete HTML document for the resume."
        }
    },

    required: [
        "html"
    ]
}


// ======================================================
// GENERATE PDF FROM HTML
// ======================================================

async function generatePdfFromHtml(html) {

    let browser

    try {

        browser = await puppeteer.launch({
            headless: true,

            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        })


        const page = await browser.newPage()


        await page.setContent(
            html,
            {
                waitUntil: "networkidle0"
            }
        )


        const pdfBuffer = await page.pdf({

            format: "A4",

            printBackground: true,

            margin: {
                top: "15mm",
                right: "15mm",
                bottom: "15mm",
                left: "15mm"
            }
        })


        return pdfBuffer


    } finally {

        if (browser) {
            await browser.close()
        }
    }
}


// ======================================================
// GENERATE RESUME PDF
// ======================================================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    try {

        if (!resume) {
            throw new Error("Resume content is required")
        }

        if (!jobDescription) {
            throw new Error("Job description is required")
        }


        const prompt = `

You are an expert professional resume writer.

Create a professional, ATS-friendly resume based on the candidate's existing resume, self-description, and target job description.

IMPORTANT:

- Preserve factual information from the candidate.
- Do not invent companies, jobs, degrees, certifications, or achievements.
- Improve wording and formatting.
- Highlight skills relevant to the target job.
- Use clean professional HTML.
- The HTML must be suitable for converting to a PDF using Puppeteer.
- Do not include markdown.
- Return only the HTML inside the JSON "html" field.

========================
TARGET JOB DESCRIPTION
========================

${jobDescription}

========================
CANDIDATE SELF DESCRIPTION
========================

${selfDescription}

========================
EXISTING RESUME
========================

${resume}

Create a clean one-page professional resume where possible.

`


        console.log("======================================")
        console.log("GENERATING RESUME PDF HTML")
        console.log("======================================")


        const response =
            await ai.models.generateContent({

                model: "gemini-3-flash-preview",

                contents: prompt,

                config: {

                    responseMimeType:
                        "application/json",

                    responseSchema:
                        resumePdfGeminiSchema
                }
            })


        const rawText = response.text


        if (!rawText) {
            throw new Error(
                "Gemini returned an empty resume response"
            )
        }


        console.log("RAW RESUME GEMINI RESPONSE:")
        console.log(rawText)


        let result

        try {

            result = JSON.parse(rawText)

        } catch (error) {

            console.error(
                "RESUME JSON PARSE ERROR:",
                error
            )

            throw new Error(
                "Gemini returned invalid resume JSON"
            )
        }


        // ----------------------------------------------
        // Validate HTML
        // ----------------------------------------------

        if (
            !result ||
            typeof result.html !== "string" ||
            result.html.trim() === ""
        ) {

            throw new Error(
                "Gemini returned invalid resume HTML"
            )
        }


        // ----------------------------------------------
        // Generate PDF
        // ----------------------------------------------

        const pdfBuffer =
            await generatePdfFromHtml(
                result.html
            )


        return pdfBuffer


    } catch (error) {

        console.error(
            "======================================"
        )

        console.error(
            "GENERATE RESUME PDF ERROR"
        )

        console.error(
            "======================================"
        )

        console.error(error)

        throw error
    }
}
async function generateInterviewPlanPdf({ interviewReport }) {

    try {

        const prompt = `

You are a professional interview preparation document designer.

Create a professional, clean, ATS-friendly HTML document for an interview preparation plan.

The document must contain:

1. Interview Plan Title
2. Match Score
3. Technical Interview Questions
4. Behavioral Interview Questions
5. Skill Gaps
6. Personalized Preparation Road Map

Use the exact information provided below.

Do NOT invent information.

========================
INTERVIEW REPORT
========================

Title:
${interviewReport.title}

Match Score:
${interviewReport.matchScore}%

Technical Questions:
${JSON.stringify(
    interviewReport.technicalQuestions,
    null,
    2
)}

Behavioral Questions:
${JSON.stringify(
    interviewReport.behavioralQuestions,
    null,
    2
)}

Skill Gap:
${JSON.stringify(
    interviewReport.skillGap,
    null,
    2
)}

Preparation Plan:
${JSON.stringify(
    interviewReport.preparationPlan,
    null,
    2
)}

========================
HTML REQUIREMENTS
========================

Create a complete HTML document.

Use:

- A4-friendly layout
- Professional typography
- Clear headings
- Sections
- Cards where appropriate
- Good spacing
- Page-break handling
- Print-friendly CSS

Do not use external images.

Do not use JavaScript.

Return ONLY the HTML inside the JSON "html" field.

`;


        const response =
            await ai.models.generateContent({

                model: "gemini-3-flash-preview",

                contents: prompt,

                config: {

                    responseMimeType:
                        "application/json",

                    responseSchema: {

                        type: Type.OBJECT,

                        properties: {

                            html: {
                                type: Type.STRING,
                                description:
                                    "Complete HTML document for the interview preparation plan."
                            }

                        },

                        required: [
                            "html"
                        ]
                    }
                }
            });


        const rawText = response.text;


        if (!rawText) {

            throw new Error(
                "Gemini returned an empty interview plan PDF response"
            );

        }


        const result = JSON.parse(rawText);


        if (
            !result ||
            typeof result.html !== "string" ||
            result.html.trim() === ""
        ) {

            throw new Error(
                "Gemini returned invalid interview plan HTML"
            );

        }


        const pdfBuffer =
            await generatePdfFromHtml(result.html);


        return pdfBuffer;


    } catch (error) {

        console.error(
            "Generate Interview Plan PDF Error:",
            error
        );

        throw error;
    }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    generateInterviewReport,
    generateResumePdf,
    generateInterviewPlanPdf
}