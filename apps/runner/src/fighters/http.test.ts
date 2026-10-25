import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import type { lookup } from 'node:dns/promises';
import type { request } from 'node:https';
import { postByo, publicAddress } from './http.js';

describe('BYO outbound protection', () => {
  it('rejects local, metadata, private, mapped and reserved endpoints', () => {
    for (const ip of ['127.0.0.1', '0.0.0.0', '10.2.3.4', '100.64.0.1', '169.254.169.254', '172.16.0.1', '192.168.0.1', '198.18.0.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', '2001:db8::1', '2002:7f00:1::1']) expect(publicAddress(ip)).toBe(false);
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) expect(publicAddress(ip)).toBe(true);
  });
  it('rejects HTTP, URL credentials and direct loopback before sending a token', async () => {
    for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://[::1]']) await expect(postByo(url, { token: 'private' }, new AbortController().signal)).rejects.toThrow();
  });
  it('rejects mixed public/private DNS responses before creating an HTTP request', async () => {
    const dns = vi.fn(async () => [{ address: '8.8.8.8', family: 4 }, { address: '127.0.0.1', family: 4 }]) as unknown as typeof lookup;
    const send = vi.fn() as unknown as typeof request;
    await expect(postByo('https://fighter.example', { token: 'private' }, new AbortController().signal, { lookup: dns, request: send })).rejects.toThrow('public addresses');
    expect(send).not.toHaveBeenCalled();
  });
  it('pins validated DNS, accepts 202, rejects redirects and caps response bytes', async () => {
    for (const status of [202, 302, 413]) {
      const dns = vi.fn(async () => [{ address: '8.8.8.8', family: 4 }]) as unknown as typeof lookup;
      let options: Record<string, unknown> | undefined;
      const send = vi.fn((_url, opts, callback) => {
        options = opts;
        const req = new EventEmitter() as EventEmitter & { end: () => void };
        req.end = () => {
          const res = new EventEmitter() as EventEmitter & { statusCode: number; destroy: (e: Error) => void };
          res.statusCode = status; res.destroy = (e) => res.emit('error', e);
          callback(res);
          queueMicrotask(() => { res.emit('data', Buffer.alloc(status === 413 ? 65_537 : 8)); res.emit('end'); });
        };
        return req;
      }) as unknown as typeof request;
      const result = postByo('https://fighter.example', { token: 'private' }, new AbortController().signal, { lookup: dns, request: send });
      if (status === 202) await expect(result).resolves.toBeUndefined(); else await expect(result).rejects.toThrow();
      const pinned = vi.fn();
      (options!.lookup as (...args: unknown[]) => void)('fighter.example', {}, pinned);
      expect(pinned).toHaveBeenCalledWith(null, '8.8.8.8', 4);
    }
  });
});
