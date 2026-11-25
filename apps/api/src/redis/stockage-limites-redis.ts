import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

/**
 * Compte les requêtes dans Redis en une seule opération (script Lua) : deux requêtes
 * simultanées ne peuvent pas se glisser entre la lecture et l'écriture du compteur.
 * Renvoie [nombre de requêtes, ms avant remise à zéro, bloqué (1/0), ms de blocage restant].
 */
const SCRIPT = `
local blocage = redis.call('PTTL', KEYS[2])
if blocage > 0 then
  return { tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('PTTL', KEYS[1]), 1, blocage }
end
local total = redis.call('INCR', KEYS[1])
if total == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
if total > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  return { total, redis.call('PTTL', KEYS[1]), 1, tonumber(ARGV[3]) }
end
return { total, redis.call('PTTL', KEYS[1]), 0, 0 }
`;

/** Rangement des compteurs de @nestjs/throttler dans Redis (survit aux redémarrages de l'API). */
export class StockageLimitesRedis implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    cle: string,
    dureeMs: number,
    limite: number,
    dureeBlocageMs: number,
    nomLimite: string,
  ) {
    const prefixe = `limite:${nomLimite}:${cle}`;
    const [total, avantRemise, bloque, blocageRestant] = (await this.redis.eval(
      SCRIPT,
      2,
      prefixe,
      `${prefixe}:bloque`,
      dureeMs,
      limite,
      dureeBlocageMs,
    )) as [number, number, number, number];

    // @nestjs/throttler attend des secondes (en-têtes Retry-After, X-RateLimit-Reset).
    return {
      totalHits: total,
      timeToExpire: Math.max(0, Math.ceil(avantRemise / 1000)),
      isBlocked: bloque === 1,
      timeToBlockExpire: Math.ceil(blocageRestant / 1000),
    };
  }
}
