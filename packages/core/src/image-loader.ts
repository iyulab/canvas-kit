/**
 * Loads and caches HTMLImageElements by src so repeated renders (each of which may create a
 * fresh CanvasKitRenderer) don't re-fetch the same image, and lets an in-flight load notify
 * every interested caller once it resolves.
 */
export interface ImageLoader {
  /**
   * Returns the loaded image for `src`, or `null` if it hasn't finished loading yet (or failed).
   * `onLoad` is registered to be called once when this particular load completes; call
   * `getOrLoadImage` again afterwards to retrieve the now-loaded image.
   */
  getOrLoadImage(src: string, onLoad: () => void): HTMLImageElement | null;
}

interface CacheEntry {
  image: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
  listeners: Set<() => void>;
}

export function createImageLoader(
  createImageElement: () => HTMLImageElement = () => new Image()
): ImageLoader {
  const cache = new Map<string, CacheEntry>();

  return {
    getOrLoadImage(src: string, onLoad: () => void): HTMLImageElement | null {
      let entry = cache.get(src);

      if (!entry) {
        const image = createImageElement();
        entry = { image, loaded: false, failed: false, listeners: new Set() };
        cache.set(src, entry);

        image.onload = () => {
          entry!.loaded = true;
          const listeners = entry!.listeners;
          entry!.listeners = new Set();
          listeners.forEach(listener => listener());
        };
        image.onerror = () => {
          entry!.failed = true;
          entry!.listeners = new Set();
        };
        image.src = src;
      }

      if (entry.loaded) {
        return entry.image;
      }
      if (!entry.failed) {
        entry.listeners.add(onLoad);
      }
      return null;
    },
  };
}

export const defaultImageLoader = createImageLoader();
