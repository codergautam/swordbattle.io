class Account {
  constructor(data) {
    this.id = null;
    this.username = '';
    // Other account properties are loaded from API
    this.update(data);
  }

  update(data) {
    Object.assign(this, data);
    if(this.skins) {
      this.skins = JSON.parse(this.skins);
    }
  }
}

module.exports = Account;
