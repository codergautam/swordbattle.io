class Account {
  constructor(data) {
    this.id = null;
    this.username = '';
    // Other account properties are loaded from API
    this.update(data);
  }

  update(data) {
    Object.assign(this, data);
    if(this.skins && typeof this.skins === 'string') {
      try {
      this.skins = JSON.parse(this.skins);
      } catch(e) {
        console.error('Error parsing skins', e);
      }
    }
    if (this.clan && typeof this.clan === 'object') {
      this.clan = this.clan.clan?.tag || '';
    } else if (typeof this.clan !== 'string') {
      this.clan = '';
    }
  }
}

module.exports = Account;
