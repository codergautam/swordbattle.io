import {
  faKey, faGaugeHigh, faBug, faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export type SupportField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  body?: boolean;
};

export type SupportCategory = {
  id: string;
  title: string;
  blurb: string;
  icon: IconDefinition;
  attachDevice?: boolean;
  fields: SupportField[];
};

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'password',
    title: 'Reset a password',
    blurb: 'Give us the exact username on the account and the email you signed up with (if you added one). We will send the reset there or reply right here.',
    icon: faKey,
    fields: [
      { key: 'username', label: 'Account username', type: 'text', placeholder: 'Your exact in game name', required: true },
      { key: 'email', label: 'Email on the account (if you set one)', type: 'text', placeholder: 'you@example.com' },
      { key: 'body', label: 'Anything else that helps', type: 'textarea', placeholder: 'Roughly when you made the account, when you last got in, that kind of thing.', body: true },
    ],
  },
  {
    id: 'lag',
    title: 'Report lag',
    blurb: 'Seeing how players experience lag helps us find the problems that occur out-of-testing. Tell us your device, your internet, etc to give us proper info.',
    icon: faGaugeHigh,
    attachDevice: true,
    fields: [
      { key: 'when', label: 'When does it lag', type: 'select', options: ['All the time', 'Long freezes', 'Random spikes', 'Only at the start'] },
      { key: 'body', label: 'Tell us more', type: 'textarea', placeholder: 'What device are you on? Wifi or wired? Does it happen in other games too?', body: true, required: true },
    ],
  },
  {
    id: 'bug',
    title: 'Report a bug',
    blurb: 'Tell us what broke and how to make it happen again. Steps help a ton, and you can attach a screenshot right here.',
    icon: faBug,
    attachDevice: true,
    fields: [
      { key: 'body', label: 'What went wrong', type: 'textarea', placeholder: 'What happened, and what did you expect instead?', body: true, required: true },
      { key: 'steps', label: 'How do we make it happen', type: 'textarea', placeholder: '1. ...\n2. ...\n3. ...' },
      { key: 'frequency', label: 'How often', type: 'select', options: ['Every time', 'Sometimes', 'Happened once'] },
    ],
  },
  {
    id: 'other',
    title: 'Something else',
    blurb: 'Anything that does not fit the other boxes, like issues with balancing, questions about the game, or even just suggestions for improvement. Give us as much detail as you can and we will figure it out.',
    icon: faCircleQuestion,
    fields: [
      { key: 'subject', label: 'Subject', type: 'text', placeholder: 'What is this about', required: true },
      { key: 'body', label: 'Your message', type: 'textarea', placeholder: 'Tell us everything that helps', body: true, required: true },
    ],
  },
];

export function categoryById(id: string): SupportCategory | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.id === id);
}

export function categoryTitle(id: string): string {
  return categoryById(id)?.title || 'Support';
}
