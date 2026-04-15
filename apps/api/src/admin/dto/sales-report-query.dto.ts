import { IsDateString } from "class-validator";

export class SalesReportQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
