class EntityState {
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

    let changed = false;
    for (const key in fields) {
      if (typeof fields[key] === 'object') {
        // If previous fields is undefined, set it to object
        // to prevent previousFields === this.previousFields.
        changed = this.hasChanged(fields[key], previousFields[key] || {});
      } else if (fields[key] !== previousFields[key]) {
        changed = true;
      }

      if (changed) {
        break;
      }
    }
    if (fields === this.fields) {
      this.changed = changed;
    }
    return changed;
  }

  getChanges(fields = this.fields, previousFields = this.previousFields) {
    if (this.changes !== null) {
      return this.changes;
    }

    const changes = {};
    for (const key in fields) {
      if (typeof fields[key] === 'object') {
        const subChanges = this.getChanges(fields[key], previousFields[key] || {});
        if (Object.keys(subChanges).length) {
          changes[key] = subChanges;
        }
      } else if (fields[key] !== previousFields[key]) {
        changes[key] = fields[key];
      }
    }
    if (fields === this.fields) {
      this.changes = changes;
    }
    return changes;
  }

  cleanup() {
    this.updated = false;
  }
}

module.exports = EntityState;
