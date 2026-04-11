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
    // The API sends `clan` as a structured object { clan: {tag,...}, role, contributedXp }
    // or null. The client-facing protobuf still expects a plain string tag, so flatten it
    // here to keep the in-game nametag working without touching the protocol.
    if (this.clan && typeof this.clan === 'object') {
      this.clan = this.clan.clan?.tag || '';
    } else if (typeof this.clan !== 'string') {
      this.clan = '';
    }
  }
}

module.exports = Account;
