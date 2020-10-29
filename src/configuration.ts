import { EMPTY, Observable } from "rxjs";
import { CHANNEL_ID, DISCORD_TOKEN, GITHUB_TOKEN } from "./constants";

export enum ConfigurationParameter {
    DISCORD_TOKEN,
    TARGET_CHANNEL_IDS
}

export interface Configuration {
    onChange$: Observable<ConfigurationParameter>;

    getDiscordToken(): string;
    getGithubToken(): string;
    getTargetChannelIds(): string[];
}

export class ConstantConfiguration implements Configuration {

    public onChange$: Observable<ConfigurationParameter>;

    constructor() {
        this.onChange$ = EMPTY;
    }

    public getDiscordToken(): string {
        return DISCORD_TOKEN;
    }

    public getGithubToken(): string {
        return GITHUB_TOKEN;
    }

    public getTargetChannelIds(): string[] {
        return [CHANNEL_ID];
    }

}