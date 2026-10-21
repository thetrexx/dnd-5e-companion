// Last in-app route before Settings, so Back never leaves the app.
let last: string | null = null;
export const lastInAppRoute = () => last;
export const rememberRoute = (hash: string) => { if (hash && hash !== '#/settings') last = hash; };
