import {ConnectionOptions, createConnection, FindConditions} from "typeorm";
import {Post} from "./Post";

const options: ConnectionOptions = {
    name: 'test',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'test',
    username: 'postgres',
    synchronize: true,
    entities: [Post],
};

async function main(){

    const connection = await createConnection(options);
    const repo = connection.getRepository(Post);

    // let's insert some data
    for(let i = 0; i<10; i++){
        const p = new Post();
        p.id = i ;
        p.title = `post ${i}`;
        p.text = `post ${i}`;
        p.likesCount = i%2 == 1? 10: 20;
        await repo.save(p);
        console.log("Saved post", p);
    }

    // let's try to make AND request to fetch some data:
    //  try to get post with id = 1 AND 10 likes. It must be one row
    let filtered = await repo.find({
        where: [
            {id: 1},
            {likesCount: 10},
        ]
    });
    console.log(`Got ${filtered.length} items, need one!`);
    // Got 5 items, need one!
    // Where uses OR for arrays by default. It is VERY strange solution, most ORMs
    //  I know use arrays as AND operator: mongodb connector for example,
    //  Django ORM, SQLAlchemy.

    // Let's try to use querybuilder as typeorm docs ask us
    // haker tries to get access to our database through SQL injection. Does typeorm protect us?
    const column_from_client = "1 = 1 OR id = :id UNION select * from post --";
    let qb = repo.createQueryBuilder()
        .andWhere(column_from_client, {id: 1});

    // Look at sql
    console.log(qb.getQueryAndParameters());
    // SELECT "Post"."id" AS "Post_id", "Post"."title" AS "Post_title", "Post"."text" AS "Post_text", "Post"."likesCount" AS "Post_likesCount" FROM "post" "Post" WHERE 1 = 1 OR id = $1 UNION select * from post --'
    // Oh, sql is injected!

    filtered = await qb.getMany();
    console.log(`Got ${filtered.length} items, need one!`);
    // and executed: Got 14 items, need one!


    // You think you can pass column as parameter? Mate, no way!
    qb = repo.createQueryBuilder()
        .andWhere(":column = :id", {column: "id", id: 1});
    filtered = await qb.getMany();
    console.log(qb.getQueryAndParameters());
    // [ 'SELECT "Post"."id" AS "Post_id", "Post"."title" AS "Post_title", "Post"."text" AS "Post_text", "Post"."likesCount" AS "Post_likesCount" FROM "post" "Post" WHERE $1 = $2',
    //   [ 'id', 1 ] ]
    console.log(`Got ${filtered.length}`);
    // No data, fails silently: Got 0


    // Ok, we know about this security issue. Let's make more interesting query:
    //  id <= 5 AND id >= 4 (very common pattern when filter by date for example).
    qb = repo.createQueryBuilder()
        .andWhere("id >= :id", {id: 4})
        .andWhere("id <= :id", {id: 5});

    // See sql
    console.log(qb.getQueryAndParameters());
    // Looks pretty good. Oh no! Params are [ 5, 5 ] but we need [4, 5]!
    // It may case REALLY headacke bugs.

    // Let's execute
    filtered = await qb.getMany();
    console.log(`Got ${filtered.length}, need 2!`);
    // Got 1, need 2!

}

main();
