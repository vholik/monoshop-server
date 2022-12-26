import { Gender } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AddSubcategoryDto {
  @IsNotEmpty()
  @IsString()
  value: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: string;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;
}
