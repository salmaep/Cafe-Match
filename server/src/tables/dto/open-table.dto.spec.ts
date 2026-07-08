import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { OpenTableDto } from './open-table.dto';

/** Locks the host-chosen capacity contract: 1–200 guests. */
describe('OpenTableDto', () => {
  async function errorsFor(payload: Record<string, unknown>) {
    const dto = plainToInstance(OpenTableDto, { cafeId: 1, ...payload });
    return validate(dto);
  }

  it('accepts the maximum capacity of 200', async () => {
    expect(await errorsFor({ maxGuests: 200 })).toHaveLength(0);
  });

  it('accepts the minimum capacity of 1 and omitting maxGuests', async () => {
    expect(await errorsFor({ maxGuests: 1 })).toHaveLength(0);
    expect(await errorsFor({})).toHaveLength(0);
  });

  it('rejects 201 (above the cap) and 0/negative', async () => {
    expect(await errorsFor({ maxGuests: 201 })).not.toHaveLength(0);
    expect(await errorsFor({ maxGuests: 0 })).not.toHaveLength(0);
    expect(await errorsFor({ maxGuests: -3 })).not.toHaveLength(0);
  });

  it('rejects non-integer capacities', async () => {
    expect(await errorsFor({ maxGuests: 4.5 })).not.toHaveLength(0);
  });

  it('rejects unknown gender rules and over-long titles', async () => {
    expect(await errorsFor({ genderRule: 'aliens_only' })).not.toHaveLength(0);
    expect(await errorsFor({ title: 'x'.repeat(101) })).not.toHaveLength(0);
    expect(await errorsFor({ title: 'x'.repeat(100) })).toHaveLength(0);
  });
});
