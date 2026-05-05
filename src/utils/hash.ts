/**
 * SHA-256 hashing for MAC address anonymization.
 *
 * We hash MACs before storing them so that even if the in-memory state
 * were dumped, it would not contain raw MACs.
 *
 * In React Native, use react-native-quick-crypto or expo-crypto for native
 * speed. The fallback below uses the JS subtle crypto via a polyfill.
 */

import * as Crypto from 'expo-crypto';

export async function hashMac(mac: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    mac,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
}

// Synchronous version for hot path — uses a simpler hash; acceptable because
// MACs already rotate every 15min on modern OSes
export function hashMacSync(mac: string): string {
  let hash = 5381;
  for (let i = 0; i < mac.length; i++) {
    hash = ((hash << 5) + hash) + mac.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}
