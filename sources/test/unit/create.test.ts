import { expect } from "@loopback/testlab";
import { juggler } from "@loopback/repository";

import { User } from "./test.model";
import { UserRepository } from "./test.repository";

describe("Create Model", async () => {
    let userRepository: UserRepository;
    before(async () => {
        const dataSource = new juggler.DataSource({
            name: "db",
            connector: "memory",
        });

        userRepository = new UserRepository(User, dataSource);
    });

    it("createAll() Test", async () => {
        await userRepository.deleteAll();

        /**
         * Test create multiple users with relations
         */
        expect(
            await userRepository.createAll([
                {
                    username: "user1",
                    password: "123",
                },
                {
                    username: "user2",
                    password: "123",
                    parent: {
                        username: "user2Parent",
                        password: "321",
                    },
                },
                {
                    username: "user3",
                    password: "123",
                    children: [
                        {
                            username: "user3Child",
                            password: "111",
                        },
                    ],
                },
            ])
        ).containDeep([
            {
                username: "user1",
                password: "123",
            },
            {
                username: "user2",
                password: "123",
                parent: {
                    username: "user2Parent",
                    password: "321",
                },
            },
            {
                username: "user3",
                password: "123",
                children: [
                    {
                        username: "user3Child",
                        password: "111",
                    },
                ],
            },
        ]);
    });

    it("create() Test", async () => {
        await userRepository.deleteAll();

        /**
         * Test create one user with relations
         */
        expect(
            await userRepository.create({
                username: "user1",
                password: "123",
                parent: {
                    username: "parent1",
                    password: "321",
                },
                children: [
                    {
                        username: "child1",
                        password: "111",
                    },
                    {
                        username: "child2",
                        password: "222",
                    },
                    {
                        username: "child3",
                        password: "333",
                    },
                ],
            })
        ).containDeep({
            username: "user1",
            password: "123",
            parent: {
                username: "parent1",
                password: "321",
            },
            children: [
                {
                    username: "child1",
                    password: "111",
                },
                {
                    username: "child2",
                    password: "222",
                },
                {
                    username: "child3",
                    password: "333",
                },
            ],
        });
    });
});
