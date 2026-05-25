import { Task, AppSettings } from '../types';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export interface CapacityGuardianAlert {
  level: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
}

export interface SoundscapeRecommendation {
  trackId: string;
  name: string;
  uri: string;
  reason: string;
}

export interface OverflowRecommendation {
  id: string;
  title: string;
  action: 'backlog' | 'defer' | 'keep';
  reason: string;
}

const SOUNDSCAPES = [
  { id: 'rain', name: 'Heavy Rain', uri: 'https://cdn.freesound.org/previews/515/515286_11306359-lq.mp3' },
  { id: 'white_noise', name: 'Deep White Noise', uri: 'https://cdn.freesound.org/previews/316/316920_4230890-lq.mp3' },
  { id: 'cafe', name: 'Coffee Shop', uri: 'https://cdn.freesound.org/previews/174/174753_1583271-lq.mp3' },
];

/**
 * AI CAPACITY GUARDIAN (Planning Analyzer)
 * Evaluates cognitive friction on the scheduled Daily Board and gives protective warnings.
 */
export function getCapacityGuardianRecommendation(tasks: Task[], dailyCapacity: number): CapacityGuardianAlert {
  const activeTasks = tasks.filter(t => t.status === 'today' && !t.completed);
  const totalPoints = tasks.filter(t => t.status === 'today').reduce((sum, t) => sum + (t.points || 0), 0);
  
  const mustHaves = activeTasks.filter(t => t.priority === 'must');
  const mustPoints = mustHaves.reduce((sum, t) => sum + (t.points || 0), 0);

  const highFriction = activeTasks.filter(t => t.type === 'Bug' || t.type === 'Tech Debt' || t.type === 'Security');
  const highFrictionPoints = highFriction.reduce((sum, t) => sum + (t.points || 0), 0);

  if (totalPoints === 0) {
    return {
      level: 'success',
      title: 'Board is Clean',
      message: 'Add tasks or speak to the AI Assistant to triage and plan your execution goals.'
    };
  }

  // Risk Level 3: Extreme Overcapacity
  if (totalPoints > dailyCapacity) {
    return {
      level: 'danger',
      title: 'Extreme Capacity Danger',
      message: `You scheduled ${totalPoints} pts, exceeding your ${dailyCapacity} pt limit. High rollovers cause a drop in discipline. Shift less urgent items to Backlog.`
    };
  }

  // Risk Level 2: High Friction Combination
  if (highFrictionPoints >= 6 && activeTasks.length > 2) {
    return {
      level: 'warning',
      title: 'High Cognitive Friction Detected',
      message: `You scheduled ${highFrictionPoints} pts of complex analytical tasks (Bugs/Tech Debt). This combination has a high historical delay rate. Consider swapping one out for a Design or Feature polish.`
    };
  }

  // Risk Level 2: Single-priority overload
  if (mustPoints > dailyCapacity * 0.8 && totalPoints >= dailyCapacity) {
    return {
      level: 'warning',
      title: 'High Must-Have Overload',
      message: `Critical Must-Haves absorb ${mustPoints} pts. If one stalls, your entire schedule is blocked. Defer a Should-Have or Could-Have task to create a visual buffer.`
    };
  }

  // Risk Level 1: Under capacity and well balanced
  return {
    level: 'success',
    title: 'Healthy Target Zone',
    message: `Excellent balance! You are scheduled at ${totalPoints} of your ${dailyCapacity} pt maximum limit. Stay focused and avoid additions today.`
  };
}

/**
 * AI FOCUS SOUNDSCAPE CONDUCTOR (Focus Conductor)
 * Analyzes the target task type and complexity to conduct the perfect ambient background.
 */
export function getRecommendedSoundscape(taskType?: string, points?: number | null): SoundscapeRecommendation {
  const complexity = points || 3;
  
  if (taskType === 'Bug' || taskType === 'Security') {
    return {
      trackId: 'white_noise',
      name: SOUNDSCAPES[1].name,
      uri: SOUNDSCAPES[1].uri,
      reason: `Conducted Deep White Noise to maximize analytical focus and block out distractions for this Bug task.`
    };
  }

  if (taskType === 'Tech Debt') {
    return {
      trackId: 'rain',
      name: SOUNDSCAPES[0].name,
      uri: SOUNDSCAPES[0].uri,
      reason: `Conducted Heavy Rain to induce alpha waves for structured system refactoring.`
    };
  }

  if (taskType === 'Design' || taskType === 'Feature') {
    return {
      trackId: 'cafe',
      name: SOUNDSCAPES[2].name,
      uri: SOUNDSCAPES[2].uri,
      reason: `Conducted Coffee Shop chatter to stimulate creative visualization and interface layout flow.`
    };
  }

  // Default: Rain or White Noise based on complexity
  if (complexity >= 5) {
    return {
      trackId: 'white_noise',
      name: SOUNDSCAPES[1].name,
      uri: SOUNDSCAPES[1].uri,
      reason: `Conducted Deep White Noise to help you push through this high-complexity ${complexity}-point goal.`
    };
  }

  return {
    trackId: 'rain',
    name: SOUNDSCAPES[0].name,
    uri: SOUNDSCAPES[0].uri,
    reason: `Conducted Heavy Rain to maintain steady focus on this task.`
  };
}

