import { 
  getCapacityGuardianRecommendation, 
  getRecommendedSoundscape, 
  getOverflowRecommendations, 
  generateDailyCoachRetrospective 
} from '../lib/aiPlanner';
import { Task, AppSettings } from '../types';

describe('MSCW AI Planner Tests', () => {
  const mockSettings: AppSettings = {
    isPremium: false,
    dailyCapacity: 8,
    zenDuration: 25,
    hapticsEnabled: true,
    dailyNotificationsEnabled: false,
    zenModeNotifications: true,
    darkMode: false,
    autoArchiveWontTasks: true,
    hasSeenOnboarding: false,
    currentStreakDays: 3,
    longestStreakDays: 5,
    sprintNumber: 1,
    sprintStartDate: new Date().toISOString(),
    sprintLengthDays: 7,
  };

  describe('Capacity Guardian', () => {
    it('should return Clean Board when no tasks exist', () => {
      const recommendation = getCapacityGuardianRecommendation([], 8);
      expect(recommendation.level).toBe('success');
      expect(recommendation.title).toBe('Board is Clean');
    });

    it('should alert danger when total points exceed daily capacity', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Big Task',
          points: 5,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: '',
        },
        {
          id: '2',
          title: 'Another Task',
          points: 5,
          priority: 'should',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const recommendation = getCapacityGuardianRecommendation(tasks, 8);
      expect(recommendation.level).toBe('danger');
      expect(recommendation.title).toBe('Extreme Capacity Danger');
    });

    it('should alert warning when high friction tasks are overloaded', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Bug Fix',
          points: 3,
          priority: 'must',
          status: 'today',
          completed: false,
          type: 'Bug',
          createdAt: '',
        },
        {
          id: '2',
          title: 'Refactor',
          points: 3,
          priority: 'should',
          status: 'today',
          completed: false,
          type: 'Tech Debt',
          createdAt: '',
        },
        {
          id: '3',
          title: 'Feature Work',
          points: 1,
          priority: 'could',
          status: 'today',
          completed: false,
          type: 'Feature',
          createdAt: '',
        }
      ];
      const recommendation = getCapacityGuardianRecommendation(tasks, 8);
      expect(recommendation.level).toBe('warning');
      expect(recommendation.title).toBe('High Cognitive Friction Detected');
    });

    it('should alert warning when Must-Have tasks overload capacity', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Critical Must',
          points: 7,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: '',
        },
        {
          id: '2',
          title: 'Minor Should',
          points: 1,
          priority: 'should',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const recommendation = getCapacityGuardianRecommendation(tasks, 8);
      expect(recommendation.level).toBe('warning');
      expect(recommendation.title).toBe('High Must-Have Overload');
    });

    it('should return success when schedule is balanced', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Balanced Feature',
          points: 5,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const recommendation = getCapacityGuardianRecommendation(tasks, 8);
      expect(recommendation.level).toBe('success');
      expect(recommendation.title).toBe('Healthy Target Zone');
    });
  });

  describe('Focus Soundscape Conductor', () => {
    it('should recommend Deep White Noise for Bug or Security tasks', () => {
      const bugSound = getRecommendedSoundscape('Bug', 3);
      expect(bugSound.trackId).toBe('white_noise');
      expect(bugSound.name).toBe('Deep White Noise');

      const securitySound = getRecommendedSoundscape('Security', 2);
      expect(securitySound.trackId).toBe('white_noise');
    });

    it('should recommend Heavy Rain for Tech Debt tasks', () => {
      const techDebtSound = getRecommendedSoundscape('Tech Debt', 3);
      expect(techDebtSound.trackId).toBe('rain');
      expect(techDebtSound.name).toBe('Heavy Rain');
    });

    it('should recommend Coffee Shop for Design or Feature tasks', () => {
      const designSound = getRecommendedSoundscape('Design', 2);
      expect(designSound.trackId).toBe('cafe');
      expect(designSound.name).toBe('Coffee Shop');

      const featureSound = getRecommendedSoundscape('Feature', 3);
      expect(featureSound.trackId).toBe('cafe');
    });

    it('should default to Deep White Noise for high complexity tasks', () => {
      const complexSound = getRecommendedSoundscape(undefined, 5);
      expect(complexSound.trackId).toBe('white_noise');
    });
  });

  describe('Overflow Concierge', () => {
    it('should recommend backlog for Could-Haves and Won\'t-Haves', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Could task',
          points: 2,
          priority: 'could',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const rec = getOverflowRecommendations(tasks);
      expect(rec.length).toBe(1);
      expect(rec[0].action).toBe('backlog');
    });

    it('should recommend defer for Should-Haves', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Should task',
          points: 3,
          priority: 'should',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const rec = getOverflowRecommendations(tasks);
      expect(rec.length).toBe(1);
      expect(rec[0].action).toBe('defer');
    });

    it('should recommend keep for Must-Haves', () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Must task',
          points: 5,
          priority: 'must',
          status: 'today',
          completed: false,
          createdAt: '',
        }
      ];
      const rec = getOverflowRecommendations(tasks);
      expect(rec.length).toBe(1);
      expect(rec[0].action).toBe('keep');
    });
  });

  describe('Daily Coach Retrospective', () => {
    it('should fallback to local retro engine when API key is missing', async () => {
      const tasks: Task[] = [
        {
          id: '1',
          title: 'Must Task',
          points: 3,
          priority: 'must',
          status: 'today',
          completed: true,
          createdAt: '',
        }
      ];
      const review = await generateDailyCoachRetrospective(tasks, mockSettings);
      expect(review).toContain('Outstanding Work today!');
    });
  });
});
