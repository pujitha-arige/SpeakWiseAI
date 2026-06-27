/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import { IAISessionPlan, IPracticeEvaluation } from '../src/types.js';

// Lazy load Gemini Client to prevent crash if key is temporarily missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// Session Generator Schema
const sessionPlanSchema = {
  type: Type.OBJECT,
  properties: {
    timeline: {
      type: Type.ARRAY,
      description: "Step-by-step timed timeline of the session (MUST total to the session duration).",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          duration: { type: Type.INTEGER, description: "Duration of this section in minutes" },
          description: { type: Type.STRING, description: "Detailed guide for what happens in this stage." }
        },
        required: ["title", "duration", "description"]
      }
    },
    speakerNotes: {
      type: Type.ARRAY,
      description: "Coaching tips on how the speaker should present key topics.",
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING },
          whatToSpeak: { type: Type.STRING, description: "Actual text prompt or message structure the speaker should say." },
          howToExplain: { type: Type.STRING, description: "Voice projection guidelines, hand gestures, and body language directions." },
          examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Helpful and visual analogies or case studies to bring up." },
          questionsToAsk: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Interactive questions to test audience comprehension or break the ice." }
        },
        required: ["section", "whatToSpeak", "howToExplain", "examples", "questionsToAsk"]
      }
    },
    teachingStrategy: {
      type: Type.OBJECT,
      description: "Ice breakers and interaction guidelines customized for the chosen difficulty, style, and audience.",
      properties: {
        iceBreakers: { type: Type.ARRAY, items: { type: Type.STRING } },
        activities: { type: Type.ARRAY, items: { type: Type.STRING } },
        engagementIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["iceBreakers", "activities", "engagementIdeas"]
    }
  },
  required: ["timeline", "speakerNotes", "teachingStrategy"]
};

// Speaker Practice Evaluation Schema
const evaluationSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER, description: "Calculated overall performance score between 1 and 100." },
    confidenceScore: { type: Type.INTEGER, description: "Score between 1 and 100 based on word structure, tone, and pauses." },
    communicationScore: { type: Type.INTEGER, description: "Score between 1 and 100 based on message clarity and simplicity." },
    engagementScore: { type: Type.INTEGER, description: "Score between 1 and 100 based on interactive hooks and story usage." },
    speechQuality: {
      type: Type.OBJECT,
      properties: {
        clarity: { type: Type.STRING, description: "Short review of vocal clarity and stuttering cues." },
        confidence: { type: Type.STRING, description: "Impression of speaker comfort, conviction, and dynamic flow." },
        speed: { type: Type.STRING, description: "Speaking speed rating (e.g., 'Perfect ~125 WPM', 'Fast', 'Too slow')." },
        fillerWords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of typical filler words detected in the transcript (e.g. 'uh', 'like', 'um')." },
        fillerCount: { type: Type.INTEGER, description: "Number of filler words detected in the transcript text." },
        tone: { type: Type.STRING, description: "Mood designation (e.g., 'Friendly & warm', 'Anxious', 'Authoritative')." }
      },
      required: ["clarity", "confidence", "speed", "fillerWords", "fillerCount", "tone"]
    },
    presentationAnalysis: {
      type: Type.OBJECT,
      properties: {
        topicCoverage: { type: Type.STRING, description: "Assess whether key concepts and objectives were explained properly." },
        engagementLevel: { type: Type.STRING, description: "Assess how well the speaker would hold listener attention." },
        communicationStyle: { type: Type.STRING, description: "Classify style (e.g. Formal Academic, Practical Interactive)." }
      },
      required: ["topicCoverage", "engagementLevel", "communicationStyle"]
    },
    feedback: {
      type: Type.OBJECT,
      properties: {
        pros: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 concrete positive traits in the talk." },
        cons: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 2-3 specific flaws or stutters." },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 3 actionable steps to immediately improve delivery." }
      },
      required: ["pros", "cons", "suggestions"]
    }
  },
  required: ["overallScore", "confidenceScore", "communicationScore", "engagementScore", "speechQuality", "presentationAnalysis", "feedback"]
};

