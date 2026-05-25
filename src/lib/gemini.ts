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

const DECONSTRUCT_SYSTEM_INSTRUCTION = `
You are the FocusMust Task Deconstructor. You help users break down a complex task into a checklist of clear, actionable, bite-sized micro-steps.
Each step should take between 15 minutes to 2 hours.
Keep the subtasks highly practical, action-oriented, and focused.
Based on the task title and the Fibonacci complexity points (1, 2, 3, 5, or 8 points, representing roughly the time weight where 1 is ~15m-1h, and 8 is a full epic day):
Decompose the task into exactly 3 to 5 clear subtasks.
Output a strict JSON array of strings, for example:
[
  "First specific action step",
  "Second specific action step",
  "Third specific action step"
]

Strictly return a valid JSON array of strings. Do not include any markdown, triple backticks, or explanation. Only return the JSON.
`;

/**
 * Direct fetch client to call Google Gemini 2.5 Flash API to deconstruct a task into subtasks
 */
export const deconstructTask = async (title: string, points: number): Promise<string[]> => {
  if (!title.trim()) return [];

  // Fallback to local parsing if no API key is configured
  if (!GEMINI_API_KEY) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY is not defined. Using high-quality sandbox task deconstruction.');
    return generateMockSubtasks(title, points);
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
            parts: [{ text: `${DECONSTRUCT_SYSTEM_INSTRUCTION}\n\nTask: "${title}" (${points} Fibonacci Complexity Points)` }],
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
    const subtasks: string[] = JSON.parse(cleanedJson);
    if (Array.isArray(subtasks)) {
      return subtasks;
    }
    throw new Error('Parsed response is not a string array');
  } catch (error) {
    console.error('Error deconstructing task with Gemini:', error);
    // Graceful recovery: use local mock parser
    return generateMockSubtasks(title, points);
  }
};

/**
 * Intelligent client-side fallback subtask generator
 * Uses keyword scanning and point counts to return highly realistic action lists.
 */
export function generateMockSubtasks(title: string, points: number): string[] {
  const lower = title.toLowerCase();
  
  if (/bug|fix|crash|error|broken|fail/i.test(lower)) {
    return [
      'Locate crash stack trace and collect error telemetry',
      'Draft isolated local test scenario to reproduce failure',
      'Apply code corrections and test edge boundary conditions',
      'Perform complete regression check across active screens'
    ];
  }
  
  if (/design|color|style|layout|font|pixel|ui|css|theme/i.test(lower)) {
    return [
      'Review Figma layouts and gather color palette specifications',
      'Implement responsive CSS structure and color system tokens',
      'Inspect rendering alignment and margins across viewports',
      'Validate accessibility contrast scores and hover interactions'
    ];
  }
  
  if (/refactor|clean|test|database|index|performance|sdk/i.test(lower)) {
    return [
      'Audit existing module files and benchmark response metrics',
      'Isolate heavy functions and decompose into pure helper modules',
      'Apply indexing, schema upgrades, or standard library refactors',
      'Execute validation suite and verify backward compatibility'
    ];
  }

  // General Feature / Catch-all based on points
  if (points <= 2) {
    return [
      'Define simple input requirements and local state variables',
      'Draft lightweight components and register event actions',
      'Verify clean visual transition on screen interaction'
    ];
  } else if (points <= 5) {
    return [
      'Establish technical data models and global store bindings',
      'Build core visual modules and responsive layout grids',
      'Integrate validation logic, error overlays, and haptics',
      'Perform detailed end-to-end user navigation checks'
    ];
  } else {
    return [
      'Research architectural architecture and library dependencies',
      'Configure backing database schema and secure Firestore rules',
      'Implement core state management routines and async API methods',
      'Establish robust exception coverage and network offline fallback',
      'Execute complete end-to-end integration checklist'
    ];
  }
}


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
