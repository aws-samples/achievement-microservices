import * as cdk from "aws-cdk-lib";
import { AchievementMicroservices } from "../lib/achievementMicroservices";
import { Template } from "aws-cdk-lib/assertions";

test("resource count test", () => {
  const app = new cdk.App();
  const stack = new AchievementMicroservices(app, "TestStack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Lambda::Function", 3);
  template.resourceCountIs("AWS::DynamoDB::Table", 3);
  template.resourceCountIs("AWS::SQS::Queue", 2);
  template.resourceCountIs("AWS::ApiGateway::Account", 1);
});