/**
 * AI OVERFLOW CONCIERGE (Rollover Assistant)
 * Formulates smart choices for tasks remaining on the board at day end.
 */
export function getOverflowRecommendations(tasks: Task[]): OverflowRecommendation[] {
  const uncompleted = tasks.filter(t => t.status === 'today' && !t.completed);
  
  return uncompleted.map(t => {
    let action: OverflowRecommendation['action'] = 'keep';
    let reason = '';

    if (t.priority === 'could' || t.priority === 'wont') {
      action = 'backlog';
      reason = `This is a lower priority ${t.priority.toUpperCase()} item. AI recommends returning it to your backlog to free up capacity tomorrow.`;
    } else if (t.priority === 'should') {
      action = 'defer';
      reason = `A Should-Have. AI recommends deferring this to tomorrow as an active goal, or backlogging if tomorrow is already full.`;
    } else {
      // Must-Haves
      action = 'keep';
      reason = `A critical MUST-HAVE. AI recommends keeping this scheduled as a high-focus priority first thing tomorrow morning.`;
    }

    return {
      id: t.id,
      title: t.title,
      action,
      reason
    };
  });
}

/**
 * AI DAILY COACH Retrospective (Generates dynamic review)
 * Reaches out to Gemini in the background or falls back gracefully to beautiful template logic.
 */
