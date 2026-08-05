import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { SaveAnnouncementDTO } from './announcements.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcements: Repository<Announcement>,
  ) {}

  private listView(a: Announcement) {
    return {
      id: a.id,
      title: a.title,
      icon: a.icon,
      color: a.color,
      isUpdate: !!a.is_update,
      createdAt: a.created_at,
    };
  }

  private fullView(a: Announcement) {
    return { ...this.listView(a), body: a.body };
  }

  private adminView(a: Announcement) {
    return { ...this.fullView(a), published: !!a.published, updatedAt: a.updated_at };
  }

  async list() {
    const rows = await this.announcements.find({ where: { published: true }, order: { created_at: 'DESC' } });
    const update = rows.find((a) => a.is_update);
    return { announcements: rows.map((a) => this.listView(a)), updateId: update ? update.id : null, now: new Date() };
  }

  async get(id: number) {
    const a = await this.announcements.findOne({ where: { id, published: true } });
    if (!a) throw new NotFoundException('Announcement not found');
    return { announcement: this.fullView(a) };
  }

  async adminList() {
    const rows = await this.announcements.find({ order: { created_at: 'DESC' } });
    return { announcements: rows.map((a) => this.adminView(a)) };
  }

  async save(dto: SaveAnnouncementDTO) {
    let a: Announcement;
    if (dto.id) {
      const found = await this.announcements.findOne({ where: { id: dto.id } });
      if (!found) throw new NotFoundException('Announcement not found');
      a = found;
    } else {
      a = this.announcements.create();
    }

    a.title = dto.title.trim().slice(0, 140);
    a.body = String(dto.body || '').replace(/\r\n/g, '\n');
    a.icon = dto.icon;
    a.color = dto.color.toLowerCase();
    if (typeof dto.published === 'boolean') a.published = dto.published;

    const saved = await this.announcements.save(a);
    return { ok: true, announcement: this.adminView(saved) };
  }

  async delete(id: number) {
    const a = await this.announcements.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Announcement not found');
    await this.announcements.remove(a);
    return { ok: true };
  }

  async setUpdate(id?: number) {
    if (id != null) {
      const a = await this.announcements.findOne({ where: { id } });
      if (!a) throw new NotFoundException('Announcement not found');
      await this.announcements.update({ is_update: true }, { is_update: false });
      a.is_update = true;
      await this.announcements.save(a);
    } else {
      await this.announcements.update({ is_update: true }, { is_update: false });
    }
    return this.adminList();
  }
}
