import {pk, Table} from "./tableDecorator";

@Table("ProgressMessage")
export class ProgressMessage {
    @pk
    message_id: string;
    ttl: number;
}

