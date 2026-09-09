const normalizeProductImageSrc = (value: string): string => {
  if (!value) return value;

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      const firstUrl = parsed.find(
        (item): item is string => typeof item === "string" && item.length > 0
      );

      return firstUrl || value;
    }
  } catch {
    // Existing single-image URLs are already valid.
  }

  return value;
};

if (typeof window !== "undefined" && typeof HTMLImageElement !== "undefined") {
  const srcDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "src"
  );

  if (srcDescriptor?.get && srcDescriptor?.set) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: srcDescriptor.configurable,
      enumerable: srcDescriptor.enumerable,
      get: srcDescriptor.get,
      set(value: string) {
        srcDescriptor.set!.call(this, normalizeProductImageSrc(value));
      },
    });
  }

  const originalSetAttribute = HTMLImageElement.prototype.setAttribute;

  HTMLImageElement.prototype.setAttribute = function (name, value) {
    if (name.toLowerCase() === "src") {
      originalSetAttribute.call(
        this,
        name,
        normalizeProductImageSrc(value)
      );
      return;
    }

    originalSetAttribute.call(this, name, value);
  };
}

export default normalizeProductImageSrc;