export async function generateDailyCoachRetrospective(
  tasks: Task[], 
  settings: AppSettings
): Promise<string> {
  const completedTasks = tasks.filter(t => t.status === 'today' && t.completed);
  const uncompletedTasks = tasks.filter(t => t.status === 'today' && !t.completed);
  
  const completedPoints = completedTasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const missedPoints = uncompletedTasks.reduce((sum, t) => sum + (t.points || 0), 0);

  const streak = settings.currentStreakDays;

  // Compile detailed task metrics for prompting
  const completedSummaries = completedTasks.map(t => `[${t.priority.toUpperCase()}] ${t.title} (${t.points || 0} pts, ${t.type || 'Feature'})`).join(', ');
  const missedSummaries = uncompletedTasks.map(t => `[${t.priority.toUpperCase()}] ${t.title} (${t.points || 0} pts, ${t.type || 'Feature'})`).join(', ');

  const systemInstruction = `
You are the MSCW Daily Coach, an encouraging personal productivity chief of staff. 
You provide highly tailored, analytical, and supportive retrospective coaching to help users master cognitive constraints (e.g. the 8-point limit) and celebrate progress.

Write exactly 3 or 4 concise, impactful sentences (styled in professional, conversational markdown) analyzing the user's performance today.
Strictly adhere to the following:
1. DO NOT refer to Google or Gemini. Speak directly as the MSCW Coach.
2. Structure your review with short paragraphs and bullet points.
3. Be supportive and analytical: celebrate completed Must-Haves, acknowledge when they stayed within their capacity limit, and suggest how to deal with rollover tasks.
4. Keep the entire response under 150 words. Format cleanly using bold/italic tags where appropriate.
`;

  const userInput = `
Today's metrics:
- Completed Tasks: ${completedTasks.length} (${completedPoints} points total) -> [${completedSummaries || 'None'}]
- Rollover/Uncompleted Tasks: ${uncompletedTasks.length} (${missedPoints} points total) -> [${missedSummaries || 'None'}]
- Strict Daily Capacity Ceiling: ${settings.dailyCapacity} pts
- Discipline Streak: ${streak} days
`;

  if (!GEMINI_API_KEY) {
    console.warn('No Gemini API Key defined. Utilizing high-fidelity client-side retro coach engine.');
    return generateLocalRetroFeedback(completedTasks, uncompletedTasks, completedPoints, missedPoints, streak, settings.dailyCapacity);
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
            parts: [{ text: `${systemInstruction}\n\nUser Performance metrics:\n${userInput}` }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini coach fetch error: ${response.statusText}`);
    }

    const data = await response.json();
    const reviewText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reviewText) throw new Error('No coach content returned');
    return reviewText.trim();
  } catch (error) {
    console.error('Error generating retrospective with Gemini, applying fallback:', error);
    return generateLocalRetroFeedback(completedTasks, uncompletedTasks, completedPoints, missedPoints, streak, settings.dailyCapacity);
  }
}

/**
 * Highly responsive client-side fallback retro coach
 */
function generateLocalRetroFeedback(
  completed: Task[],
  uncompleted: Task[],
  completedPoints: number,
  missedPoints: number,
  streak: number,
  capacity: number
): string {
  const totalScheduled = completedPoints + missedPoints;
  
  if (completed.length === 0 && uncompleted.length === 0) {
    return `### Welcome to your AI Coach! 👋\n\nYour daily board is empty. Speak to the Triage Assistant or add tasks to your daily board. I will be here at the end of the day to analyze your performance and help you stay under your **${capacity}-point capacity limit**!`;
  }

  if (completed.length > 0 && uncompleted.length === 0) {
    const streakMsg = streak > 0 ? `Your discipline streak is now at **${streak} days**! 🔥` : '';
    return `### Outstanding Work today! 🎉\n\n* You achieved a perfect **100% completion rate**, checking off all **${completed.length} tasks** and successfully landing **${completedPoints} points**.\n* By keeping your schedule clean and disciplined, you avoided capacity overload completely. ${streakMsg}\n* Rest up tonight—your focus blocks are optimized for another great day tomorrow.`;
  }

  if (completedPoints > capacity) {
    return `### Capacity Lesson Learned ⚖️\n\n* You tackled **${completed.length} tasks** (${completedPoints} points), but your scheduled board of **${totalScheduled} points** pushed past your healthy boundary of **${capacity} points**.\n* Working in the overload zone often increases rollover friction. \n* **Pro-tip:** Tomorrow, try deferring one or two Should-Haves to the backlog early in the morning. Focus is about knowing what *not* to do!`;
  }

  const mustHaves = completed.filter(t => t.priority === 'must');
  if (mustHaves.length > 0) {
    return `### Superb Must-Have Execution! 💪\n\n* You nailed your critical **Must-Haves** today, securing **${completedPoints} points** and protecting your daily streak!\n* You have **${uncompleted.length} rollover tasks** (${missedPoints} points) remaining. That is completely normal. \n* Let's slide those lower-priority items back into the Backlog tonight to keep tomorrow's board fresh and stress-free.`;
  }

  return `### Steady Progress! 📈\n\n* You checked off **${completed.length} tasks** today. Even with **${uncompleted.length} tasks** rolling over, you successfully preserved your limits and kept total completed volume well within your daily ceiling.\n* Tomorrow, aim to tackle your most challenging **Must-Have** first thing in the morning when your mental bandwidth is highest.`;
}

export interface SmartCapacityRecommendation {
  optimalCapacity: number;
  currentLoad: number;
  percentage: number;
  level: 'success' | 'warning' | 'danger';
  title: string;
  message: string;
}

/**
 * SMART CAPACITY ADVISOR (Velocity Planner)
 * Calculates sustainable target capacities based on past completed velocity
 * and provides live feedback on overload boundaries.
 */
export function getSmartCapacityRecommendation(
  tasks: Task[],
  settings: AppSettings,
  upcomingPoints?: number | null
): SmartCapacityRecommendation {
  const sprints = settings.sprints || [];
  const completedSprints = sprints.filter(s => s.completedPoints > 0);
  
  const dailyCapacity = settings.dailyCapacity || 8;
  const sprintLengthDays = settings.sprintLengthDays || 7;
  
  // 65% of max theoretical capacity represents a healthy, sustainable sprint velocity baseline
  const defaultOptimal = Math.round(dailyCapacity * sprintLengthDays * 0.65);
  
  const optimalCapacity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) / completedSprints.length)
    : defaultOptimal;
    
  // Sum up all active uncompleted tasks in the active sprint backlog
  const activeTasks = tasks.filter(t => (t.status === 'sprint' || t.status === 'today') && !t.completed);
  
  const currentLoad = activeTasks.reduce((sum, t) => {
    // Default null-point tasks to a standard medium weight (2 pts) as a baseline estimate
    const points = t.points !== null && t.points !== undefined ? t.points : 2;
    return sum + points;
  }, 0);
  
  const previewLoad = currentLoad + (upcomingPoints !== undefined && upcomingPoints !== null ? upcomingPoints : 0);
  const percentage = optimalCapacity > 0 ? Math.round((previewLoad / optimalCapacity) * 100) : 0;
  
  let level: 'success' | 'warning' | 'danger' = 'success';
  let title = 'Healthy Capacity';
  let message = `You are scheduled at ${previewLoad} of ${optimalCapacity} pts. Excellent buffer! You can comfortably fit more backlog tasks.`;
  
  if (percentage >= 80 && percentage <= 100) {
    level = 'warning';
    title = 'Near Target Capacity';
    message = `You are at ${previewLoad} / ${optimalCapacity} pts (${percentage}% load). Ideal capacity reached. Keep remaining backlog tasks archived or Won't-Have to preserve focus.`;
  } else if (percentage > 100) {
    level = 'danger';
    title = 'Velocity Overflow Warning';
    message = `Sprint load is ${previewLoad} pts, exceeding your historical velocity of ${optimalCapacity} pts (${percentage}% overload). High overflow causes burnout. Defer or archive remaining items.`;
  }
  
  return {
    optimalCapacity,
    currentLoad,
    percentage,
    level,
    title,
    message,
  };
}
