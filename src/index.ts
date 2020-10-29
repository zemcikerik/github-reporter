import { from, interval, zip } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';

import { Person } from './models';
import { ALL_CHAINING_CONVERTER_CONSTRUCTORS, EventToEmbedsConverter } from './embeds';
import { INDIVIDUAL_INTERVAL, TOTAL_INTERVAL, USERNAMES } from './constants';
import { Discord } from './discord';
import { Configuration, ConstantConfiguration } from './configuration';
import { GitHub } from './github';
import { createAndJoinChainingConverters } from './helpers';
import { MessageEmbed } from 'discord.js';


const config: Configuration = new ConstantConfiguration();
const discord: Discord = new Discord(config);
const github: GitHub = new GitHub(config);
const converter: EventToEmbedsConverter = createAndJoinChainingConverters(ALL_CHAINING_CONVERTER_CONSTRUCTORS);

const startDate: Date = new Date();
const people: Person[] = USERNAMES.map(name => ({ username: name, lastRefresh: startDate }));

discord.init()
.then(() => {
    interval(TOTAL_INTERVAL).pipe(
        mergeMap(_ => 
            zip(
                from(people),
                interval(INDIVIDUAL_INTERVAL)
            ).pipe(
                map(([person, _]) => person)
            )
        ),
        mergeMap(person => github.getNewestEvents(person)),
        map(event => converter.convertToEmbed(event)),
        filter(embeds => embeds !== null),
        mergeMap(embeds => from(<MessageEmbed[]> embeds))
    )
    .subscribe(async embed => await discord.sendEmbed(embed));
})
.catch(err => console.error(err));

// TODO: use this
function logUnknownEvent(event: any) {
    const actorName: string = event.actor.login;
    const eventType: string = event.type;
    const repoName: string = event.repo.name;
    const message: string = `Unknown event '${eventType}' in repository ${repoName} by ${actorName}`;
    console.warn(message);
}