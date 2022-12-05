import { Table, pk, sk } from "./tableDecorator";

@Table("PlayerData")
export class PlayerData {
  @pk
  playerId: string;
  @sk
  id: string;
}

export class PlayerAchievement extends PlayerData {
  playerId: string;
  id: string;
  achievedAt: number;
}

export class PlayerProgress extends PlayerData {
  playerId: string;
  id: string;
  progress: number;
  lastUpdated: number;
}
