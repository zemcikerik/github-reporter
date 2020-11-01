import { readFile, writeFile } from "fs/promises";
import { EMPTY, NEVER, Observable, Subject } from "rxjs";
import { CHANNEL_ID, COMMAND_PREFIX, DISCORD_TOKEN, GITHUB_TOKEN, TOTAL_INTERVAL, USERNAMES } from "./constants";
import { Person } from "./models";

export enum ConfigurationParameter {
    PEOPLE,
    TARGET_CHANNEL_IDS,
    COMMAND_CHANNEL_ID
}

export interface Configuration {
    readonly onChange$: Observable<ConfigurationParameter>;

    readonly discordToken: string;
    readonly githubToken: string;

    readonly people: Person[];
    readonly delayBetweenRequests: number;

    readonly targetChannelIds: string[];
    readonly commandPrefix: string;
    readonly commandChannelId: string;
}

export interface ModifiableConfiguration extends Configuration {
    people: Person[];
    targetChannelIds: string[];
    commandChannelId: string;
}

export class ConstantConfiguration implements Configuration {

    private _people: Person[];

    constructor() {
        const startDate: Date = new Date();
        this._people = USERNAMES.map(name => ({ username: name, lastRefresh: startDate }));
    }

    public get onChange$(): Observable<ConfigurationParameter> {
        return NEVER;
    }

    public get discordToken(): string {
        return DISCORD_TOKEN;
    }

    public get githubToken(): string {
        return GITHUB_TOKEN;
    }

    public get people(): Person[] {
        return [...this.people];
    }

    public get delayBetweenRequests(): number {
        return TOTAL_INTERVAL / this.people.length;
    }

    public get targetChannelIds(): string[] {
        return [CHANNEL_ID];
    }

    public get commandPrefix(): string {
        return COMMAND_PREFIX;
    }

    public get commandChannelId(): string {
        return CHANNEL_ID;
    }

}

export class FileConfiguration implements ModifiableConfiguration {

    private subject: Subject<ConfigurationParameter>;
    private data: ConfigData | null;
    private _people: Person[];

    constructor(private path: string) {
        this.subject = new Subject();
        this.data = null;
        this._people = [];
    }

    public async load(): Promise<any> {
        const content: string = await readFile(this.path, 'utf8');
        this.data = <ConfigData> JSON.parse(content);

        const now: Date = new Date();

        this._people = this.data?.usernames
        .map(username => ({ username: username, lastRefresh: now })) ?? [];
    }

    public save(): Promise<any> {
        if (this.data !== null) {
            this.data.usernames = this._people.map(person => person.username);
        }

        const json: string = JSON.stringify(this.data, null, 2);
        return writeFile(this.path, json);
    }

    public get onChange$(): Observable<ConfigurationParameter> {
        return this.subject;
    }

    public throwIfDataNotLoaded(): void {
        if (this.data === null) {
            throw new Error('Data either not loaded or corrupted!');
        }
    }

    public get discordToken(): string {
        this.throwIfDataNotLoaded();
        return this.data?.discord_token ?? '';
    }

    public get githubToken(): string {
        this.throwIfDataNotLoaded();
        return this.data?.github_token ?? '';
    }

    public get people(): Person[] {
        return this._people;
    }

    public set people(people: Person[]) {
        this._people = people;
        this.subject.next(ConfigurationParameter.PEOPLE);
    }

    public get delayBetweenRequests(): number {
        this.throwIfDataNotLoaded();
        return this.data?.delay_between_requests ?? 0;
    }

    public get targetChannelIds(): string[] {
        this.throwIfDataNotLoaded();
        return this.data?.target_channel_ids ?? [];
    }

    public set targetChannelIds(ids: string[]) {
        if (this.data !== null) {
            this.data.target_channel_ids = ids;
            this.subject.next(ConfigurationParameter.TARGET_CHANNEL_IDS);
        }
    }

    public get commandPrefix(): string {
        this.throwIfDataNotLoaded();
        return this.data?.command_prefix ?? '';
    }

    public get commandChannelId(): string {
        this.throwIfDataNotLoaded();
        return this.data?.command_channel_id ?? '';
    }

    public set commandChannelId(id: string) {
        if (this.data !== null) {
            this.data.command_channel_id = id;
            this.subject.next(ConfigurationParameter.COMMAND_CHANNEL_ID);
        }
    }

}

interface ConfigData {
    discord_token: string,
    github_token: string,
    usernames: string[],
    delay_between_requests: number,
    target_channel_ids: string[],
    command_prefix: string,
    command_channel_id: string
}
