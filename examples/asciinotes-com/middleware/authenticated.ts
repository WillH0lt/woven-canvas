export default defineNuxtRouteMiddleware(async (to) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const user = await getCurrentUser();
  if (user === null) {
    return navigateTo({ path: '/', query: { redirect: to.fullPath } });
  }

  return true;
});
