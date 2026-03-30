function hasOwnProperties(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) return true;
  }
  return false;
}

const empty = Object.freeze({});

class State {
  constructor(createFields) {
    this.createFields = createFields;
    this.fields = {};
    this.previousFields = {};
    this.updated = false;
    this.changed = null;
    this.changes = null;
  }

  get() {
    if (!this.updated) {
      this.update(this.createFields());
      this.updated = true;
    }
    return this.fields;
  }

  update(fields) {
    this.previousFields = this.fields;
    this.fields = fields;
    // Clear the cache only if the fields have been updated.
    this.changed = null;
    this.changes = null;
  }

  hasChanged(fields = this.fields, previousFields = this.previousFields) {
    if (this.changed !== null) {
      return this.changed;
    }

    const isRoot = fields === this.fields;
    const prev = previousFields || empty;
    let changed = false;

    for (const key in fields) {
      const val = fields[key];
      const prevVal = prev[key];

      if (val === prevVal) continue;

      if (Array.isArray(val)) {
        if (!prevVal || val.length !== prevVal.length) {
          changed = true;
          break;
        }
        for (let i = 0; i < val.length; i++) {
          if (val[i] !== prevVal[i]) {
            changed = true;
            break;
          }
        }
        if (changed) break;
      } else if (typeof val === 'object' && val !== null) {
        changed = this.hasChanged(val, prevVal || empty);
        if (changed) break;
      } else {
        changed = true;
        break;
      }
    }
    if (isRoot) {
      this.changed = changed;
    }
    return changed;
  }

  getChanges(fields = this.fields, previousFields = this.previousFields) {
    if (this.changes !== null) {
      return this.changes;
    }

    const isRoot = fields === this.fields;
    const prev = previousFields || empty;
    const changes = {};

    for (const key in fields) {
      const val = fields[key];
      const prevVal = prev[key];

      if (val === prevVal) continue;

      if (Array.isArray(val)) {
        if (!prevVal || val.length !== prevVal.length) {
          changes[key] = val;
        } else {
          let arrChanged = false;
          for (let i = 0; i < val.length; i++) {
            if (val[i] !== prevVal[i]) { arrChanged = true; break; }
          }
          if (arrChanged) changes[key] = val;
        }
      } else if (typeof val === 'object' && val !== null) {
        const subChanges = this.getChanges(val, prevVal || empty);
        if (hasOwnProperties(subChanges)) {
          changes[key] = subChanges;
        }
      } else {
        changes[key] = val;
      }
    }
    if (isRoot) {
      this.changes = changes;
    }
    return changes;
  }

  cleanup() {
    this.updated = false;
  }
}

module.exports = State;
