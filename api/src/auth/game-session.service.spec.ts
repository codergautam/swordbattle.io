import { GameSessionService } from './game-session.service';

describe('GameSessionService', () => {
  let now: number;
  let repository: any;
  let service: GameSessionService;

  beforeEach(() => {
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    repository = {
      query: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new GameSessionService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('atomically acquires an expired or absent account lease', async () => {
    repository.query.mockResolvedValue([{ lease_id: 'created' }]);

    const result = await service.acquire(42, 'west/1', 'tab one');

    expect(result.acquired).toBe(true);
    expect(repository.query).toHaveBeenCalledTimes(1);
    const params = repository.query.mock.calls[0][1];
    expect(params[0]).toBe(42);
    expect(params[2]).toBe('west1');
    expect(params[3]).toBe('tabone');
  });

  it('rejects a competing live lease and reports its remaining lifetime', async () => {
    repository.query.mockResolvedValue([]);
    repository.findOne.mockResolvedValue({
      accountId: 42,
      expiresAt: new Date(now + 12_000),
    });

    const result = await service.acquire(42, 'west', 'other-tab');

    expect(result).toEqual({ acquired: false, retryAfterMs: 12_000 });
  });

  it('heartbeats and releases only the matching lease owner', async () => {
    repository.update.mockResolvedValue({ affected: 1 });
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.heartbeat(42, 'lease-a', 'west')).resolves.toBe(true);
    await expect(service.release(42, 'lease-a', 'west')).resolves.toBe(true);

    expect(repository.update.mock.calls[0][0]).toEqual({
      accountId: 42,
      leaseId: 'lease-a',
      serverId: 'west',
    });
    expect(repository.delete.mock.calls[0][0]).toEqual({
      accountId: 42,
      leaseId: 'lease-a',
      serverId: 'west',
    });
  });
});
