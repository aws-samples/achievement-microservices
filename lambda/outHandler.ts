import { SQSEvent, SQSHandler } from "aws-lambda";

interface OutMessage {
  playerId: string;
  achievementId: string;
}

export const handler: SQSHandler = async ({
  Records,
}: SQSEvent): Promise<void> => {
  for (const { body } of Records) {
    const { playerId, achievementId }: OutMessage = JSON.parse(body);
    console.log(
      `Player ${playerId} achieved an achievement ${achievementId}`
    );
  }
};
