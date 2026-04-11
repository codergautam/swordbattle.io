// "First-letter + loose contains, with one wildcard."
//
// 1. Lowercase tag and (space-stripped) name.
// 2. The first character of the tag must equal the first character of the name.
//    Special case: if tag[0] is a digit, it just needs to appear ANYWHERE in the name.
// 3. Of the remaining tag chars, AT MOST ONE may be absent from the name. The rest
//    must each appear somewhere in the name.
//
// Passes: TZ/TenZero, TX/Terror, 2EX/Extreme 2
// Fails:  LMN/Element, HCN/ClanSuperAwesome
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
