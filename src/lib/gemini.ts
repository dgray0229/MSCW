import { Task } from '../types';

// Read Gemini API Key from Expo's public environment variables
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export interface AIDraftTask {
  title: string;
  description?: string;
  points: number | null;
  priority: 'must' | 'should' | 'could' | 'wont';
  type: 'Feature' | 'Bug' | 'Tech Debt' | 'Design' | 'Security' | 'Hotfix';
  subtasks: { title: string; completed: boolean }[];
}

const SYSTEM_INSTRUCTION = `
You are the MSCW Triage Assistant. You help users convert a stream-of-consciousness mental brain-dump (voice transcription or text) into a structured array of actionable tasks.
Each task must conform to the following JSON schema:
{
  "title": "Short, clear action-oriented title",
  "description": "Optional description providing context",
  "points": 1 | 2 | 3 | 5 | 8, // Fibonacci complexity points. Default to 3 if not specified. Map 'quick/easy' to 1 or 2, 'medium/normal' to 3, 'heavy/hard/long' to 5 or 8.
  "priority": "must" | "should" | "could" | "wont", // MoSCoW priorities.
  "type": "Feature" | "Bug" | "Tech Debt" | "Design" | "Security" | "Hotfix", // Map to these categories.
  "subtasks": [ // Broken-down, atomic micro-steps to accomplish this task (max 4 subtasks per task)
    { "title": "Bite-sized action step 1", "completed": false }
  ]
}

Strictly output a valid JSON array of these task objects. Do not include any markdown, triple backticks, or explanation. Only return the JSON array.
`;

/**
 * Direct fetch client to call the Google Gemini 2.5 Flash API
 */
export const parseBrainDump = async (text: string): Promise<AIDraftTask[]> => {
  if (!text.trim()) return [];

  // Fallback to local parsing if no API key is configured
  if (!GEMINI_API_KEY) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY is not defined. Using high-quality sandbox parsing.');
    return generateMockTasks(text);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nUser Input:\n"${text}"` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('No content returned from Gemini');
    }

    // Clean any accidental markdown wrap
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const tasks: AIDraftTask[] = JSON.parse(cleanedJson);
    return tasks;
  } catch (error) {
    console.error('Error parsing brain dump with Gemini:', error);
    // Graceful recovery: use local mock parser so the user experience doesn't crash
    return generateMockTasks(text);
  }
};

/**
 * Intelligent client-side fallback parser
 * Uses keyword scanning to build highly realistic draft tasks matching user inputs.
 */
function generateMockTasks(input: string): AIDraftTask[] {
  const sentences = input.split(/[.!?]|\band\b/i).map(s => s.trim()).filter(Boolean);
  const drafts: AIDraftTask[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    
    // Skip tiny transition phrases
    if (lower.length < 10) continue;

    let title = sentence.replace(/i need to|we should|i must|please|could you/gi, '').trim();
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Shorten title if too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    let type: AIDraftTask['type'] = 'Feature';
    let priority: AIDraftTask['priority'] = 'should';
    let points: number = 3;
    let subtasks: AIDraftTask['subtasks'] = [];

    // Prioritization keywords
    if (/must|immediately|asap|critical|urgent|right now/i.test(lower)) {
      priority = 'must';
    } else if (/could|if i have time|maybe|nice to/i.test(lower)) {
      priority = 'could';
    } else if (/wont|later|postpone/i.test(lower)) {
      priority = 'wont';
    }

    // Type and subtask keywords
    if (/bug|fix|crash|error|broken|fail/i.test(lower)) {
      type = 'Bug';
      priority = 'must';
      points = 2;
      subtasks = [
        { title: 'Locate stack trace and error logs', completed: false },
        { title: 'Write reproducible unit test case', completed: false },
        { title: 'Apply code patch and test on device', completed: false },
      ];
    } else if (/design|color|style|layout|font|pixel|ui|css|theme/i.test(lower)) {
      type = 'Design';
      points = 1;
      subtasks = [
        { title: 'Review visual specifications in Figma', completed: false },
        { title: 'Implement CSS theme variables', completed: false },
        { title: 'Inspect layout alignment on iOS & Android', completed: false },
      ];
    } else if (/refactor|clean|test|database|index|performance|sdk/i.test(lower)) {
      type = 'Tech Debt';
      points = 5;
      subtasks = [
        { title: 'Audit current implementation architecture', completed: false },
        { title: 'Decompose modules into reusable helpers', completed: false },
        { title: 'Verify regression suites pass perfectly', completed: false },
      ];
    } else {
      // Standard feature
      subtasks = [
        { title: 'Define data models and store bindings', completed: false },
        { title: 'Build interactive front-end components', completed: false },
        { title: 'Validate complete user interaction flow', completed: false },
      ];
    }

    // Complexity overrides
    if (/quick|easy|simple|minutes/i.test(lower)) {
      points = 1;
    } else if (/heavy|hard|long|complex|hours|days/i.test(lower)) {
      points = 8;
    }

    drafts.push({
      title,
      description: sentence,
      points,
      priority,
      type,
      subtasks,
    });
  }

  // Fallback to a default task if nothing was structured
  if (drafts.length === 0) {
    drafts.push({
      title: 'Structured Task Draft',
      description: input,
      points: 3,
      priority: 'must',
      type: 'Feature',
      subtasks: [
        { title: 'Define task requirements', completed: false },
        { title: 'Implement implementation plan', completed: false },
      ]
    });
  }

  return drafts;
}
