/**
 * Builds a RegExp to match product.children against a subcategory slug.
 * Used for filtering products by subcategory in shop.
 */
export const buildSubcategoryRegex = (slug) => {
  if (!slug || typeof slug !== 'string') return null;
  const subcategory = slug.trim();
  if (!subcategory) return null;

  const parts = subcategory.split('-');
  const patternParts = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isNumber = /^\d+$/.test(part);

    if (isNumber) {
      const nextIsNumber = i + 1 < parts.length && /^\d+$/.test(parts[i + 1]);

      if (nextIsNumber) {
        let numberSequence = [part];
        let j = i + 1;
        while (j < parts.length && /^\d+$/.test(parts[j])) {
          numberSequence.push(parts[j]);
          j++;
        }
        if (numberSequence.length > 1) {
          if (numberSequence.length === 2 && numberSequence[0].length === 1 && numberSequence[1].length === 2) {
            const [firstNum, secondNum] = numberSequence;
            patternParts.push(`__NUMSEQ_${firstNum}-${secondNum[0]}-${secondNum[1]}__`);
          } else {
            patternParts.push(`__NUMSEQ_${numberSequence.join('-')}__`);
          }
          i = j - 1;
        } else {
          patternParts.push(part);
        }
      } else {
        patternParts.push(part);
      }
    } else {
      patternParts.push(part);
    }
  }

  const finalPatternParts = [];
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    if (part.startsWith('__NUMSEQ_') && part.endsWith('__')) {
      const numMatch = part.match(/__NUMSEQ_(\d+)-(\d+)-(\d+)__/);
      if (numMatch) {
        const [, n1, n2, n3] = numMatch;
        const escapedN1 = n1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedN2 = n2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedN3 = n3.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        finalPatternParts.push(`${escapedN1}[\\s/\\-]+${escapedN2}[\\s/\\-]+${escapedN3}`);
      } else {
        const numMatch2 = part.match(/__NUMSEQ_(\d+)-(\d+)__/);
        if (numMatch2) {
          const [, n1, n2] = numMatch2;
          const escapedN1 = n1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedN2 = n2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          if (n1.length === 1 && n2.length === 2) {
            const n2First = n2[0];
            const n2Second = n2[1];
            finalPatternParts.push(`${escapedN1}([\\s]+${n2First}\\/${n2Second}|[\\s\\-]+${n2})`);
          } else {
            finalPatternParts.push(`${escapedN1}[\\s/\\-]+${escapedN2}`);
          }
        }
      }
    } else {
      let processedPart = part;
      if (processedPart.toLowerCase() === 'and') {
        processedPart = '(&|and)';
      } else {
        processedPart = processedPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
      finalPatternParts.push(processedPart);
    }
  }

  let finalPattern = finalPatternParts.join('[\\s/\\-"\']+');
  finalPattern = '["\']?' + finalPattern + '["\']?';
  return new RegExp(`^${finalPattern}$`, 'i');
};
