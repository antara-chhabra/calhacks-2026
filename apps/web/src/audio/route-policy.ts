/** Only an explicitly opened arena owns sound; results, receipts and market pages stay silent. */
export const isArenaAudioPath = (pathname: string): boolean => /^\/match\/[^/]+\/?$/.test(pathname) || /^\/replay\/[^/]+\/?$/.test(pathname);
