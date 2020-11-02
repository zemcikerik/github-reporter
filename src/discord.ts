import { EMPTY, fromEvent, Observable, Subscription } from "rxjs";
import { filter, map } from "rxjs/operators";
import { Channel, Client, Message, MessageEmbed, TextChannel } from "discord.js";

import { Configuration, ConfigurationParameter } from './configuration';
import { Command } from "./models";

export class Discord {

    private readonly client: Client;

    private targetChannels: TextChannel[];
    private commandChannel: TextChannel | null;

    private _onCommand$: Observable<Command>;
    private configChangeSubscription: Subscription | undefined;

    constructor (private readonly config: Configuration) {
        this.client = new Client();

        this.targetChannels = [];
        this.commandChannel = null;

        this._onCommand$ = EMPTY;
    }

    public async init(): Promise<any> {
        const readyPromise: Promise<void> = new Promise((resolve, _) => {
            this.client.once('ready', () => resolve())
        });

        await this.client.login(this.config.discordToken);
        await readyPromise;

        this.reloadTargetChannels();
        this.reloadCommandChannel();

        const message$: Observable<Message> = fromEvent(this.client, 'message');
        
        this._onCommand$ = <Observable<Command>> message$.pipe(
            filter(message => message.guild !== null),
            filter(message => message.member?.hasPermission('ADMINISTRATOR') ?? false),
            filter(message => message.channel.id === this.config.commandChannelId),
            filter(message => message.content.startsWith(this.config.commandPrefix)),
            map(message => this.messageToCommand(message)),
            filter(command => command !== null)
        );

        this.configChangeSubscription = this.config.onChange$
        .subscribe(change => this.onConfigChange(change));
    }

    public sendEmbed(embed: MessageEmbed): Promise<any> {
        return Promise.all(this.targetChannels.map(channel => channel.send(embed)));
    }

    public async sendMessageToCommandChannel(message: string): Promise<void> {
        await this.commandChannel?.send(message);
    }

    public get onCommand$(): Observable<Command> {
        return this._onCommand$;
    }

    private messageToCommand(message: Message): Command | null {
        const commandPrefixLength: number = this.config.commandPrefix.length;
        const rawCommand: string = message.content.slice(commandPrefixLength);
        const args: string[] = rawCommand.split(/\s+/);

        if (args.length === 0) {
            return null;
        }

        const name: string = <string> args.shift();
        return { name: name, args: args };
    }

    private onConfigChange(parameter: ConfigurationParameter): void {
        switch (parameter) {
            case ConfigurationParameter.TARGET_CHANNEL_IDS:
                this.reloadTargetChannels();
                break;

            case ConfigurationParameter.COMMAND_CHANNEL_ID:
                this.reloadCommandChannel();
                break;
        }
    }

    private reloadTargetChannels(): void {
        this.targetChannels = <TextChannel[]> this.config.targetChannelIds
        .map(id => this.getTextChannel(id))
        .filter(channel => channel !== null);
    }

    private reloadCommandChannel(): void {
        const id: string = this.config.commandChannelId;
        this.commandChannel = this.getTextChannel(id);
    }

    private getTextChannel(id: string): TextChannel | null {
        const channel: Channel | undefined = this.client.channels.cache
        .find(channel => channel.id === id);

        if (channel === undefined) {
            console.warn(`Channel '${id}' was not found!`);
        } else if (channel.type !== 'text') {
            console.warn(`Channel type '${channel.type}' of channel '${id}' is not valid!`);
        } else {
            return <TextChannel> channel;
        }

        return null;
    }

    public destroy(): void {
        this.configChangeSubscription?.unsubscribe();
        this.client.destroy();
    }

}
