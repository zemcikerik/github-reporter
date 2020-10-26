import { request } from '@octokit/request';
import { OctokitResponse } from '@octokit/types';
import { Channel, Client as DiscordClient, TextChannel } from 'discord.js';

import { from, interval, Observable, zip } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

import { Person } from './models';
import { sendEmbeds } from './embeds';
import { USERNAMES, GITHUB_TOKEN, DISCORD_TOKEN, CHANNEL_ID, TOTAL_INTERVAL, INDIVIDUAL_INTERVAL } from './constants';


const discord: DiscordClient = new DiscordClient();
let channel: TextChannel;

const startDate: Date = new Date();
const people: Person[] = USERNAMES.map(name => ({ username: name, lastRefresh: startDate }));

interval(TOTAL_INTERVAL).pipe(
    mergeMap(_ => 
        zip(
            from(people),
            interval(INDIVIDUAL_INTERVAL)
        ).pipe(
            map(([person, _]) => person)
        )
    ),
    mergeMap(person => getNewestEvents(person))
)
.subscribe(async (event: any) => await sendEmbeds(event, channel));

discord.on("ready", () => {
    const foundChannel: Channel | undefined = discord.channels.cache
        .find(channel => channel.id === CHANNEL_ID);

    if (foundChannel === undefined || foundChannel.type !== "text") {
        return;
    }

    channel = <TextChannel> foundChannel;
});

discord.login(DISCORD_TOKEN);

function getNewestEvents(person: Person): Observable<any> {
    const lastRefresh: Date = person.lastRefresh;
    person.lastRefresh = new Date();

    const promise: Promise<OctokitResponse<any>> = request('GET /users/:username/events', {
        headers: {
            authorization: 'token ' + GITHUB_TOKEN
        },
        username: person.username
    });

    return from(promise).pipe(
        mergeMap(response => response.data.reverse()),
        filter((event: any) => new Date(event.created_at) > lastRefresh)
    );
}