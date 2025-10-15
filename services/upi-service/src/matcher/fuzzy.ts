import jaroWinkler from 'jaro-winkler';
import levenshtein from 'fast-levenshtein';

// basic scoring: name similarity + DOB exact + address similarity
export function computeMatchConfidence(candidateName: string | null, targetName: string | null, candidateDob: string | null, targetDob: string | null, candidateAddress: string | null, targetAddress: string | null) : number {
  let score = 0;
  if (candidateName && targetName) {
    const nameScore = jaroWinkler(candidateName.toLowerCase(), targetName.toLowerCase());
    score += nameScore * 0.6; // weight
  }
  if (candidateDob && targetDob) {
    score += (candidateDob === targetDob) ? 0.3 : 0;
  }
  if (candidateAddress && targetAddress) {
    const lev = levenshtein.get(candidateAddress.toLowerCase(), targetAddress.toLowerCase());
    const maxLen = Math.max(candidateAddress.length, targetAddress.length) || 1;
    const addrScore = 1 - (lev / maxLen);
    score += addrScore * 0.1;
  }
  return Math.min(1, score);
}
