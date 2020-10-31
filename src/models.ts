export interface Person {
    username: string;
    lastRefresh: Date;
}

export interface Command {
    name: string;
    args: string[];
}
