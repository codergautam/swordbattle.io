import { IsInt, IsNumber } from 'class-validator';

export class SaveGameDTO {
  @IsInt() account_id: number;
  
  @IsInt() kills: number;

  @IsInt() coins: number;

  @IsNumber() playtime: number;
}