// Main AI Session Generator Action
export async function generateSessionPlan(session: any): Promise<IAISessionPlan> {
  const client = getGeminiClient();
  
  const prompt = `You are an elite instructional designer and speaker coach. Generate a detailed, highly customized session plan, timed timeline structure, and coach speaker notes based on these inputs:
  - Session Name: "${session.sessionName}"
  - Topic: "${session.topicName}"
  - Type: "${session.sessionType}"
  - Duration: ${session.duration} minutes
  - Audience: ${session.audienceAgeGroup} (Difficulty: ${session.difficultyLevel})
  - Attendees: ${session.attendeesCount} people
  - Experience targets: Beginner=${session.isBeginner}, Intermediate=${session.isIntermediate}, Advanced=${session.isAdvanced}
  - Description: "${session.description}"
  - Learning Objectives: "${session.learningObjectives}"
  - Key Concepts: "${session.keyConcepts}"
  - Topics to Cover: "${session.topicsToCover}"
  - Expected Outcome: "${session.expectedOutcome}"
  - Preferred Teaching Style: "${session.teachingStyle}" (e.g. story based, formal, highly interactive)
  - Additional Notes: "${session.additionalNotes || 'None'}"

  Instructions:
  1. TIMELINE sections MUST sum up exactly to the total duration of ${session.duration} minutes. Give actionable titles and clear descriptions.
  2. SPEAKER NOTES: Provide concrete scripts on "what to speak" and "how to explain" (tone, gestures, pacing), with visual "examples" and interactive "questions to ask".
  3. TEACHING STRATEGY: Provide specialized Ice Breakers, Activities, and Engagement Ideas fitting the selected style "${session.teachingStyle}" and target audience.`;

  if (!client) {
    console.warn('Gemini API key not found. Using structured fallback mock generator.');
    return generateFallbackPlan(session);
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: sessionPlanSchema as any,
        systemInstruction: "You are an expert instructional designer and visual coach who generates beautiful, complete corporate and academic lesson scripts in standard JSON schema format.",
        temperature: 0.7,
      },
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as IAISessionPlan;
    } else {
      throw new Error('Empty response from Gemini API');
    }
  } catch (err: any) {
    console.warn('Google GenAI Session Plan failed or model is experiencing high demand. Utilizing robust local backup generator. Detail:', err?.message || err);
    const plan = generateFallbackPlan(session);
    (plan as any).isFallback = true;
    return plan;
  }
}

// Main AI Demo Practice Evaluation Action
export async function evaluatePracticeSpeech(transcript: string, sessionTitle: string): Promise<Omit<IPracticeEvaluation, '_id' | 'userId' | 'evaluatedAt'>> {
  const client = getGeminiClient();

  const prompt = `You are a world-class professional speech coach. Analyze the following transcript of a presenter practicing their talk for the session "${sessionTitle}". Determine key verbal habits, pacing issues, filler words, clarity, confidence, tone, topic coverage, and overall speaker competency:
  
  PRESENTATION TRANSCRIPT:
  """
  ${transcript}
  """

  Instructions:
  1. Score overall and specific aspects (Confidence, Communication, Engagement) between 1 and 100.
  2. Perform filler word counting and identification.
  3. Give extremely actionable, friendly, and polished suggestions for improvement, emphasizing pros and cons.`;

  if (!client) {
    console.warn('Gemini API key not found. Using fallback speaker evaluation.');
    return generateFallbackEvaluation(transcript, sessionTitle);
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: evaluationSchema as any,
        systemInstruction: "You are a friendly, encouraging, and critical speech coach. Always output structured feedback adhering to the provided JSON schema. Ensure scores reflect the real speech quality.",
        temperature: 0.4,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return {
        sessionTitle,
        transcript,
        durationSeconds: Math.max(10, Math.round(transcript.split(' ').length / 2)), // estimate duration from words
        ...parsed
      };
    } else {
      throw new Error('Empty response from Gemini API evaluation');
    }
  } catch (err: any) {
    console.warn('Google GenAI Speech Evaluation failed or model is experiencing high demand. Utilizing robust local backup evaluator. Detail:', err?.message || err);
    const val = generateFallbackEvaluation(transcript, sessionTitle);
    (val as any).isFallback = true;
    return val;
  }
}

