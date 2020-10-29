import { from, Observable } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';

import { request } from '@octokit/request';
import { OctokitResponse } from '@octokit/types';

import { Configuration } from "./configuration";
import { Person } from './models';

export class GitHub {

    constructor(private readonly config: Configuration)
    { }

    public getNewestEvents(person: Person): Observable<any> {
        const lastRefresh: Date = person.lastRefresh;
        person.lastRefresh = new Date();
    
        const promise: Promise<OctokitResponse<any>> = request('GET /users/:username/events', {
            headers: {
                authorization: 'token ' + this.config.getGithubToken()
            },
            username: person.username
        });
    
        return from(promise).pipe(
            mergeMap(response => response.data.reverse()),
            filter((event: any) => new Date(event.created_at) > lastRefresh)
        );
    }

}