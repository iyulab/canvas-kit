import type { DrawingObject } from './types';
import { HitTest } from './hit-test';

export class Scene {
  private objects: DrawingObject[] = [];
  private idCounter = 0;

  add(obj: DrawingObject): void {
    if (!obj || typeof obj !== 'object') {
      console.warn('Invalid object provided to Scene.add()');
      return;
    }

    if (!obj.type) {
      console.warn('Object must have a type property');
      return;
    }

    // ID가 없는 경우 자동 생성
    if (!obj.id) {
      obj.id = `${obj.type}-${++this.idCounter}`;
    }

    this.objects.push(obj);
  }

  remove(obj: DrawingObject): void {
    if (!obj) {
      console.warn('Invalid object provided to Scene.remove()');
      return;
    }

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

  /**
   * 주어진 좌표에서 객체를 찾음
   */
  getObjectAtPoint(x: number, y: number): DrawingObject | null {
    return HitTest.getTopObjectAtPoint(x, y, this.objects);
  }

  /**
   * 주어진 좌표에서 충돌하는 모든 객체를 찾음
   */
  getObjectsAtPoint(x: number, y: number): DrawingObject[] {
    return HitTest.getObjectsAtPoint(x, y, this.objects);
  }

  /**
   * Scene의 복사본을 생성
   */
  copy(): Scene {
    const newScene = new Scene();
    newScene.objects = [...this.objects.map(obj => ({ ...obj }))];
    newScene.idCounter = this.idCounter;
    return newScene;
  }

  /**
   * 객체 업데이트
   */
  updateObject(oldObj: DrawingObject, newObj: DrawingObject): void {
    const index = this.objects.indexOf(oldObj);
    if (index > -1) {
      this.objects[index] = newObj;
    }
  }
}