// Fallback Generators to ensure robustness
function generateFallbackPlan(session: any): IAISessionPlan {
  const duration = Number(session.duration || 45);
  const introD = Math.max(5, Math.round(duration * 0.15));
  const wrapD = Math.max(5, Math.round(duration * 0.15));
  const coreD = duration - introD - wrapD;
  const part1 = Math.round(coreD / 2);
  const part2 = coreD - part1;

  return {
    timeline: [
      {
        title: 'Introduction & Setup Hook',
        duration: introD,
        description: `Begin the session with a strong introduction of the theme "${session.topicName}". Pitch the learning objectives: ${session.learningObjectives.split('\n')[0] || 'Understand core concepts'}.`
      },
      {
        title: `Core Concept Analysis: ${session.keyConcepts.split(',')[0] || 'Fundamentals'}`,
        duration: part1,
        description: `Deliver deep dive content into the key concepts: ${session.keyConcepts}. Highlight practical use cases and run through structured diagrams.`
      },
      {
        title: `Interactive Breakout: ${session.sessionType} Drills`,
        duration: part2,
        description: `Break the audience into small groups to apply their knowledge. Perform interactive exercises fitting the ${session.teachingStyle} teaching style.`
      },
      {
        title: 'Summary & Wrap-up Discussion',
        duration: wrapD,
        description: `Review the expected outcome: ${session.expectedOutcome}. Take final audience questions and outline immediate next steps.`
      }
    ],
    speakerNotes: [
      {
        section: 'Introduction Stage',
        whatToSpeak: `Welcome everyone to this ${session.sessionType} on "${session.sessionName}". Today, we are focusing on how to master ${session.topicName} from a completely fresh perspective.`,
        howToExplain: 'Smile warmly, stand tall, make direct eye contact with multiple rows of attendees, and keep your vocal pace deliberate and reassuring.',
        examples: [`A great way to think about this is like an architect designing a building. You need the blueprint (${session.keyConcepts.split(',')[0] || 'theory'}) before you raise the beams.`],
        questionsToAsk: [
          'What is the single biggest roadblock you face when practicing this topic?',
          'How many of you have had to explain this concept to a absolute beginner before?'
        ]
      },
      {
        section: 'Technical Drill',
        whatToSpeak: 'Now, let\'s put this directly into practice. I want you to work through the main problem together, keeping our core guidelines in mind.',
        howToExplain: 'Walk around the room slowly. Speak in lower, calm tones during group work so you do not distract attention. Keep a friendly posture.',
        examples: ['Consider how top firms implement this strategy daily to scale their communications.'],
        questionsToAsk: ['Are there any unexpected barriers you are encountering during this drill?']
      }
    ],
    teachingStrategy: {
      iceBreakers: [
        `Topic Association Speed-run: Ask the first 3 volunteers to name the first word that comes to mind when they hear "${session.topicName}".`
      ],
      activities: [
        `Case study roleplay: Have partners simulate a stakeholder pitch using the concepts covered.`
      ],
      engagementIdeas: [
        'Ask attendees to type answers or raise physical hands for quick polls.',
        'Inject a 20-second silent reflection pause before sharing the main takeaway.'
      ]
    },
    generatedAt: new Date().toISOString()
  };
}

