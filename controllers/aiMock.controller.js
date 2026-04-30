import Application from "../models/Application.js";
import Student from "../models/Student.model.js";
import MockRound from "../models/MockRound.model.js";
import MockAttempt from "../models/MockAttempt.model.js";

export const getEligibleDrives = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const applications = await Application.find({ student: student._id })
      .populate("drive", "title company status jobType roles skills isActive")
      .lean();

    const activeDrives = applications
      .filter((app) => 
        app.drive && 
        app.drive.isActive && 
        (app.drive.status === "Open" || app.drive.status === "Interviewing")
      )
      .map((app) => ({
        applicationId: app._id,
        drive: app.drive,
        roles: app.roles
      }));

    res.json({ success: true, drives: activeDrives });
  } catch (error) {
    console.error("Error in getEligibleDrives:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const generateMockTest = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await Application.findById(applicationId)
      .populate("drive", "title roleOverview keyResponsibilities skills")
      .populate("student", "skills name");
      
    if (!application) return res.status(404).json({ message: "Application not found" });

    const drive = application.drive;
    const studentSkills = application.student?.skills || [];
    
    // Check if technical
    const isTechnical = drive.skills?.some(s => 
      ['react', 'node', 'java', 'python', 'javascript', 'c++', 'aws', 'sql', 'mongodb', 'developer', 'software']
      .some(t => s.toLowerCase().includes(t))
    ) || drive.title.toLowerCase().includes('engineer') || drive.title.toLowerCase().includes('developer');

    const prompt = `
      You are an expert technical interviewer. Create a mock test for a candidate.
      Drive Title: ${drive.title}
      Drive Skills: ${(drive.skills || []).join(', ')}
      Student CV Skills: ${studentSkills.join(', ')}
      
      Requirements:
      1. Generate exactly 20 Multiple Choice Questions (MCQs) comprising: Mathematical/Aptitude, Logical Reasoning, and Role-specific Technical questions. The Aptitude and Reasoning questions MUST be at the difficulty level of final-year engineering students, similar to standard IndiaBix placement questions.
      ${isTechnical ? '2. Since this is a technical role, ALSO generate exactly 2 coding questions. These coding questions MUST be strictly at a Medium difficulty level (comparable to LeetCode Medium). Coding questions MUST require reading from Standard Input (stdin) and printing to Standard Output (stdout).' : ''}
      
      CRITICAL INSTRUCTIONS:
      1. Format the response STRICTLY as a JSON object.
      2. Do NOT use unescaped double quotes inside string values. Avoid using newlines inside strings.
      3. Do NOT include markdown wrapping or conversational text.
      4. The "options" array MUST contain the actual text of the choices, NOT just letters like "A", "B".
      5. "correctAnswer" MUST be the exact matching string from the options array.
      
      {
        "questions": [
          {
             "_id": "string (unique id like q1)",
             "type": "mcq",
             "questionText": "string",
             "options": ["Actual Choice 1 Text", "Actual Choice 2 Text", "Actual Choice 3 Text", "Actual Choice 4 Text"],
             "correctAnswer": "Actual Choice 1 Text",
             "marks": 1,
             "explanation": "string"
          }
          // For coding questions:
          // {
          //   "_id": "string",
          //   "type": "coding",
          //   "questionText": "Problem statement string. Explain exactly how the input is passed via STDIN and what must be printed to STDOUT.",
          //   "testCases": [
          //     { "input": "...", "expectedOutput": "..." },
          //     { "input": "...", "expectedOutput": "..." },
          //     { "input": "...", "expectedOutput": "..." }
          //   ],
          //   "marks": 5,
          //   "explanation": "Example solution approach"
          // }
        ]
      }
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from OpenRouter");
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Safely extract the root JSON object natively ignoring conversational outer text or backticks
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
       content = content.substring(startIndex, endIndex + 1);
    } else {
       throw new Error("Outer JSON block missing in AI response payload.");
    }

    let parsedTest;
    try {
      // Remove any literal newline characters inside strings prior to parse to avoid strict format breaks
      let sanitizedContent = content.replace(/\\n/g, "\\\\n").replace(/\\r/g, "\\\\r");
      // Basic heuristic: sometimes free models use unescaped " inside strings
      parsedTest = JSON.parse(sanitizedContent);
    } catch (parseErr) {
      console.error("AI JSON Formatting Error:", parseErr.message, "\nRaw Content:", content);
      throw new Error("AI generated invalid puzzle payload format. Please retry generating the test.");
    }

    res.json({
      success: true,
      test: {
        title: `AI Mock Round: ${drive.title}`,
        durationInMinutes: 30, // 30 mins
        questions: parsedTest.questions,
        isAI: true
      }
    });

  } catch (error) {
    console.error("Error generating mock test:", error.message);
    res.status(500).json({ message: error.message || "Failed to generate AI Mock Test. Please try again later." });
  }
};

export const evaluateMockTest = async (req, res) => {
  try {
    const { questions, answers } = req.body;
    
    const prompt = `
      You are an expert technical interviewer evaluating a candidate's mock test.
      
      Here are the questions and the candidate's answers:
      ${JSON.stringify({ questions, answers })}
      
      Evaluate the answers.
      - For MCQs, check against the correctAnswer if provided.
      - For coding questions, evaluate the candidate's code logically. If it is mostly correct, give full marks. If partially correct, give partial marks out of the max marks.
      
      Return STRICTLY a JSON object without markdown formatting. Do not use unescaped double quotes or newlines in strings:
      {
         "score": number (total marks obtained),
         "total": number (total possible marks),
         "feedback": "A summary of the candidate's overall performance and areas of improvement"
      }
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
        // Fallback simple stateless evaluator if AI evaluation fails
        let score = 0;
        let total = 0;
        questions.forEach(q => {
           total += (q.marks || 1);
           if (q.type === 'mcq' && answers[q._id] === q.correctAnswer) {
              score += (q.marks || 1);
           }
        });
        return res.json({
            success: true,
            score,
            total,
            feedback: "Automated simple evaluation (OpenRouter evaluation failed temporarily). Coding answers were skipped in simple grading."
        });
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Clean markdown natively ignoring outer conversational text
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
       content = content.substring(startIndex, endIndex + 1);
    }

    const result = JSON.parse(content);

    // Save AI trace into DB natively allowing the Results Dashboard to view history!
    try {
       const student = await Student.findOne({ userId: req.user.id });
       if (student) {
          const aiMockRound = await MockRound.create({
             title: "AI Track Assessment Details",
             description: "A dynamically generated AI-proctored mock assessment reflecting your active pipeline requirements.",
             studentType: "Both",
             isProtected: false,
             durationInMinutes: 30,
             questions: questions.map(q => ({
                questionText: q.questionText,
                options: q.options || [],
                correctAnswer: q.correctAnswer || "AI Evaluated Internally",
                marks: q.marks || 1
             }))
          });

          await MockAttempt.create({
             studentId: student._id,
             mockRoundId: aiMockRound._id,
             score: result.score || 0,
             status: "Completed",
             completedAt: new Date(),
             answers: Object.keys(answers).map((qId) => {
                const targetQ = questions.find(qu => String(qu._id) === String(qId));
                // We map answers into the newly persisted structural schema by question array index natively since dynamic IDs drift
                const matchedIdx = questions.findIndex(qu => String(qu._id) === String(qId));
                return {
                   questionId: aiMockRound.questions[matchedIdx]?._id,
                   selectedAnswer: answers[qId]
                };
             }).filter(a => a.questionId)
          });
       }
    } catch (saveErr) {
       console.error("AI Attempt DB Persistence fault natively bypassed:", saveErr);
    }

    res.json({
      success: true,
      score: result.score,
      total: result.total,
      feedback: result.feedback
    });
    
  } catch (error) {
    console.error("Error evaluating mock test:", error);
    // Simple fallback
    let score = 0;
    let total = 0;
    (req.body.questions || []).forEach(q => {
       total += (q.marks || 1);
       if (q.type === 'mcq' && req.body.answers[q._id] === q.correctAnswer) {
          score += (q.marks || 1);
       }
    });
    res.json({ success: true, score, total, feedback: "Error connecting to AI. This is a simple evaluation of MCQs only." });
  }
};
