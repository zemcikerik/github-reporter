import { Configuration } from "./configuration";
import { Discord } from "./discord";
import { Command } from "./models";

export interface CommandHandler {
    handleCommand(command: Command): Promise<any>;
}

export class TestCommandHandler implements CommandHandler {

    constructor(private discord: Discord,
        private config: Configuration)
    { }

    public handleCommand(command: Command): Promise<any> {
        if (command.name === 'list') {
            const usernames: string[] = this.config.people.map(person => person.username);
            return this.discord.sendMessageToCommandChannel(JSON.stringify(usernames));
        } else {
            return this.discord.sendMessageToCommandChannel('Unknown command!');
        }
    }

}
