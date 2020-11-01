import { ModifiableConfiguration } from "./configuration";
import { Discord } from "./discord";
import { GitHub } from "./github";
import { trimString } from "./helpers";
import { Command, Person } from "./models";

export interface CommandHandler {
    handleCommand(command: Command): Promise<any>;
}

export class TestCommandHandler implements CommandHandler {

    constructor(private discord: Discord,
        private github: GitHub,
        private config: ModifiableConfiguration)
    { }

    public handleCommand(command: Command): Promise<any> {
        switch (command.name) {
            case 'add':
                return this.handleAdd(command);

            case 'list':
                return this.handleList();

            case 'remove':
                return this.handleRemove(command);

            case '':
                return this.discord.sendMessageToCommandChannel('Did you forget the command?');

            default:
                const trimmedName: string = trimString(command.name, 20);
                return this.discord.sendMessageToCommandChannel(`Unknown command **${trimmedName}**!`);
        }
    }

    private async handleAdd(command: Command): Promise<any> {
        if (command.args.length > 1 || command.args.length === 0) {
            await this.discord.sendMessageToCommandChannel(`Expected 1 argument, got ${command.args.length}!`);
            return;
        }

        const username: string = command.args[0];

        if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username)) {
            await this.discord.sendMessageToCommandChannel(`*${username}* is not a valid GitHub username!`);
            return;
        }

        if (this.getPersonByUsername(username) !== null) {
            await this.discord.sendMessageToCommandChannel(`User *${username}* is already tracked!`);
            return;
        }

        const exists: boolean = await this.github.checkIfUserExists(username).toPromise();

        if (exists) {
            const people: Person[] = this.config.people;
            people.push({ username: username, lastRefresh: new Date() });

            people.sort((p1, p2) => p1.username.localeCompare(p2.username));
            this.config.people = people;

            await this.discord.sendMessageToCommandChannel(`User *${username}* was added to tracking!`)
        } else {
            await this.discord.sendMessageToCommandChannel(`User *${username}* was not found!`);
        }
    }

    private handleList(): Promise<any> {
        const usernames: string[] = this.config.people.map(person => person.username);
        const message: string = `**Currently tracked users:**\n>>> •  ${usernames.join('\n•  ')}`;
        return this.discord.sendMessageToCommandChannel(message);
    }

    private handleRemove(command: Command): Promise<any> {
        if (command.args.length > 1 || command.args.length === 0) {
            return this.discord.sendMessageToCommandChannel(`Expected 1 argument, got ${command.args.length}!`);
        }

        const username: string = command.args[0];
        const person: Person | null = this.getPersonByUsername(username);

        if (person === null) {
            return this.discord.sendMessageToCommandChannel(`User *${username}* is not currently tracked!`);
        }

        const people: Person[] = this.config.people;
        people.splice(people.indexOf(person), 1);
        this.config.people = people;

        return this.discord.sendMessageToCommandChannel(`User *${username}* was removed from tracking!`);
    }

    private getPersonByUsername(username: string): Person | null {
        for (const person of this.config.people) {
            if (person.username === username) {
                return person;
            }
        }
        return null;
    }

}
