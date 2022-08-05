#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { AchievementMicroservices } from "../lib/achievementMicroservices";

const app = new cdk.App();
new AchievementMicroservices(app, "AchievementMicroServices", {});
