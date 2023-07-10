module.exports = {
  collides(object1, object2) {
    const object1Circle = object1.radius !== undefined;
    const object2Circle = object2.radius !== undefined;
    const object1Rect = object1.width !== undefined;
    const object2Rect = object2.width !== undefined;
    if (object1Circle && object2Circle) {
      return this.circleCircle(object1, object2);
    }
    if (object1Circle && object2Rect) {
      return this.circleRectangle(object1, object2);
    }
    if (object1Rect && object2Circle) {
      return this.circleRectangle(object2, object1);
    }
    if (object1Rect && object2Rect) {
      return this.rectangleRectangle(object1, object2);
    }
    return null;
  },

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  },

  distanceToRectangle(x, y, rectX, rectY, rectWidth, rectHeight) {
    const dx = x - Math.max(Math.min(x, rectX + rectWidth), rectX);
    const dy = y - Math.max(Math.min(y, rectY + rectHeight), rectY);
    return Math.sqrt(dx ** 2 + dy ** 2);
  },

  circleCircle(circle1, circle2) {
    const distance = this.distance(circle1.x, circle1.y, circle2.x, circle2.y);
    return distance <= circle1.radius + circle2.radius;
  },

  circleRectangle(circle, rect) {
    const dx = circle.x - Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const dy = circle.y - Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    return (dx ** 2 + dy ** 2) <= (circle.radius ** 2);
  },

  rectangleRectangle(rect1, rect2) {
    return rect1.x <= rect2.x + rect2.width
      && rect2.x <= rect1.x + rect1.width
      && rect1.y <= rect2.y + rect2.height
      && rect2.y <= rect1.y + rect1.height;
  },

  getCircleBoundary(x, y, radius) {
    return {
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
    };
  },
};
