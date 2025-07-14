import type { DrawingObject } from './types';

export class Scene {
  private objects: DrawingObject[] = [];

  add(obj: DrawingObject): void {
    this.objects.push(obj);
  }

  remove(obj: DrawingObject): void {
    const index = this.objects.indexOf(obj);
    if (index > -1) {
      this.objects.splice(index, 1);
    }
  }

  getObjects(): readonly DrawingObject[] {
    return this.objects;
  }

  clear(): void {
    this.objects = [];
  }
}