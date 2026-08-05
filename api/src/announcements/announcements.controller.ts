import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnnouncementsService } from './announcements.service';
import { ModerationGuard } from '../auth/guards/moderation.guard';
import { SaveAnnouncementDTO, AnnouncementIdDTO, SetUpdateAnnouncementDTO } from './announcements.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get('list')
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 120, ttl: 60000 } })
  list() {
    return this.announcements.list();
  }

  @Get('get')
  @Throttle({ short: { limit: 10, ttl: 1000 }, medium: { limit: 120, ttl: 60000 } })
  get(@Query('id') id: string) {
    return this.announcements.get(parseInt(id, 10) || 0);
  }

  @Get('admin/list')
  @UseGuards(ModerationGuard)
  adminList() {
    return this.announcements.adminList();
  }

  @Post('admin/save')
  @UseGuards(ModerationGuard)
  save(@Body() dto: SaveAnnouncementDTO) {
    return this.announcements.save(dto);
  }

  @Post('admin/delete')
  @UseGuards(ModerationGuard)
  delete(@Body() dto: AnnouncementIdDTO) {
    return this.announcements.delete(dto.id);
  }

  @Post('admin/set-update')
  @UseGuards(ModerationGuard)
  setUpdate(@Body() dto: SetUpdateAnnouncementDTO) {
    return this.announcements.setUpdate(dto.id);
  }
}
