import { Table, pk, sk } from "./tableDecorator";

@Table("PlayerData")
export class PlayerData {
  @pk
  player_id: string;
  @sk
  id: string;
}

export class PlayerAchievement extends PlayerData {
  player_id: string;
  id: string;
  achieved_at: number;
}

export class PlayerProgress extends PlayerData {
  player_id: string;
  id: string;
  progress: number;
  last_updated: number;
}
