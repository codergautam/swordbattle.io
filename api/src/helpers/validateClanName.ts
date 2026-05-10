import { containsProfanity } from './profanityFilter';

const forbiddenNames = new Set([
  'admin', 'administrator', 'developer', 'developers', 'staff', 'mod', 'moderator',
  'owner', 'official', 'system',
]);

export default function validateClanName(name: string): string {
  if (typeof name !== 'string') return 'Invalid clan name';
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
    return 'Clan name is not allowed';
  }
  if (name !== name.trim()) {
    return 'Clan name cannot start or end with spaces';
  }
  if (name.length < 1 || name.length > 25) {
    return 'Clan name must be between 1 and 25 characters';
  }
  if (!/^[A-Za-z0-9 ]+$/.test(name)) {
    return 'Clan name can only contain letters, numbers, and spaces';
  }
  if (/ {2,}/.test(name)) {
    return 'Clan name cannot contain consecutive spaces';
  }
  if (forbiddenNames.has(name.toLowerCase())) {
    return 'Clan name is not allowed';
  }
  if (containsProfanity(name)) {
    return 'Clan name contains a bad word!\nIf this is a mistake, please contact an admin.';
  }
  return '';
}
