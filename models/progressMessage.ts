import {pk, Table} from "./tableDecorator";

@Table("ProgressMessage")
export class ProgressMessage {
    @pk
    messageId: string;
    ttl: number;
}

