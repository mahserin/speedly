export function expressToSwagger(path: string): string {
  // مرحله 1: optional group ها رو unwrap کن
  // {/:newName} -> /:newName
  let normalized = path.replace(/\{([^}]+)\}/g, "$1");

  // مرحله 2: :param رو تبدیل کن به {param}
  normalized = normalized.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

  return normalized;
}
