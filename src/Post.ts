import {Column, Entity, Generated, PrimaryColumn} from "typeorm";

@Entity("post")
export class Post {

    @PrimaryColumn("integer")
    @Generated()
    id: number;

    @Column()
    title: string;

    @Column()
    text: string;

    @Column({ nullable: false })
    likesCount: number;

}