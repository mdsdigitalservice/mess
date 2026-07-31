// Limitador em memória — suficiente para uma única instância Node na VPS
// (é exatamente esse o cenário aqui: sem load balancer, sem múltiplos processos).
// Se algum dia isso escalar para várias instâncias, trocar por um contador no Redis.
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

// Evita crescimento sem fim do Map em processos de longa duração.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 10 * 60 * 1000).unref();
