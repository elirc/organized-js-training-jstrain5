export function hashToBucket(flagKey: string, customerId: string) {
  const source = `${flagKey}:${customerId}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}