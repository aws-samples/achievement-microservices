import { SQSEvent, SQSHandler } from "aws-lambda";

interface OutMessage {
  player_id: string;
  achievement_id: string;
}

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for (const { body } of Records) {
    const { player_id, achievement_id }: OutMessage = JSON.parse(body);
    console.log(
      `Player ${player_id} achieved an achievement ${achievement_id}`
    );
  }
};
