import { containsProfanity } from './profanityFilter';

const forbiddenTags = new Set([
  'DEV', 'ADMIN', 'OWNER', 'CODER', 'MOD', 'STAFF', 'OP', 'GM',
]);

export default function validateClanTag(tag: string): string {
  if (typeof tag !== 'string') return 'Invalid clan tag';
  if (tag === '__proto__' || tag === 'constructor' || tag === 'prototype') {
    return 'Clan tag is not allowed';
  }
  if (tag.length < 1 || tag.length > 4) {
    return 'Clan tag must be between 1 and 4 characters';
  }
  if (!/^[A-Za-z0-9]+$/.test(tag)) {
    return 'Clan tag can only contain letters and numbers';
  }
  if (forbiddenTags.has(tag.toUpperCase())) {
    return 'Clan tag is not allowed';
  }
  if (containsProfanity(tag)) {
    return 'Clan tag contains a bad word!\nIf this is a mistake, please contact an admin.';
  }
  return '';
}
