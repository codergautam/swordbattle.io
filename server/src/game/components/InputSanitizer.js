const Types = require('../Types');

const VALID_INPUTS = new Set(Object.values(Types.Input));
const MAX_INPUT_EVENTS = 16;
const MAX_MOUSE_FORCE = 150;

function normalizeAngle(value) {
  const angle = Number(value);
  if (!Number.isFinite(angle)) return null;
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function sanitizeInputEvents(inputs) {
  if (!Array.isArray(inputs)) return [];

  const sanitized = [];
  for (const input of inputs.slice(0, MAX_INPUT_EVENTS)) {
    const inputType = Number(input?.inputType);
    if (!Number.isInteger(inputType) || !VALID_INPUTS.has(inputType)) continue;
    sanitized.push({ inputType, inputDown: input?.inputDown === true });
  }
  return sanitized;
}

function sanitizeMouse(mouse) {
  if (!mouse || typeof mouse !== 'object') return null;

  const angle = normalizeAngle(mouse.angle);
  const force = Number(mouse.force);
  if (angle === null || !Number.isFinite(force)) return null;

  return {
    angle,
    force: Math.max(0, Math.min(MAX_MOUSE_FORCE, force)),
  };
}

module.exports = {
  MAX_INPUT_EVENTS,
  MAX_MOUSE_FORCE,
  normalizeAngle,
  sanitizeInputEvents,
  sanitizeMouse,
};