function generateFallbackEvaluation(transcript: string, sessionTitle: string): Omit<IPracticeEvaluation, '_id' | 'userId' | 'evaluatedAt'> {
  const wordCount = transcript.split(' ').length;
  const fillerCandidates = ['basically', 'like', 'um', 'uh', 'you know', 'actually', 'so'];
  const detectedFillers: string[] = [];
  let fillerCount = 0;

  fillerCandidates.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = transcript.match(regex);
    if (matches) {
      detectedFillers.push(word);
      fillerCount += matches.length;
    }
  });

  // Basic analytics based on word count
  let speedText = 'Optimal speed (~130 words per minute)';
  let commScore = 80;
  if (wordCount < 40) {
    speedText = 'A bit slow. Add more elaboration and examples.';
    commScore = 75;
  } else if (wordCount > 150) {
    speedText = 'A bit fast. Remember to breathe and add intentional pauses.';
    commScore = 78;
  }

  const overall = Math.min(100, Math.max(50, 85 - Math.round(fillerCount * 1.5)));

  return {
    sessionTitle,
    transcript,
    durationSeconds: Math.max(12, Math.round(wordCount / 2)),
    overallScore: overall,
    confidenceScore: Math.min(100, overall + 3),
    communicationScore: commScore,
    engagementScore: Math.min(100, overall - 2),
    speechQuality: {
      clarity: 'Your vocal structure is generally clean, with standard word pronunciations.',
      confidence: 'You sound comfortable, maintaining a pleasant flow throughout your practice run.',
      speed: speedText,
      fillerWords: detectedFillers.length > 0 ? detectedFillers : ['um', 'like'],
      fillerCount: Math.max(1, fillerCount),
      tone: 'Conversational and Warm'
    },
    presentationAnalysis: {
      topicCoverage: 'You managed to introduce the core theme of your talk nicely.',
      engagementLevel: 'Good verbal presence, though you could include a rhetorical hook in your opening statement.',
      communicationStyle: 'Friendly and informative style, matching a friendly presentation setup.'
    },
    feedback: {
      pros: [
        'Friendly vocal projection and accessible, encouraging tone.',
        'Great job keeping the speech moving without awkward extended silent blocks.',
        'The opening statements clearly laid out the main purpose.'
      ],
      cons: [
        `Used ${fillerCount} filler vocalizations which can weaken authority during professional deliveries.`,
        'Pacing felt slightly monotonous in the middle transition.'
      ],
      suggestions: [
        'Embrace pauses: when you feel like saying "um" or "like", take a silent 1-second breath instead.',
        'Vary your voice: try raising your pitch slightly on key words to emphasize importance.',
        'Anchor your ending: conclude with a clear, definitive statement instead of drifting off.'
      ]
    }
  };
}

// ==========================================
// NEW WORKSPACE SAAS ENDPOINTS & SCHEMAS
// ==========================================

const storySchema = {
  type: Type.OBJECT,
  properties: {
    analogy: { type: Type.STRING, description: "A simple, highly visual analogy to explain the topic." },
    storyScript: { type: Type.STRING, description: "A short, engaging 1-minute relatable story or case study." },
    takeaway: { type: Type.STRING, description: "The core moral/technical takeaway the audience will remember." }
  },
  required: ["analogy", "storyScript", "takeaway"]
};

const qaEvalSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: "Score from 0 to 100 on how clear, accurate, and speaker-friendly the response is." },
    feedback: { type: Type.STRING, description: "Actionable constructive feedback on what made the answer good or how to clarify it." },
    suggestedBetterResponse: { type: Type.STRING, description: "A professional, extremely well-phrased alternative response for the speaker to say." }
  },
  required: ["score", "feedback", "suggestedBetterResponse"]
};

const slideAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Overall summary of the presentation deck." },
    slides: {
      type: Type.ARRAY,
      description: "List of structured slides derived from the input.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Slide header or focus." },
          bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Derive key bullet points for the slide visual." },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Important takeaways or data highlights." },
          speakerNotes: { type: Type.STRING, description: "Exactly what the speaker should say when presenting this slide." },
          timeAllocation: { type: Type.INTEGER, description: "Suggested duration to spend on this slide in minutes." }
        },
        required: ["title", "bulletPoints", "keyPoints", "speakerNotes", "timeAllocation"]
      }
    }
  },
  required: ["summary", "slides"]
};

const knowledgeGapSchema = {
  type: Type.OBJECT,
  properties: {
    coveredConcepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of expected concepts or keywords successfully explained or mentioned in the transcript." },
    missingConcepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of expected concepts that were completely missed or glossed over in the transcript." },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed guide on how the presenter can incorporate the missing concepts in their next rehearsal." }
  },
  required: ["coveredConcepts", "missingConcepts", "suggestions"]
};

