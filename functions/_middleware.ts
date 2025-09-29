export const onRequest: PagesFunction = async ({ request, next }) => {
  const { pathname } = new URL(request.url);

  if (pathname.startsWith("/api/")) return next();

  return next();
};
