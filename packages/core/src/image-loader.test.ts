import { describe, it, expect, vi } from 'vitest';
import { createImageLoader } from './image-loader';

// A controllable stand-in for HTMLImageElement — lets tests trigger load/error deterministically
// instead of depending on jsdom's (nonexistent) image-loading network stack.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
}

describe('createImageLoader', () => {
  it('returns null and starts loading on first request for a src', () => {
    const images: FakeImage[] = [];
    const loader = createImageLoader(() => {
      const img = new FakeImage();
      images.push(img);
      return img as unknown as HTMLImageElement;
    });

    const result = loader.getOrLoadImage('a.png', vi.fn());

    expect(result).toBeNull();
    expect(images).toHaveLength(1);
    expect(images[0].src).toBe('a.png');
  });

  it('returns the image once it has loaded', () => {
    let fakeImage: FakeImage;
    const loader = createImageLoader(() => {
      fakeImage = new FakeImage();
      return fakeImage as unknown as HTMLImageElement;
    });

    loader.getOrLoadImage('a.png', vi.fn());
    fakeImage!.onload!();

    const result = loader.getOrLoadImage('a.png', vi.fn());
    expect(result).toBe(fakeImage!);
  });

  it('calls onLoad exactly once when the image finishes loading', () => {
    let fakeImage: FakeImage;
    const loader = createImageLoader(() => {
      fakeImage = new FakeImage();
      return fakeImage as unknown as HTMLImageElement;
    });
    const onLoad = vi.fn();

    loader.getOrLoadImage('a.png', onLoad);
    expect(onLoad).not.toHaveBeenCalled();

    fakeImage!.onload!();
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('notifies every caller that requested the same in-flight src', () => {
    let fakeImage: FakeImage;
    const loader = createImageLoader(() => {
      fakeImage = new FakeImage();
      return fakeImage as unknown as HTMLImageElement;
    });
    const onLoadA = vi.fn();
    const onLoadB = vi.fn();

    loader.getOrLoadImage('a.png', onLoadA);
    loader.getOrLoadImage('a.png', onLoadB);
    fakeImage!.onload!();

    expect(onLoadA).toHaveBeenCalledTimes(1);
    expect(onLoadB).toHaveBeenCalledTimes(1);
  });

  it('only creates one underlying image element per src, even across many requests', () => {
    const images: FakeImage[] = [];
    const loader = createImageLoader(() => {
      const img = new FakeImage();
      images.push(img);
      return img as unknown as HTMLImageElement;
    });

    loader.getOrLoadImage('a.png', vi.fn());
    loader.getOrLoadImage('a.png', vi.fn());
    loader.getOrLoadImage('b.png', vi.fn());

    expect(images).toHaveLength(2);
  });

  it('keeps returning null for a src whose load failed, without throwing', () => {
    let fakeImage: FakeImage;
    const loader = createImageLoader(() => {
      fakeImage = new FakeImage();
      return fakeImage as unknown as HTMLImageElement;
    });
    const onLoad = vi.fn();

    loader.getOrLoadImage('broken.png', onLoad);
    fakeImage!.onerror!();

    expect(loader.getOrLoadImage('broken.png', vi.fn())).toBeNull();
    expect(onLoad).not.toHaveBeenCalled();
  });
});
