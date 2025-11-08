export default defineNuxtRouteMiddleware(async (to) => {
  const user = await getCurrentUser();
  if (user === null) {
    return navigateTo({ path: "/", query: { redirect: to.fullPath } });
  }

  return true;
});
