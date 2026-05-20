type BasicAuthEnv = {
  APP_BASIC_AUTH_USER?: string;
  APP_BASIC_AUTH_PASSWORD?: string;
};

export function isBasicAuthConfigured(env: BasicAuthEnv) {
  return Boolean(env.APP_BASIC_AUTH_USER && env.APP_BASIC_AUTH_PASSWORD);
}

export function isBasicAuthAllowed(headers: Headers, env: BasicAuthEnv) {
  if (!isBasicAuthConfigured(env)) return true;

  const authorization = headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) return false;

  const encoded = authorization.slice("Basic ".length).trim();
  const decoded = decodeBasicAuth(encoded);
  if (!decoded) return false;

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return username === env.APP_BASIC_AUTH_USER && password === env.APP_BASIC_AUTH_PASSWORD;
}

function decodeBasicAuth(encoded: string) {
  try {
    return atob(encoded);
  } catch {
    return null;
  }
}
