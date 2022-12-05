import { GSI, gsiPk, gsiSk, Table, pk } from "./tableDecorator";

@Table("AchievementData")
@GSI("progressIndex")
export class AchievementData {
  @pk
  achievementId: string;
  @gsiPk
  requiredProgress: string;
  @gsiSk
  requiredAmount: number;
}
