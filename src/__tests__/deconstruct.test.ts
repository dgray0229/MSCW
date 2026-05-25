import { deconstructTask, generateMockSubtasks } from '../lib/gemini';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('MSCW Phase 1 AI Task Decomposition Tests', () => {
  describe('generateMockSubtasks Fallback Selector', () => {
    it('should generate bug-specific checklists for bug keywords', () => {
      const subtasks = generateMockSubtasks('Fix the login page crash', 3);
      expect(subtasks.length).toBe(4);
      expect(subtasks[0]).toContain('Locate crash stack trace');
      expect(subtasks[2]).toContain('Apply code corrections');
    });

    it('should generate design-specific checklists for design/css/layout keywords', () => {
      const subtasks = generateMockSubtasks('Design modern dashboard landing page', 2);
      expect(subtasks.length).toBe(4);
      expect(subtasks[0]).toContain('Review Figma layouts');
      expect(subtasks[3]).toContain('Validate accessibility contrast');
    });

    it('should generate tech-debt-specific checklists for refactor/database/performance keywords', () => {
      const subtasks = generateMockSubtasks('Refactor state store to zustand', 5);
      expect(subtasks.length).toBe(4);
      expect(subtasks[0]).toContain('Audit existing module files');
      expect(subtasks[2]).toContain('Apply indexing, schema upgrades, or standard library refactors');
    });

    it('should generate complexity-appropriate feature subtasks for high-point catchalls', () => {
      const subtasks = generateMockSubtasks('Implement new push notifications module', 8);
      expect(subtasks.length).toBe(5);
      expect(subtasks[0]).toContain('Research architectural architecture');
      expect(subtasks[4]).toContain('Execute complete end-to-end integration checklist');
    });

    it('should generate shorter checklists for low-point catchalls', () => {
      const subtasks = generateMockSubtasks('Add a simple analytics event', 1);
      expect(subtasks.length).toBe(3);
      expect(subtasks[0]).toContain('Define simple input requirements');
      expect(subtasks[2]).toContain('Verify clean visual transition');
    });
  });

  describe('deconstructTask API Layer', () => {
    it('should gracefully fallback to generateMockSubtasks if API call fails or key is missing', async () => {
      const subtasks = await deconstructTask('Broken DB Connection Error', 5);
      expect(subtasks.length).toBe(4);
      expect(subtasks[0]).toContain('Locate crash stack trace');
    });
  });
});
