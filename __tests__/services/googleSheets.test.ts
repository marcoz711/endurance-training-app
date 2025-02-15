import { GoogleSheetsService } from '../../services/googleSheets';
import { ActivityLogEntry } from '../../types/activity';

jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({})),
    },
    sheets: jest.fn().mockImplementation(() => ({
      spreadsheets: {
        values: {
          get: jest.fn(),
          append: jest.fn(),
        },
      },
    })),
  },
}));

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;

  beforeEach(() => {
    service = new GoogleSheetsService();
  });

  describe('getActivityLog', () => {
    it('should return empty array when no data', async () => {
      const result = await service.getActivityLog();
      expect(result).toEqual([]);
    });

    // Add more tests...
  });
}); 