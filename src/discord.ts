import { Channel, Client, MessageEmbed, TextChannel } from "discord.js";
import { Subscription } from "rxjs";
import { Configuration, ConfigurationParameter } from './configuration';

export class Discord {

    private readonly client: Client;
    private targetChannels: TextChannel[];
    private configChangeSubscription: Subscription | undefined;

    constructor (private readonly config: Configuration) {
        this.client = new Client();
        this.targetChannels = [];
    }

    public async init(): Promise<any> {
        const token: string = this.config.getDiscordToken();
        await this.client.login(token);

        this.reloadTargetChannels();

        this.configChangeSubscription = this.config.onChange$
            .subscribe(change => this.onConfigChange(change));
    }

    public sendEmbed(embed: MessageEmbed): Promise<any> {
        return Promise.all(this.targetChannels.map(channel => channel.send(embed)));
    }

    private onConfigChange(parameter: ConfigurationParameter): void {
        switch (parameter) {
            case ConfigurationParameter.TARGET_CHANNEL_IDS:
                this.reloadTargetChannels();
                break;
        }
    }

    private reloadTargetChannels(): void {
        this.targetChannels = <TextChannel[]> this.config.getTargetChannelIds().map(id => {
            const oldChannel: TextChannel | undefined = 
                this.targetChannels.find(channel => channel.id === id);

            if (oldChannel !== undefined) {
                return oldChannel;
            }

            const channel: Channel | undefined = this.client.channels.cache
                .find(channel => channel.id === id);

            if (channel === undefined) {
                console.error(`Channel '${id}' was not found!`);
                return undefined;
            } else if (channel.type !== 'text') {
                console.error(`Channel type '${channel.type}' of channel '${id}' is not valid!`);
                return undefined;
            } else {
                return <TextChannel> channel;
            }
        }).filter(channel => channel !== undefined);
    }

    public destroy(): void {
        this.configChangeSubscription?.unsubscribe();
        this.client.destroy();
    }

}
