#! /usr/bin/env node

import { Command, Option } from "commander";
import { WebhookCommands } from "./commands/webhooks";

const program = new Command();
program
  .version("0.0.1")
  .description("Semgrep Azure DevOps CLI")
  .requiredOption(
    "-u, --ado-org-url <ado-org-url>",
    "Azure DevOps organization URL"
  )
  .requiredOption(
    "-p, --ado-project <ado-project>",
    "Azure DevOps project name"
  )
  .requiredOption(
    "-t, --ado-token <ado-token>",
    "Azure DevOps Personal Access Token"
  );

const webhooksCommand = program
  .command("webhooks")
  .description("Commands for creating and deleting webhooks in Azure DevOps.");

webhooksCommand
  .command("list")
  .description("List all webhooks in the project")
  .action(async (_, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const webhookCommand = new WebhookCommands(
      globalOpts.adoOrgUrl,
      globalOpts.adoToken
    );
    try {
      const subscriptions = await webhookCommand.listWebhooks(
        globalOpts.adoProject
      );
      console.log(JSON.stringify(subscriptions));
    } catch (error) {
      cmd.error("fatal. an error occurred while listing webhooks.");
    }
  });

webhooksCommand
  .command("create")
  .description("Create a new webhook in an Azure DevOps project.")
  .requiredOption(
    "--webhook-url <webhook-url>",
    "URL for the webhook to post events to."
  )
  .option(
    "--function-app-token <token>",
    "Function App token for authentication."
  )
  .addOption(
    new Option(
      "--event-type <event-type>",
      "Event type for the webhook"
    ).choices(["git.pullrequest.created", "git.pullrequest.updated"])
  )
  .action(async (_, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const webhookCommand = new WebhookCommands(
      globalOpts.adoOrgUrl,
      globalOpts.adoToken
    );
    try {
      await webhookCommand.createWebhook(
        globalOpts.adoProject,
        globalOpts.eventType,
        globalOpts.webhookUrl,
        globalOpts.functionAppToken
      );
    } catch (error) {
      cmd.error("fatal. an error occurred while creating a webhook.");
    }
  });

webhooksCommand
  .command("delete")
  .description("Delete a webhook in an Azure DevOps project.")
  .requiredOption(
    "--subscription-id <ids>",
    "The ID of the subscription to delete. Can be a comma-separated list of IDs enclosed in quotes.",
    (value, _) => {
      const ids = [];
      value.split(",").forEach((id) => {
        const trimmedId = id?.trim();
        if (trimmedId?.length > 0) ids.push(trimmedId);
      });
      return ids;
    }
  )
  .action(async (_, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const webhookCommand = new WebhookCommands(
      globalOpts.adoOrgUrl,
      globalOpts.adoToken
    );
    try {
      await webhookCommand.deleteWebhook(globalOpts.subscriptionId);
    } catch (error) {
      cmd.error("fatal. an error occurred while delete the webhook.");
    }
  });

program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
