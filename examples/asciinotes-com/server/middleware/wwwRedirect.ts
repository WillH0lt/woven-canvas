export default defineEventHandler((event): string | undefined => {
  const headers = getRequestHeaders(event);
  const host = headers.host ?? '';

  // Check if the host starts with 'www.'
  if (host.startsWith('www.')) {
    // Create the non-www URL for redirection
    const protocol = headers['x-forwarded-proto'] ?? 'http';
    const newHost = host.replace(/^www\./, '');

    // Convert query object to string
    const queryObj = getQuery(event);
    const queryString =
      Object.keys(queryObj).length > 0
        ? `?${new URLSearchParams(queryObj as Record<string, string>).toString()}`
        : '';

    const redirectUrl = `${protocol}://${newHost}${event.path}${queryString}`;

    // Send a 301 (permanent) redirect
    setResponseStatus(event, 301);
    setResponseHeaders(event, {
      Location: redirectUrl,
      'Cache-Control': 'max-age=86400', // Optional: cache the redirect for 24 hours
    });

    return 'Redirecting to non-www domain';
  }

  return undefined;
});