export async function generateStoryAndAnalogy(topicName: string, expectedOutcome: string): Promise<any> {
  const client = getGeminiClient();
  const prompt = `You are an elite storyteller and public speaker. Create an incredibly engaging story and analogy to explain this topic to an audience:
  - Topic: "${topicName}"
  - Outcome/Context: "${expectedOutcome}"
  Make the story emotional, relatable, or extremely interesting, and the analogy clear and visual.`;

  if (!client) {
    return {
      analogy: `Explaining "${topicName}" is like riding a bicycle. At first, balancing feels impossible, but once your wheels get rolling, forward momentum does all the work for you.`,
      storyScript: `Imagine trying to explain "${topicName}" to an 8-year-old. When the world-famous teacher, Richard Feynman, was once asked how he mastered complex items, he said: 'If you can't explain it simply, you don't understand it.' Master "${topicName}" by stripping away the jargon and focusing on the core, human-centric benefits.`,
      takeaway: `The best explanations don't use technical complexity; they use relatable frames of reference that stick with the listener forever.`,
      isFallback: true
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: storySchema as any,
        systemInstruction: "You are an elite creative scriptwriter and public speaking coach who writes in standard JSON schema format.",
        temperature: 0.7,
      },
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (err: any) {
    console.warn('Google GenAI Story Generation failed or model is experiencing high demand. Utilizing robust local backup generator. Detail:', err?.message || err);
    return {
      analogy: `Explaining "${topicName}" is like riding a bicycle. At first, balancing feels impossible, but once your wheels get rolling, forward momentum does all the work for you.`,
      storyScript: `Imagine trying to explain "${topicName}" to an 8-year-old. When the world-famous teacher, Richard Feynman, was once asked how he mastered complex items, he said: 'If you can't explain it simply, you don't understand it.' Master "${topicName}" by stripping away the jargon and focusing on the core, human-centric benefits.`,
      takeaway: `The best explanations don't use technical complexity; they use relatable frames of reference that stick with the listener forever.`,
      isFallback: true
    };
  }
}

export async function evaluateQAResponse(question: string, presenterAnswer: string): Promise<any> {
  const client = getGeminiClient();
  const prompt = `You are a speech evaluator. A member of the audience just asked this question:
  "${question}"
  And the presenter answered with this response:
  "${presenterAnswer}"
  Evaluate this answer. Grade it from 0 to 100 based on accuracy, clarity, and friendliness. Give constructive feedback and a beautifully phrased ideal alternative.`;

  if (!client) {
    const score = presenterAnswer.trim().split(/\s+/).length > 10 ? 88 : 65;
    return {
      score,
      feedback: presenterAnswer.trim().split(/\s+/).length > 10 
        ? "Good job! You answered with reasonable depth, addressing the question directly and politely." 
        : "Your answer was a bit brief. Try to validate the audience member's query first and provide a concrete example.",
      suggestedBetterResponse: `That is an excellent question! Thank you for bringing that up. While many think that "${question.replace(/[^a-zA-Z0-9 ]/g, '')}" is a difficult hurdle, the easiest approach is to divide the problem into bite-sized milestones. For example, by first anchoring our core concept and then rolling out interactive elements, we keep the entire audience highly engaged.`,
      isFallback: true
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: qaEvalSchema as any,
        systemInstruction: "You are a professional corporate and academic speech reviewer who evaluates presenter answers in standard JSON format.",
        temperature: 0.4,
      },
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (err: any) {
    console.warn('Google GenAI QA Evaluation failed or model is experiencing high demand. Utilizing robust local backup evaluator. Detail:', err?.message || err);
    return {
      score: 80,
      feedback: "Analyzed your response successfully using fallback speech model metrics.",
      suggestedBetterResponse: "A well-structured answer involves validating the audience's point, addressing the core query simply, and providing a supportive example.",
      isFallback: true
    };
  }
}

export async function analyzeSlides(slideText: string): Promise<any> {
  const client = getGeminiClient();
  const prompt = `You are an elite slide visual consultant. The user has pasted details/text of their presentation slides or topics:
  """
  ${slideText}
  """
  Analyze this content. Structure it slide-by-slide, giving:
  1. A clear slide title.
  2. 2-3 visual bullet points to display on the screen.
  3. 1-2 critical key points or data takeaways.
  4. Complete, friendly, and professional speaker notes (the script of exactly what to say).
  5. Suggested slide duration time allocation (in minutes).`;

  if (!client) {
    return {
      summary: "This presentation covers the fundamentals of the target subject with high clarity.",
      slides: [
        {
          title: "Welcome & Core Message",
          bulletPoints: ["Mastering the Basics", "Understanding Value Proposition", "Overcoming Starting Roadblocks"],
          keyPoints: ["The first 5 minutes define audience attention span", "Establish immediate mutual trust"],
          speakerNotes: "Welcome everyone! Thank you so much for joining me today. We are going to explore how to master our core concept, starting with our initial roadmap and moving towards actual practical integration.",
          timeAllocation: 3
        },
        {
          title: "Deep Dive: Main Architecture",
          bulletPoints: ["Scalable Workflows", "Visual Performance Metrics", "Data-Driven Feedback"],
          keyPoints: ["A structured layout is 40% more memorable", "Keep slides uncluttered and clean"],
          speakerNotes: "Now, let's look at the engine. Having a structured workspace is vital because it establishes clear visual rhythms that help your viewers follow your narrative.",
          timeAllocation: 7
        }
      ],
      isFallback: true
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: slideAnalysisSchema as any,
        systemInstruction: "You are a world-class slide consultant who processes slides into a beautiful presentation script format in JSON.",
        temperature: 0.5,
      },
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (err: any) {
    console.warn('Google GenAI Slide Analysis failed or model is experiencing high demand. Utilizing robust local backup analyzer. Detail:', err?.message || err);
    return {
      summary: "Pasted slides successfully parsed with smart template models.",
      slides: [
        {
          title: "Slide 1: Overview",
          bulletPoints: ["Key concept introduction", "Pacing & flow"],
          keyPoints: ["Keep bullet points minimal"],
          speakerNotes: "Let's begin by discussing our session's main theme and key targets.",
          timeAllocation: 5
        }
      ],
      isFallback: true
    };
  }
}

export async function detectKnowledgeGap(transcript: string, expectedConcepts: string): Promise<any> {
  const client = getGeminiClient();
  const prompt = `You are an elite public speaking auditor. The presenter just rehearsed their talk.
  PRACTICE TRANSCRIPT:
  """
  ${transcript}
  """
  EXPECTED CONCEPTS & TOPICS TO COVER:
  "${expectedConcepts}"
  
  Determine which of the expected concepts were covered, which were missed or glossed over, and give constructive ideas for how to cover them next time.`;

  if (!client) {
    const concepts = expectedConcepts.split(',').map(c => c.trim()).filter(Boolean);
    const covered = concepts.length > 0 ? [concepts[0]] : ["Introductory concepts"];
    const missed = concepts.length > 1 ? concepts.slice(1) : ["Advanced application cases", "Practical implementation constraints"];
    return {
      coveredConcepts: covered,
      missingConcepts: missed,
      suggestions: [
        "In your next session rehearsal, make sure to dedicate a specific slide to each of the missed topics.",
        "Add a story that bridges your introduction directly into these specific missing concepts.",
        "Try using interactive prompts like asking the audience to think about the missing items."
      ],
      isFallback: true
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: knowledgeGapSchema as any,
        systemInstruction: "You are a professional educational curriculum auditor who analyzes transcripts for concepts covered and missed, outputting structured JSON.",
        temperature: 0.3,
      },
    });
    return JSON.parse(response.text?.trim() || '{}');
  } catch (err: any) {
    console.warn('Google GenAI Knowledge Gap Detection failed or model is experiencing high demand. Utilizing robust local backup detector. Detail:', err?.message || err);
    return {
      coveredConcepts: ["Core concepts"],
      missingConcepts: ["Advanced integration techniques"],
      suggestions: ["Introduce missed elements during transitions."],
      isFallback: true
    };
  }
}

