// The real MeiliCafesService transitively imports the ESM-only `meilisearch`
// package which jest can't parse — stub the module before CafesService loads
// (we inject our own mock instance anyway).
jest.mock('../meili/meili-cafes.service', () => ({
  MeiliCafesService: class MeiliCafesService {},
}));

import { CafesService } from './cafes.service';

/**
 * Zero-result search logging: only meaningful searches (query or filters)
 * with 0 hits get persisted; the insert is fire-and-forget and must never
 * affect the search result, even when the DB write fails.
 */

function makeMocks({ total = 0 } = {}) {
  const dataSource = { query: jest.fn(async () => []) };
  const meili = {
    searchCafes: jest.fn(async () => ({
      data: [],
      meta: { page: 1, limit: 7, total },
    })),
  };
  const service = new CafesService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    dataSource as any,
    meili as any,
  );
  return { dataSource, meili, service };
}

const flush = () => new Promise((r) => setImmediate(r));

describe('CafesService zero-result logging', () => {
  it('logs a zero-result text search with q, normalized q, geo, and userId', async () => {
    const { dataSource, service } = makeMocks();
    await service.search(
      { q: '  Kopi Hilang  ', lat: -6.9, lng: 107.6, radius: 2000 } as any,
      42,
    );
    await flush();

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    const [sql, params] = dataSource.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO search_zero_results');
    expect(sql).toContain('NOT EXISTS'); // 10-minute dedupe guard
    expect(params[0]).toBe('  Kopi Hilang  '); // raw q
    expect(params[1]).toBe('kopi hilang'); // q_norm
    expect(params[2]).toBe(-6.9);
    expect(params[3]).toBe(107.6);
    expect(params[9]).toBe(42); // userId
    expect(params[10]).toBe('kopi hilang'); // dedupe key param
  });

  it('logs filter-only searches too (facilities without q)', async () => {
    const { dataSource, service } = makeMocks();
    await service.search({ facilities: ['wifi'], lat: 0, lng: 0 } as any);
    await flush();
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    const [, params] = dataSource.query.mock.calls[0];
    expect(params[5]).toBe(JSON.stringify(['wifi']));
    expect(params[9]).toBeNull(); // anonymous
  });

  it('does NOT log pure geo browsing (no intent signal)', async () => {
    const { dataSource, service } = makeMocks();
    await service.search({ lat: -6.9, lng: 107.6, radius: 2000 } as any);
    await flush();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('does NOT log searches that returned results', async () => {
    const { dataSource, service } = makeMocks({ total: 12 });
    await service.search({ q: 'kopi', lat: 0, lng: 0 } as any);
    await flush();
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('never breaks the search when the logging insert fails', async () => {
    const { dataSource, service } = makeMocks();
    dataSource.query.mockRejectedValueOnce(new Error('db down'));
    const result = await service.search({ q: 'kopi', lat: 0, lng: 0 } as any);
    await flush();
    expect(result.meta.total).toBe(0); // search resolved normally
  });
});
