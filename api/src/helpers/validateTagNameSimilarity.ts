export default function validateTagNameSimilarity(tag: string, name: string): string {
  if (!tag || !name) return '';
  const t = tag.toLowerCase();
  const n = name.toLowerCase().replace(/\s+/g, '');
  if (n.length === 0) return '';

  const firstIsDigit = /[0-9]/.test(t[0]);
  if (firstIsDigit) {
    if (!n.includes(t[0])) {
      return 'Tag and name must start with the same character';
    }
  } else if (t[0] !== n[0]) {
    return 'Tag and name must start with the same character';
  }

  let wildcards = 0;
  for (let i = 1; i < t.length; i++) {
    if (!n.includes(t[i])) {
      wildcards++;
      if (wildcards > 1) {
        return 'Tag and name are too different from each other';
      }
    }
  }
  return '';
}
