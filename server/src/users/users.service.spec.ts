import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Profile-field tests for the optional username/gender/bio/phone additions:
 * username uniqueness (409), clearing with '', the profile-complete special
 * achievement hook, and auto-generated usernames at registration.
 */

const USER_ID = 7;

function baseUser(overrides: Partial<any> = {}) {
  return {
    id: USER_ID,
    email: 'dio@example.com',
    name: 'Dio Pratama',
    username: 'diopratama7',
    avatarUrl: null,
    gender: null,
    bio: null,
    phone: null,
    friendCode: 'ABC12345',
    ...overrides,
  };
}

function makeMocks(user = baseUser()) {
  const usersRepository = {
    findOne: jest.fn(async ({ where }: any) => {
      if ('id' in where) return user;
      return null; // username / friendCode lookups default to "free"
    }),
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (v: any) => v),
  };
  const deletionRequestRepo = {};
  const achievements = { awardBySlug: jest.fn(async () => []) };
  const service = new UsersService(
    usersRepository as any,
    deletionRequestRepo as any,
    achievements as any,
  );
  return { usersRepository, achievements, service, user };
}

describe('UsersService profile fields', () => {
  describe('updateProfile', () => {
    it('409s when the username is taken by another user', async () => {
      const m = makeMocks();
      m.usersRepository.findOne.mockImplementation(async ({ where }: any) => {
        if ('id' in where) return m.user;
        if ('username' in where) return { id: 999, username: where.username };
        return null;
      });
      await expect(
        m.service.updateProfile(USER_ID, { username: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('accepts keeping your own current username', async () => {
      const m = makeMocks();
      m.usersRepository.findOne.mockImplementation(async ({ where }: any) => {
        if ('id' in where) return m.user;
        if ('username' in where) return m.user; // taken — but by yourself
        return null;
      });
      const saved = await m.service.updateProfile(USER_ID, {
        username: 'DioPratama7', // normalized to lowercase
      });
      expect(saved.username).toBe('diopratama7');
    });

    it('sets gender, bio, and phone; empty strings clear back to null', async () => {
      const m = makeMocks(
        baseUser({ gender: 'male', bio: 'lama', phone: '0812' }),
      );
      const saved = await m.service.updateProfile(USER_ID, {
        gender: 'female',
        bio: '  Suka kopi.  ',
        phone: ' 081234567890 ',
      });
      expect(saved.gender).toBe('female');
      expect(saved.bio).toBe('Suka kopi.');
      expect(saved.phone).toBe('081234567890');

      const cleared = await m.service.updateProfile(USER_ID, {
        gender: '',
        bio: '',
        phone: '',
        username: '',
      });
      expect(cleared.gender).toBeNull();
      expect(cleared.bio).toBeNull();
      expect(cleared.phone).toBeNull();
      expect(cleared.username).toBeNull();
    });

    it('awards the profile-complete special once all fields are filled', async () => {
      const m = makeMocks(baseUser({ avatarUrl: 'https://cdn/x.jpg' }));
      await m.service.updateProfile(USER_ID, {
        username: 'diopratama7',
        gender: 'male',
        bio: 'Halo!',
      });
      expect(m.achievements.awardBySlug).toHaveBeenCalledWith(
        USER_ID,
        'special-profile-complete',
      );
    });

    it('does NOT award the special while the profile is incomplete', async () => {
      const m = makeMocks(baseUser({ avatarUrl: null })); // no photo
      await m.service.updateProfile(USER_ID, {
        username: 'diopratama7',
        gender: 'male',
        bio: 'Halo!',
      });
      expect(m.achievements.awardBySlug).not.toHaveBeenCalled();
    });

    it('still saves when the achievement hook throws', async () => {
      const m = makeMocks(baseUser({ avatarUrl: 'https://cdn/x.jpg' }));
      m.achievements.awardBySlug.mockRejectedValueOnce(new Error('boom'));
      await expect(
        m.service.updateProfile(USER_ID, {
          username: 'diopratama7',
          gender: 'male',
          bio: 'Halo!',
        }),
      ).resolves.toMatchObject({ id: USER_ID });
    });
  });

  describe('create', () => {
    it('auto-generates username = slug(name) + id', async () => {
      const m = makeMocks();
      // First save assigns the DB id; second persists the generated username.
      m.usersRepository.save
        .mockImplementationOnce(async (v: any) => ({ ...v, id: 9 }))
        .mockImplementationOnce(async (v: any) => v);

      const created = await m.service.create({
        email: 'dio@example.com',
        name: 'Dio Pratama!',
        passwordHash: 'x',
      });
      expect(created.username).toBe('diopratama9');
    });

    it('truncates long names so the handle stays within 30 chars', async () => {
      const m = makeMocks();
      m.usersRepository.save
        .mockImplementationOnce(async (v: any) => ({ ...v, id: 123456 }))
        .mockImplementationOnce(async (v: any) => v);

      const created = await m.service.create({
        email: 'long@example.com',
        name: 'Nama Yang Sangat Panjang Sekali Melebihi Batas',
        passwordHash: 'x',
      });
      expect(created.username!.length).toBeLessThanOrEqual(30);
      expect(created.username).toBe('namayangsangatpanjan123456'); // 20-char slug + id
    });
  });
});
