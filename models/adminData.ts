import { GSI, gsiPk, gsiSk, Table, pk } from "./tableDecorator";

@Table("AchievementData")
@GSI("progress_index")
export class AchievementData {
  @pk
  achievement_id: string;
  @gsiPk
  required_progress: string;
  @gsiSk
  required_amount: number;
}
